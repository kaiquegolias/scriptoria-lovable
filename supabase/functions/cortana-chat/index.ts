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

    // ── Fetch all knowledge sources ──

    // 1. User's response models (scripts)
    const { data: scripts } = await supabase
      .from("scripts")
      .select("id, nome, situacao, modelo, estruturante, nivel")
      .eq("user_id", userId);

    const modelosContext = (scripts || []).map(s =>
      `[MODELO] ${s.nome} | Situação: ${s.situacao} | Nível: ${s.nivel} | Estruturante: ${s.estruturante}\nResposta-modelo: ${s.modelo}`
    ).join("\n---\n");

    // 2. Scripts library
    const { data: libraryScripts } = await supabase
      .from("scripts_library")
      .select("id, title, description, content, tags, sistema");

    const scriptsContext = (libraryScripts || []).map(s =>
      `[SCRIPT] ${s.title} | Sistema: ${s.sistema || 'N/A'} | Tags: ${(s.tags || []).join(", ")}\n${s.description || ''}\n${s.content}`
    ).join("\n---\n");

    // 3. Resolved tickets with solutions
    const { data: closedTickets } = await supabase
      .from("chamados")
      .select("id, titulo, acompanhamento, classificacao, estruturante, nivel, assunto, pen_produto, pen_modulo")
      .eq("status", "resolvido")
      .eq("user_id", userId)
      .order("data_atualizacao", { ascending: false })
      .limit(30);

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

    const ticketsContext = (closedTickets || []).map(t =>
      `[CHAMADO_RESOLVIDO] ${t.titulo} | Classificação: ${t.classificacao || 'N/A'} | Produto PEN: ${t.pen_produto || 'N/A'} | Módulo: ${t.pen_modulo || 'N/A'}\nDescrição: ${t.acompanhamento}\nSolução: ${followupsMap[t.id] || 'Não registrada'}`
    ).join("\n---\n");

    // 4. KB documents
    const { data: kbDocs } = await supabase
      .from("kb_documents")
      .select("title, content, category, keywords")
      .limit(50);

    const kbContext = (kbDocs || []).map(doc =>
      `[KB] ${doc.title} | Categoria: ${doc.category || 'Geral'} | Keywords: ${(doc.keywords || []).join(", ")}\n${doc.content}`
    ).join("\n===\n");

    // 5. KB vectors (indexed knowledge)
    const { data: kbVectors } = await supabase
      .from("kb_vectors")
      .select("title, content_preview, source_type, keywords")
      .limit(100);

    const kbVectorsContext = (kbVectors || []).map(v =>
      `[KB_INDEX:${v.source_type}] ${v.title} | Keywords: ${(v.keywords || []).join(", ")}\n${v.content_preview || ''}`
    ).join("\n---\n");

    // ── Build system prompt ──
    const systemPrompt = `Você é a CORTANA, assistente de inteligência artificial especializada em suporte técnico para sistemas governamentais brasileiros, especialmente o PEN (Processo Eletrônico Nacional) e PNCP.

PERSONALIDADE:
- Você é profissional, objetiva e precisa
- Responde em linguagem natural e conversacional em português brasileiro
- Sempre fundamenta suas respostas nas fontes internas disponíveis
- Quando não encontra informação, diz claramente que não possui dados suficientes

REGRAS CRÍTICAS:
1. NUNCA INVENTE INFORMAÇÃO — toda resposta deve ser baseada nas fontes internas abaixo
2. SEMPRE indique a CONFIANÇA ESTIMADA (%) no final da resposta, usando formato: "📊 Confiança: XX%"
3. SEMPRE cite as FONTES consultadas usando formato: "📚 Fontes: [nome da fonte]"
4. HIERARQUIA DE BUSCA obrigatória:
   1º) Modelos de Resposta (Scripts do usuário)
   2º) Scripts da Biblioteca  
   3º) Chamados Resolvidos (histórico)
   4º) Documentos KB e Índice KB
5. Se não encontrar nada relevante, responda: "Não encontrei informações na base de conhecimento sobre esse tema. Considere treinar a Cortana com novos dados."

CAPACIDADES:
- Buscar erros conhecidos e soluções na base de conhecimento
- Sugerir respostas formais para chamados com base nos modelos existentes
- Identificar chamados similares já resolvidos
- Estimar probabilidade de erros e suas causas
- Orientar sobre procedimentos técnicos do PEN/PNCP

BASE DE CONHECIMENTO DISPONÍVEL:

═══ MODELOS DE RESPOSTA (Prioridade 1) ═══
${modelosContext || "Nenhum modelo cadastrado."}

═══ SCRIPTS DA BIBLIOTECA (Prioridade 2) ═══
${scriptsContext || "Nenhum script na biblioteca."}

═══ CHAMADOS RESOLVIDOS (Prioridade 3) ═══
${ticketsContext || "Nenhum chamado resolvido disponível."}

═══ DOCUMENTOS KB (Prioridade 4) ═══
${kbContext || "KB vazia."}

═══ ÍNDICE KB (Prioridade 4) ═══
${kbVectorsContext || "Índice vazio."}`;

    // Send to AI with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response back
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
