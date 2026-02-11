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

// ── Helpers ──

const truncate = (text: string, maxLen: number) =>
  text && text.length > maxLen ? text.slice(0, maxLen) + '…' : (text || '');

/** Extract meaningful keywords from user message for search */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
    'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sobre', 'entre',
    'que', 'qual', 'quais', 'como', 'onde', 'quando', 'quem', 'quanto', 'quantos',
    'se', 'ou', 'e', 'mas', 'pois', 'porque', 'porquê', 'não', 'sim', 'mais', 'menos',
    'muito', 'pouco', 'bem', 'mal', 'já', 'ainda', 'também', 'só', 'apenas',
    'esse', 'essa', 'este', 'esta', 'isso', 'isto', 'aquele', 'aquela', 'aquilo',
    'eu', 'você', 'ele', 'ela', 'nós', 'eles', 'elas', 'meu', 'minha', 'seu', 'sua',
    'ser', 'estar', 'ter', 'haver', 'fazer', 'poder', 'dever', 'ir', 'vir',
    'foi', 'era', 'tem', 'pode', 'deve', 'vai', 'vem', 'faz', 'dá',
    'me', 'te', 'lhe', 'nos', 'vos', 'lhes', 'mim', 'ti', 'si',
    'ao', 'à', 'pelo', 'pela', 'num', 'numa', 'dum', 'duma',
    'olá', 'oi', 'bom', 'boa', 'dia', 'tarde', 'noite', 'obrigado', 'obrigada',
    'preciso', 'quero', 'gostaria', 'favor', 'ajuda', 'ajude', 'saber',
    'cortana', 'hey', 'hei', 'tudo', 'nada', 'algo', 'coisa',
  ]);
  return text.toLowerCase()
    .replace(/[^\w\sàáâãéêíóôõúç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 12);
}

/** Check if content is raw PDF binary (unusable) */
function isBinaryContent(content: string): boolean {
  const binaryIndicators = ['/FlateDecode', '/XObject', 'endobj', 'endstream', '/DeviceRGB'];
  let hits = 0;
  for (const ind of binaryIndicators) {
    if (content.includes(ind)) hits++;
  }
  return hits >= 3;
}

