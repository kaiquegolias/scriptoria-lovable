import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const truncate = (text: string, maxLen: number) =>
  text && text.length > maxLen ? text.slice(0, maxLen) + "…" : (text || "");

const STOP = new Set([
  "o","a","os","as","um","uma","de","do","da","dos","das","em","no","na","nos","nas",
  "por","para","com","sem","sobre","entre","que","qual","quais","como","onde","quando",
  "quem","se","ou","e","mas","pois","porque","não","sim","mais","menos","muito","pouco",
  "bem","mal","já","ainda","também","só","apenas","esse","essa","este","esta","isso",
  "eu","você","ele","ela","nós","eles","meu","minha","seu","sua","ser","estar","ter",
  "haver","fazer","poder","dever","ir","vir","foi","era","tem","pode","deve","vai",
  "me","te","lhe","ao","à","pelo","pela","olá","oi","bom","boa","dia","tarde","noite",
  "obrigado","obrigada","preciso","quero","gostaria","favor","ajuda","saber",
  "cortana","hey","hei","tudo","nada","algo","coisa","faz","dá","vem","aqui","ali",
]);

// Product/system dictionary — used for entity detection and boosting
const PRODUCTS: Record<string, string[]> = {
  "sei": ["sei", "processo eletrônico", "processo eletronico"],
  "tramita": ["tramita", "tramitagov", "tramita.gov", "tramitação"],
  "protocolo integrado": ["protocolo integrado", "protocolointegrado"],
  "protocolo.gov": ["protocolo.gov", "protocologov", "protocolo gov"],
  "nup": ["nup", "número único", "numero unico"],
  "barramento pen": ["barramento", "barramento pen"],
  "assinatura eletrônica": ["assinatura eletrônica", "assinatura eletronica", "gov.br assina"],
  "gestão documental": ["gestão documental", "gestao documental", "gd"],
  "módulo de estatística": ["estatística", "estatistica", "módulo de estatística"],
  "pncp": ["pncp", "contratações públicas"],
  "pen": ["pen ", "processo eletrônico nacional"],
};

