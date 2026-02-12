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
  text && text.length > maxLen ? text.slice(0, maxLen) + '…' : (text || '');

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'o','a','os','as','um','uma','de','do','da','dos','das','em','no','na','nos','nas',
    'por','para','com','sem','sobre','entre','que','qual','quais','como','onde','quando',
    'quem','se','ou','e','mas','pois','porque','não','sim','mais','menos','muito','pouco',
    'bem','mal','já','ainda','também','só','apenas','esse','essa','este','esta','isso',
    'eu','você','ele','ela','nós','eles','meu','minha','seu','sua','ser','estar','ter',
    'haver','fazer','poder','dever','ir','vir','foi','era','tem','pode','deve','vai',
    'me','te','lhe','ao','à','pelo','pela','olá','oi','bom','boa','dia','tarde','noite',
    'obrigado','obrigada','preciso','quero','gostaria','favor','ajuda','saber',
    'cortana','hey','hei','tudo','nada','algo','coisa','faz','dá','vem',
  ]);
  return text.toLowerCase()
    .replace(/[^\w\sàáâãéêíóôõúç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 10);
}

function isBinaryContent(content: string): boolean {
  const indicators = ['/FlateDecode', '/XObject', 'endobj', 'endstream', '/DeviceRGB'];
  return indicators.filter(i => content.includes(i)).length >= 3;
}

async function fetchSheetCSV(url: string): Promise<string | null> {
  try {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    const resp = await fetch(csvUrl, { redirect: 'follow' });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

function relevanceScore(text: string, keywords: string[]): number {
  if (!text || !keywords.length) return 0;
  const lower = text.toLowerCase();
  return keywords.reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0);
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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const keywords = extractKeywords(lastUserMsg);
    const ticketNum = lastUserMsg.match(/\d{7,}/)?.[0] || null;

    // Parallel data fetching
    const [
      { data: scripts },
      { data: closedTickets },
      { data: kbDocs },
    ] = await Promise.all([
      supabase.from("scripts").select("nome, situacao, modelo, estruturante, nivel").eq("user_id", userId),
      supabase.from("chamados").select("id, titulo, acompanhamento, classificacao, pen_produto, pen_modulo")
        .eq("status", "resolvido").eq("user_id", userId)
        .order("data_atualizacao", { ascending: false }).limit(30),
      supabase.from("kb_documents").select("title, content, category, source"),
    ]);

    // ── SCRIPTS: only top relevant (max 8) ──
    const rankedScripts = (scripts || [])
      .map(s => ({ ...s, score: relevanceScore(`${s.nome} ${s.situacao} ${s.modelo}`, keywords) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const modelosCtx = rankedScripts
      .map(s => `[MODELO] ${s.nome} (${s.estruturante}/${s.nivel})\nSituação: ${truncate(s.situacao, 300)}\nResposta: ${truncate(s.modelo, 400)}`)
      .join("\n---\n");

    // ── TICKETS: only top relevant (max 10) ──
    const rankedTickets = (closedTickets || [])
      .map(t => ({
        ...t,
        score: relevanceScore(`${t.titulo} ${t.acompanhamento} ${t.classificacao || ''} ${t.pen_produto || ''}`, keywords)
          + (ticketNum && t.titulo.includes(ticketNum) ? 100 : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const ticketsCtx = rankedTickets
      .map(t => `[RESOLVIDO] ${t.titulo} | ${t.pen_produto || 'N/A'}\n${truncate(t.acompanhamento, 300)}`)
      .join("\n---\n");

    // ── KB: filter junk, only relevant, handle sheets ──
    const kbParts: string[] = [];
    for (const doc of (kbDocs || [])) {
      if (isBinaryContent(doc.content)) continue;

      const sheetUrl = (doc.content || '').match(/https:\/\/docs\.google\.com\/spreadsheets\/[^\s)]+/)?.[0]
        || ((doc.source || '').includes('docs.google.com/spreadsheets') ? doc.source : null);

      if (sheetUrl) {
        const csv = await fetchSheetCSV(sheetUrl);
        if (csv) {
          if (ticketNum) {
            const lines = csv.split('\n');
            const header = lines[0] || '';
            const matches = lines.filter(l => l.includes(ticketNum));
            if (matches.length > 0) {
              kbParts.push(`[PLANILHA] ${doc.title}\nCabeçalho: ${header}\n${matches.join('\n')}`);
              continue;
            }
          }
          // Only include first 3000 chars of sheet to save tokens
          kbParts.push(`[PLANILHA] ${doc.title}\n${truncate(csv, 3000)}`);
        }
        continue;
      }

      const score = relevanceScore(`${doc.title} ${doc.content}`, keywords);
      if (score > 0) {
        kbParts.push(`[KB] ${doc.title}\n${truncate(doc.content, 800)}`);
      }
    }
    const kbCtx = kbParts.join("\n===\n");

    // ── System prompt (compact) ──
    const systemPrompt = `Você é a CORTANA, assistente especialista no PEN (Processo Eletrônico Nacional), PNCP e sistemas relacionados (SEI, Tramita GOV.BR, NUP, Protocolo Integrado, Barramento PEN).

TOM: Profissional, empática, competente. Linguagem natural em pt-BR. Emojis com moderação.

REGRAS:
1. NUNCA invente — toda resposta deve vir das fontes abaixo. Se não encontrar, diga claramente.
2. Inclua confiança (%) e fontes usadas em respostas técnicas.
3. Prioridade: 1º Modelos de Resposta → 2º Chamados Resolvidos → 3º Documentos KB.
4. Para problemas técnicos, estruture: Análise → Solução → Modelo de Resposta (se aplicável) → Fontes.

═══ MODELOS DE RESPOSTA ═══
${modelosCtx || "Nenhum."}

═══ CHAMADOS RESOLVIDOS ═══
${ticketsCtx || "Nenhum."}

═══ DOCUMENTOS KB ═══
${kbCtx || "Vazio."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-6), // Only last 6 messages to save tokens
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