/** Fetch Google Sheets as CSV */
async function fetchSheetCSV(url: string): Promise<string | null> {
  try {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const sheetId = match[1];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    const resp = await fetch(csvUrl, { redirect: 'follow' });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

/** Score relevance of a text against keywords */
function relevanceScore(text: string, keywords: string[]): number {
  if (!text || !keywords.length) return 0;
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) score++;
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!LOVABLE_API_KEY && !GEMINI_API_KEY) {
      throw new Error("No AI API key configured (LOVABLE_API_KEY or GEMINI_API_KEY)");
    }
    
    const useLovable = !!LOVABLE_API_KEY;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get latest user message for smart search
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const keywords = extractKeywords(lastUserMsg);
    const hasTicketNumber = lastUserMsg.match(/\d{7,}/)?.[0] || null;

    // ── Parallel data fetching ──
    const [
      { data: scripts },
      { data: closedTickets },
      { data: kbDocs },
      { data: kbVectors },
    ] = await Promise.all([
      // 1. User's response models (scripts) - ALL of them
      supabase
        .from("scripts")
        .select("id, nome, situacao, modelo, estruturante, nivel")
        .eq("user_id", userId),

      // 2. Resolved tickets - more items
      supabase
        .from("chamados")
        .select("id, titulo, acompanhamento, classificacao, pen_produto, pen_modulo")
        .eq("status", "resolvido")
        .eq("user_id", userId)
        .order("data_atualizacao", { ascending: false })
        .limit(50),

      // 3. KB documents
      supabase
        .from("kb_documents")
        .select("title, content, category, keywords, source"),

      // 4. KB vectors (indexed tickets) - search by keywords
      supabase
        .from("kb_vectors")
        .select("title, content_preview, source_type, keywords")
        .limit(100),
    ]);

    // ── Smart followups fetch ──
    const closedIds = (closedTickets || []).map(t => t.id);
    let followupsMap: Record<string, string> = {};
    if (closedIds.length > 0) {
      const { data: followups } = await supabase
        .from("ticket_followups")
        .select("ticket_id, content")
        .in("ticket_id", closedIds)
        .eq("type", "ultimo_acompanhamento");
      (followups || []).forEach(f => { followupsMap[f.ticket_id] = f.content || ''; });
    }

    // ── 1. SCRIPTS - rank by relevance, include all ──
    const rankedScripts = (scripts || [])
      .map(s => ({
        ...s,
        score: relevanceScore(`${s.nome} ${s.situacao} ${s.modelo}`, keywords)
      }))
      .sort((a, b) => b.score - a.score);

    const modelosContext = rankedScripts
      .map(s => `[MODELO] ${s.nome} | Situação: ${s.situacao} | ${s.nivel}\n${truncate(s.modelo, 600)}`)
      .join("\n---\n");

    // ── 2. TICKETS RESOLVIDOS - rank by relevance ──
    const rankedTickets = (closedTickets || [])
      .map(t => ({
        ...t,
        score: relevanceScore(
          `${t.titulo} ${t.acompanhamento} ${t.classificacao || ''} ${t.pen_produto || ''} ${t.pen_modulo || ''}`,
          keywords
        ) + (hasTicketNumber && t.titulo.includes(hasTicketNumber) ? 100 : 0)
      }))
      .sort((a, b) => b.score - a.score);

    // Top relevant tickets get more context, rest gets less
    const ticketsContext = rankedTickets.slice(0, 30).map((t, i) => {
      const maxLen = i < 10 ? 500 : 200;
      const followup = followupsMap[t.id] || '';
      return `[RESOLVIDO] ${t.titulo} | Produto: ${t.pen_produto || 'N/A'} | Módulo: ${t.pen_modulo || 'N/A'} | Classificação: ${t.classificacao || 'N/A'}\nDescrição: ${truncate(t.acompanhamento, maxLen)}\nSolução: ${truncate(followup, maxLen)}`;
    }).join("\n---\n");

    // ── 3. KB DOCUMENTS - smart processing ──
    const kbContextParts: string[] = [];
    for (const doc of (kbDocs || [])) {
      // Skip binary PDF content
      if (isBinaryContent(doc.content)) {
        continue;
      }

      // Handle Google Sheets
      const isSheet = (doc.content || '').includes('docs.google.com/spreadsheets') ||
                      (doc.source || '').includes('docs.google.com/spreadsheets');
      const sheetUrl = isSheet 
        ? (doc.content.match(/https:\/\/docs\.google\.com\/spreadsheets\/[^\s)]+/)?.[0] || doc.source) 
        : null;

      if (sheetUrl) {
        const csv = await fetchSheetCSV(sheetUrl);
        if (csv) {
          // If user asked about a specific ticket number, try to find that row
          if (hasTicketNumber) {
            const lines = csv.split('\n');
            const header = lines[0] || '';
            const matchingLines = lines.filter(l => l.includes(hasTicketNumber));
            if (matchingLines.length > 0) {
              kbContextParts.push(`[KB:PLANILHA] ${doc.title} | ${doc.category || 'Geral'}\nCabeçalho: ${header}\n${matchingLines.join('\n')}`);
              continue;
            }
          }
          // Otherwise include more data for context
          kbContextParts.push(`[KB:PLANILHA] ${doc.title} | ${doc.category || 'Geral'}\n${truncate(csv, 8000)}`);
          continue;
        }
      }

      // Regular KB doc - use more of the content
      const score = relevanceScore(`${doc.title} ${doc.content}`, keywords);
      const maxLen = score > 0 ? 2000 : 800;
      kbContextParts.push(`[KB] ${doc.title} | ${doc.category || 'Geral'}\n${truncate(doc.content, maxLen)}`);
    }
    const kbContext = kbContextParts.join("\n===\n");

    // ── 4. KB VECTORS - smart keyword search ──
    const rankedVectors = (kbVectors || [])
      .map(v => ({
        ...v,
        score: relevanceScore(
          `${v.title || ''} ${v.content_preview || ''} ${(v.keywords || []).join(' ')}`,
          keywords
        ) + (hasTicketNumber && (v.title || '').includes(hasTicketNumber) ? 100 : 0)
      }))
      .sort((a, b) => b.score - a.score);

    // Only include relevant vectors, up to 40
    const relevantVectors = rankedVectors.filter(v => v.score > 0).slice(0, 40);
    const extraVectors = rankedVectors.filter(v => v.score === 0).slice(0, 10);

    const kbVectorsContext = [...relevantVectors, ...extraVectors]
      .map(v => `[KB_INDEX:${v.source_type}] ${v.title}\n${truncate(v.content_preview || '', 400)}`)
      .join("\n---\n");

    // ── Build system prompt ──
    const systemPrompt = `Você é a CORTANA, uma assistente de IA ESPECIALISTA no PEN (Processo Eletrônico Nacional), PNCP e todos os sistemas relacionados (SEI, Tramita GOV.BR, Protocolo GOV.BR, NUP, Protocolo Integrado, Barramento PEN).

PERSONALIDADE & TOM:
- Você é brilhante, espirituosa, empática e extremamente competente. Não é um robô frio — é uma colega de trabalho excepcional.
- Use linguagem natural, fluida e conversacional em português brasileiro.
- Adapte o tom ao humor do usuário: empática com frustração, alegre com saudações, séria em problemas graves.
- Emojis com moderação (✅ ⚠️ 🔍 💡 🎯 📋). Expressões profissionais ("Bora lá", "Saca só", "Achei!").

EXPERTISE PEN - VOCÊ DOMINA:
- Arquitetura completa do PEN: Barramento, módulos, integrações
- SEI (Sistema Eletrônico de Informações): versões, erros comuns, configurações, módulos (mod-sei-pen, mod-wssei, etc.)
- Tramita GOV.BR: tramitação entre órgãos, status, recusas, ciências
- Protocolo GOV.BR / NUP: geração, cadastro, unidades
- PNCP (Portal Nacional de Contratações Públicas): editais, publicações
- Procedimentos técnicos: deploy, atualização, migração de versões
- Gestão de chamados: classificação (Resolução técnica, Erro de usuário, Falta de comunicação, Configuração aplicada, Problema de rede, Não pertinentes ao PEN/PNCP)
- Hierarquia de suporte: N1, N2, N3, PO, PO Substituto, Representante Técnico

REGRAS INEGOCIÁVEIS:
1. NUNCA INVENTE — toda resposta técnica DEVE vir das fontes abaixo. Se não encontrar, diga claramente.
2. Quando responder tecnicamente, SEMPRE inclua:
   📊 Confiança: XX% (baseada na qualidade das fontes encontradas)
   📚 Fontes: [lista das fontes usadas]
3. HIERARQUIA DE BUSCA (siga esta ordem):
   1º) Modelos de Resposta do usuário (scripts pessoais)
   2º) Chamados Resolvidos (histórico real de soluções)
   3º) Documentos e Planilhas KB
   4º) Índice KB (kb_vectors com tickets indexados)
4. Se encontrar dados em planilhas, CITE linhas específicas e IDs quando possível.
5. Se não encontrar nada relevante, sugira ao usuário treinar a Cortana com novos dados.

INTELIGÊNCIA DE BUSCA:
- Quando o usuário mencionar um NÚMERO de chamado (ex: 33304336), busque nas planilhas e no índice KB.
- Quando perguntar sobre um PRODUTO (SEI, Tramita, NUP), filtre por produto nas fontes.
- Quando perguntar sobre um ERRO, busque padrões similares nos chamados resolvidos.
- Quando pedir um MODELO de resposta, priorize os scripts do usuário e adapte ao contexto.

CAPACIDADES AVANÇADAS:
- Buscar e correlacionar erros conhecidos com soluções aplicadas
- Montar respostas formais completas para chamados, usando modelos existentes como base
- Identificar padrões recorrentes entre chamados similares
- Analisar dados de planilhas internas com IDs, status e históricos
- Orientar sobre procedimentos técnicos com base em documentação real
- Sugerir classificações e encaminhamentos baseados no histórico

FORMATO DE RESPOSTAS TÉCNICAS:
Quando responder sobre um problema/chamado técnico, estruture assim:
1. **Análise** - O que foi identificado nas fontes
2. **Solução/Orientação** - Passos claros baseados em dados reais
3. **Modelo de Resposta** (quando aplicável) - Texto formal pronto para uso
4. **Fontes e Confiança** - De onde veio a informação

BASE DE CONHECIMENTO (pesquise com atenção):

═══ MODELOS DE RESPOSTA DO USUÁRIO (Prioridade 1) ═══
${modelosContext || "Nenhum modelo cadastrado."}

═══ CHAMADOS RESOLVIDOS (Prioridade 2) ═══
${ticketsContext || "Nenhum chamado resolvido disponível."}

═══ DOCUMENTOS E PLANILHAS KB (Prioridade 3) ═══
${kbContext || "KB vazia."}

═══ ÍNDICE KB - TICKETS INDEXADOS (Prioridade 4) ═══
${kbVectorsContext || "Índice vazio."}`;

    // Send to AI with streaming - prefer Lovable AI gateway, fallback to Gemini
    const aiUrl = useLovable
      ? "https://ai.gateway.lovable.dev/v1/chat/completions"
      : "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    
    const aiKey = useLovable ? LOVABLE_API_KEY : GEMINI_API_KEY;

    const response = await fetch(aiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Aguarde 1-2 minutos e tente novamente." }),
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