function normalize(text: string): string {
  return (text || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(w => w.length > 2 && !STOP.has(w));
}

function extractKeywords(text: string): string[] {
  const tokens = tokenize(text);
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  return Array.from(new Set([...tokens, ...bigrams])).slice(0, 20);
}

function detectProducts(text: string): string[] {
  const norm = normalize(text);
  const hits: string[] = [];
  for (const [key, aliases] of Object.entries(PRODUCTS)) {
    if (aliases.some(a => norm.includes(normalize(a)))) hits.push(key);
  }
  return hits;
}

function isBinaryContent(content: string): boolean {
  const indicators = ["/FlateDecode", "/XObject", "endobj", "endstream", "/DeviceRGB"];
  return indicators.filter(i => content.includes(i)).length >= 3;
}

async function fetchSheetCSV(url: string): Promise<string | null> {
  try {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    const resp = await fetch(csvUrl, { redirect: "follow" });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

// TF-style weighted scoring with phrase / bigram boost and product boost
function relevanceScore(text: string, keywords: string[], products: string[]): number {
  if (!text) return 0;
  const norm = normalize(text);
  let score = 0;
  for (const kw of keywords) {
    if (!kw) continue;
    if (kw.includes(" ")) {
      // bigram — heavier
      if (norm.includes(kw)) score += 5;
    } else {
      // count occurrences (capped)
      const matches = norm.split(kw).length - 1;
      if (matches > 0) score += Math.min(matches, 4);
    }
  }
  for (const p of products) {
    if (norm.includes(normalize(p))) score += 8;
  }
  return score;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId }: { messages: ChatMessage[]; userId: string } = await req.json();

    if (!messages || !userId) {
      return new Response(
        JSON.stringify({ error: "messages and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ─── Query analysis: consider last user msg + last assistant turn for context continuity ───
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const prevUser = [...messages].reverse().filter(m => m.role === "user")[1]?.content || "";
    const queryText = `${prevUser} ${lastUser}`.trim();

    const keywords = extractKeywords(queryText);
    const products = detectProducts(queryText);
    const ticketNums = Array.from(queryText.matchAll(/\d{6,}/g)).map(m => m[0]);

    // ─── Parallel fetch ───
    const [
      { data: scripts },
      { data: closedTickets },
      { data: kbDocs },
      { data: scriptsLib },
    ] = await Promise.all([
      supabase.from("scripts")
        .select("nome, situacao, modelo, estruturante, nivel, produto")
        .eq("user_id", userId),
      supabase.from("chamados")
        .select("id, titulo, acompanhamento, classificacao, pen_produto, pen_modulo, status, data_atualizacao")
        .eq("user_id", userId)
        .in("status", ["resolvido", "aguardando devolutiva", "em andamento"])
        .order("data_atualizacao", { ascending: false })
        .limit(80),
      supabase.from("kb_documents").select("title, content, category, source"),
      supabase.from("scripts_library")
        .select("title, description, content, sistema, tags")
        .limit(200),
    ]);

    // ─── Rank scripts (modelos de resposta) — top priority ───
    const rankedScripts = (scripts || [])
      .map(s => ({
        ...s,
        score: relevanceScore(`${s.nome} ${s.situacao} ${s.modelo} ${s.produto || ""}`, keywords, products),
      }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const modelosCtx = rankedScripts
      .map((s, i) => `[MODELO ${i + 1}] "${s.nome}" · ${s.produto || s.estruturante}/${s.nivel}
Situação: ${truncate(s.situacao, 350)}
Resposta sugerida: ${truncate(s.modelo, 500)}`)
      .join("\n---\n");

    // ─── Rank tickets ───
    const rankedTickets = (closedTickets || [])
      .map(t => {
        const base = relevanceScore(
          `${t.titulo} ${t.acompanhamento} ${t.classificacao || ""} ${t.pen_produto || ""} ${t.pen_modulo || ""}`,
          keywords, products
        );
        const ticketBoost = ticketNums.some(n => (t.titulo || "").includes(n)) ? 200 : 0;
        return { ...t, score: base + ticketBoost };
      })
      .filter(t => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const ticketsCtx = rankedTickets
      .map((t, i) => `[CHAMADO ${i + 1}] ${t.titulo} · status=${t.status} · ${t.pen_produto || "s/produto"}${t.pen_modulo ? "/" + t.pen_modulo : ""}
Classificação: ${t.classificacao || "n/d"}
Acompanhamento: ${truncate(t.acompanhamento, 400)}`)
      .join("\n---\n");

    // ─── Scripts library (procedimentos técnicos) ───
    const rankedLib = (scriptsLib || [])
      .map(s => ({
        ...s,
        score: relevanceScore(
          `${s.title} ${s.description || ""} ${s.content || ""} ${s.sistema || ""} ${(s.tags || []).join(" ")}`,
          keywords, products
        ),
      }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const libCtx = rankedLib
      .map((s, i) => `[PROCEDIMENTO ${i + 1}] ${s.title} · ${s.sistema || "geral"}
${truncate(s.description || "", 200)}
${truncate(s.content || "", 500)}`)
      .join("\n---\n");

    // ─── KB documents — filter junk, prefer relevant chunks ───
    const kbParts: string[] = [];
    const rankedDocs = (kbDocs || [])
      .filter(d => d.content && !isBinaryContent(d.content))
      .map(d => ({ ...d, score: relevanceScore(`${d.title} ${d.content}`, keywords, products) }))
      .sort((a, b) => b.score - a.score);

    for (const doc of rankedDocs.slice(0, 8)) {
      const sheetUrl = (doc.content || "").match(/https:\/\/docs\.google\.com\/spreadsheets\/[^\s)]+/)?.[0]
        || ((doc.source || "").includes("docs.google.com/spreadsheets") ? doc.source : null);

      if (sheetUrl) {
        const csv = await fetchSheetCSV(sheetUrl);
        if (csv) {
          if (ticketNums.length) {
            const lines = csv.split("\n");
            const header = lines[0] || "";
            const matches = lines.filter(l => ticketNums.some(n => l.includes(n)));
            if (matches.length) {
              kbParts.push(`[PLANILHA] ${doc.title}\nCabeçalho: ${header}\n${matches.slice(0, 20).join("\n")}`);
              continue;
            }
          }
          kbParts.push(`[PLANILHA] ${doc.title}\n${truncate(csv, 2500)}`);
        }
        continue;
      }

      if (doc.score > 0) {
        // Extract the most relevant window from the document
        const norm = normalize(doc.content);
        const firstKw = keywords.find(k => norm.includes(k));
        let excerpt = doc.content;
        if (firstKw) {
          const idx = norm.indexOf(firstKw);
          const start = Math.max(0, idx - 300);
          excerpt = doc.content.slice(start, start + 1400);
        }
        kbParts.push(`[DOC] ${doc.title} (${doc.category || "geral"})\n${truncate(excerpt, 1400)}`);
      }
    }
    const kbCtx = kbParts.join("\n===\n");

    // ─── Confidence signal for the model ───
    const totalHits = rankedScripts.length + rankedTickets.length + rankedLib.length + kbParts.length;
    const confidenceHint = totalHits === 0
      ? "SEM_FONTES"
      : totalHits < 3
        ? "POUCAS_FONTES"
        : "FONTES_SUFICIENTES";

    // ─── System prompt: structured reasoning + strict citation ───
    const systemPrompt = `Você é a CORTANA, analista sênior especialista no PEN (Processo Eletrônico Nacional), PNCP, SEI, Tramita GOV.BR, NUP, Protocolo Integrado, Protocolo.GOV, Barramento PEN, Assinatura Eletrônica gov.br, Módulo de Estatística e Gestão Documental. Trabalha lado a lado com o Kaique (analista N2) na resolução de chamados.

## PERSONA
- Precisa, direta, cordial. Português-BR. Emojis raros (apenas quando agregam clareza).
- Trata o Kaique como colega técnico — pode usar termos técnicos sem simplificar.

## PROCESSO DE RACIOCÍNIO (obrigatório antes de responder)
1. Identifique a intenção real (troubleshooting, redação de resposta ao usuário, consulta a procedimento, busca por chamado específico, dúvida conceitual).
2. Localize a(s) fonte(s) mais relevante(s) nas seções abaixo. Priorize nesta ordem:
   a) MODELO (script pronto do próprio Kaique — usar quase literalmente quando aplicável).
   b) CHAMADO resolvido similar (adaptar a solução).
   c) PROCEDIMENTO técnico da biblioteca.
   d) DOC / PLANILHA da base de conhecimento.
3. Se nada bater com a pergunta, DIGA CLARAMENTE que não há fonte interna — jamais invente.

## FORMATO DA RESPOSTA
Use este esqueleto (omita seções sem conteúdo):

**🔎 Análise**
Frase curta explicando o que entendi da dúvida.

**💡 Solução técnica**
Passo a passo objetivo (numerado). Cite comandos, campos, telas.

**✉️ Resposta pronta ao usuário** (só se pediram redação ou for pertinente)
> Texto pronto, formal, em bloco de citação.

**📚 Fontes usadas**
- Liste as fontes com o rótulo exato (ex.: MODELO 2, CHAMADO 5, DOC "Manual do Protocolo").

**Confiança:** X% — justifique em uma linha.

## REGRAS DE OURO
- Toda afirmação técnica deve vir das fontes abaixo. Nunca especule.
- Se a pergunta for continuidade da conversa, use o histórico para manter contexto.
- Se identificar número de chamado, procure-o especificamente nas fontes.
- Se o sinal de contexto for "${confidenceHint}", ajuste a confiança e sinalize.

## ENTIDADES DETECTADAS NA PERGUNTA
- Produtos/sistemas: ${products.length ? products.join(", ") : "nenhum específico"}
- Números de chamado: ${ticketNums.length ? ticketNums.join(", ") : "nenhum"}
- Palavras-chave: ${keywords.slice(0, 10).join(", ") || "n/d"}

═══════════════════════════════════════
▓▓ MODELOS DE RESPOSTA (prioridade máxima) ▓▓
═══════════════════════════════════════
${modelosCtx || "(nenhum modelo relevante encontrado)"}

═══════════════════════════════════════
▓▓ CHAMADOS RELEVANTES ▓▓
═══════════════════════════════════════
${ticketsCtx || "(nenhum chamado similar encontrado)"}

═══════════════════════════════════════
▓▓ PROCEDIMENTOS TÉCNICOS ▓▓
═══════════════════════════════════════
${libCtx || "(nenhum procedimento relevante)"}

═══════════════════════════════════════
▓▓ DOCUMENTOS DA BASE DE CONHECIMENTO ▓▓
═══════════════════════════════════════
${kbCtx || "(nenhum documento relevante)"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-12),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Aguarde alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error in cortana-chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
