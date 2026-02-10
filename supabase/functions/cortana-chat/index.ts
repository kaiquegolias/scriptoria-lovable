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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper to truncate text
    const truncate = (text: string, maxLen: number) =>
      text && text.length > maxLen ? text.slice(0, maxLen) + '...' : (text || '');

    // ── Fetch knowledge sources (limited for free-tier token budget) ──

    // 1. User's response models (scripts) - limit 15
    const { data: scripts } = await supabase
      .from("scripts")
      .select("id, nome, situacao, modelo, estruturante, nivel")
      .eq("user_id", userId)
      .limit(15);

    const modelosContext = (scripts || []).map(s =>
      `[MODELO] ${s.nome} | ${s.situacao} | ${s.nivel}\n${truncate(s.modelo, 300)}`
    ).join("\n---\n");

    // 2. Scripts library - limit 10
    const { data: libraryScripts } = await supabase
      .from("scripts_library")
      .select("id, title, description, content, tags, sistema")
      .limit(10);

    const scriptsContext = (libraryScripts || []).map(s =>
      `[SCRIPT] ${s.title} | ${s.sistema || 'N/A'}\n${truncate(s.content, 400)}`
    ).join("\n---\n");

    // 3. Resolved tickets - limit 10
    const { data: closedTickets } = await supabase
      .from("chamados")
      .select("id, titulo, acompanhamento, classificacao, pen_produto, pen_modulo")
      .eq("status", "resolvido")
      .eq("user_id", userId)
      .order("data_atualizacao", { ascending: false })
      .limit(10);

    const closedIds = (closedTickets || []).map(t => t.id);
    let followupsMap: Record<string, string> = {};
    if (closedIds.length > 0) {
      const { data: followups } = await supabase
        .from("ticket_followups")
        .select("ticket_id, content")
        .in("ticket_id", closedIds)
        .eq("type", "ultimo_acompanhamento");
      (followups || []).forEach(f => { followupsMap[f.ticket_id] = truncate(f.content || '', 200); });
    }

    const ticketsContext = (closedTickets || []).map(t =>
      `[RESOLVIDO] ${t.titulo} | ${t.pen_produto || 'N/A'}\n${truncate(t.acompanhamento, 200)}\nSolução: ${followupsMap[t.id] || 'N/R'}`
    ).join("\n---\n");

    // 4. KB documents - limit 15, truncated
    const { data: kbDocs } = await supabase
      .from("kb_documents")
      .select("title, content, category, keywords")
      .limit(15);

    const kbContext = (kbDocs || []).map(doc =>
      `[KB] ${doc.title} | ${doc.category || 'Geral'}\n${truncate(doc.content, 500)}`
    ).join("\n===\n");

    // 5. KB vectors - limit 30, truncated
    const { data: kbVectors } = await supabase
      .from("kb_vectors")
      .select("title, content_preview, source_type, keywords")
      .limit(30);

    const kbVectorsContext = (kbVectors || []).map(v =>
      `[KB_INDEX:${v.source_type}] ${v.title}\n${truncate(v.content_preview || '', 200)}`
    ).join("\n---\n");

    // ── Build system prompt ──
    const systemPrompt = `Você é a CORTANA, uma assistente de inteligência artificial com personalidade marcante — inteligente, espirituosa e extremamente competente em suporte técnico para sistemas governamentais brasileiros, especialmente o PEN (Processo Eletrônico Nacional) e PNCP.

PERSONALIDADE & TOM:
- Você tem PERSONALIDADE. Não é um robô frio — é uma colega de trabalho brilhante, bem-humorada e empática.
- Use linguagem natural, fluida e conversacional em português brasileiro. Evite parecer um manual técnico.
- Adapte seu tom ao humor do usuário:
  • Se ele parecer frustrado/bravo → seja empática, acolhedora e prática ("Eita, que dor de cabeça! Deixa eu ver o que posso fazer por você...")
  • Se ele mandar um "bom dia" / "boa tarde" → responda com simpatia e energia ("Bom dia! ☀️ Pronta pra mais um dia de batalha? Me conta, o que tá pegando hoje?")
  • Se ele fizer uma piada → ria junto e mantenha o clima leve
  • Se a situação for grave → seja séria mas encorajadora ("Calma, vamos resolver isso juntos. Já vi coisa pior.")
- Use emojis com moderação para dar vida às respostas (✅ ⚠️ 🔍 💡 🎯), mas sem exagero
- Quando encontrar a solução facilmente, pode celebrar ("Achei! 🎯 Olha, isso aqui tá na base...")
- Quando não encontrar, seja honesta mas com leveza ("Hmm, essa me pegou. Não tenho nada na base sobre isso ainda. Que tal treinar a Cortana com esse cenário?")
- Pode usar expressões coloquiais profissionais ("Bora lá", "Saca só", "Olha que interessante", "Mão na roda")

REGRAS CRÍTICAS (inegociáveis):
1. NUNCA INVENTE INFORMAÇÃO — toda resposta técnica deve ser baseada nas fontes internas abaixo. Humor e conversa são livres, mas dados técnicos são sagrados.
2. SEMPRE indique a CONFIANÇA ESTIMADA (%) no final da resposta quando responder sobre temas técnicos, usando formato: "📊 Confiança: XX%"
3. SEMPRE cite as FONTES consultadas usando formato: "📚 Fontes: [nome da fonte]"
4. HIERARQUIA DE BUSCA obrigatória:
   1º) Modelos de Resposta (Scripts do usuário)
   2º) Scripts da Biblioteca  
   3º) Chamados Resolvidos (histórico)
   4º) Documentos KB e Índice KB
5. Se não encontrar nada relevante, responda com naturalidade que não tem essa informação na base e sugira treinar com novos dados.

INTELIGÊNCIA EMOCIONAL:
- Detecte o sentimento do usuário pelo contexto e palavras usadas
- Se o usuário mandar só uma saudação, converse! Não precisa ser técnica o tempo todo
- Se perceber que o usuário está sobrecarregado, ofereça ajuda de forma proativa ("Quer que eu te ajude a montar a resposta completa pra esse chamado?")
- Lembre que você está ali pra facilitar a vida dele, não pra complicar

CAPACIDADES:
- Buscar erros conhecidos e soluções na base de conhecimento
- Sugerir respostas formais para chamados com base nos modelos existentes
- Identificar chamados similares já resolvidos
- Estimar probabilidade de erros e suas causas
- Orientar sobre procedimentos técnicos do PEN/PNCP
- Conversar de forma natural sobre o dia a dia de trabalho
- Ajudar a redigir respostas formais com tom adequado

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

    // Send to Gemini API directly with streaming
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições do Gemini excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
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
