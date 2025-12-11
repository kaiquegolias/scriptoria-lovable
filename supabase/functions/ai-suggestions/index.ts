import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, userId } = await req.json();
    
    if (!ticketId || !userId) {
      return new Response(
        JSON.stringify({ error: "ticketId and userId are required" }),
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

    // Fetch ticket data
    const { data: ticket, error: ticketError } = await supabase
      .from("chamados")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error("Ticket not found");
    }

    // PRIORIDADE 1: Modelos de Resposta para Chamados (Scripts do usuário)
    const { data: scripts } = await supabase
      .from("scripts")
      .select("id, nome, situacao, modelo, estruturante, nivel")
      .eq("user_id", userId);

    // PRIORIDADE 2: Scripts da Biblioteca
    const { data: libraryScripts } = await supabase
      .from("scripts_library")
      .select("id, title, description, content, tags, sistema");

    // PRIORIDADE 3: Chamados encerrados com soluções
    const { data: closedTickets } = await supabase
      .from("chamados")
      .select("id, titulo, acompanhamento, classificacao, estruturante, nivel")
      .eq("status", "resolvido")
      .eq("user_id", userId)
      .limit(20);

    const closedTicketIds = (closedTickets || []).map(t => t.id);
    const { data: followups } = await supabase
      .from("ticket_followups")
      .select("ticket_id, content, type")
      .in("ticket_id", closedTicketIds.length > 0 ? closedTicketIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("type", "ultimo_acompanhamento");

    // PRIORIDADE 4: KB documents
    const { data: kbDocs } = await supabase
      .from("kb_documents")
      .select("title, content, category, keywords")
      .limit(50);

    // Build context with clear priority markers
    const modelosContext = (scripts || []).map(s => 
      `[MODELO_RESPOSTA] Script: ${s.nome}\nSituação: ${s.situacao}\nModelo de resposta: ${s.modelo}\nEstruturante: ${s.estruturante}\nNível: ${s.nivel}`
    ).join("\n\n---\n\n");

    const scriptsContext = (libraryScripts || []).map(s =>
      `[SCRIPT_BIBLIOTECA] Título: ${s.title}\nDescrição: ${s.description || 'N/A'}\nConteúdo: ${s.content}\nTags: ${(s.tags || []).join(", ")}`
    ).join("\n\n---\n\n");

    const closedTicketsContext = (closedTickets || []).map(t => {
      const followup = (followups || []).find(f => f.ticket_id === t.id);
      return `[CHAMADO_RESOLVIDO] Título: ${t.titulo}\nClassificação: ${t.classificacao || 'N/A'}\nEstruturante: ${t.estruturante}\nNível: ${t.nivel}\nAcompanhamento: ${t.acompanhamento}\nSolução aplicada: ${followup?.content || 'N/A'}`;
    }).join("\n\n---\n\n");

    const kbContext = (kbDocs || []).map(doc =>
      `[KB] ${doc.title}\nCategoria: ${doc.category || 'Geral'}\nConteúdo: ${doc.content}`
    ).join("\n\n===\n\n");

    const systemPrompt = `Você é um assistente especializado em suporte técnico para sistemas governamentais brasileiros (PEN e PNCP).

REGRAS CRÍTICAS DE COMPORTAMENTO:

1. NUNCA INVENTE INFORMAÇÃO
   - Se não encontrar conteúdo relevante nas fontes internas, diga EXPLICITAMENTE:
   "Não encontrei conteúdo relevante nas suas fontes internas para responder com precisão."

2. ORDEM DE PRIORIDADE DE BUSCA (OBRIGATÓRIO):
   1º) [MODELO_RESPOSTA] - Modelos de Resposta para Chamados - FONTE PRINCIPAL
   2º) [SCRIPT_BIBLIOTECA] - Scripts da Biblioteca
   3º) [CHAMADO_RESOLVIDO] - Histórico de chamados resolvidos
   4º) [KB] - Biblioteca KB - consultar apenas quando faltar nas fontes anteriores

3. NUNCA REESCREVA por conta própria - sua função é LOCALIZAR, EXTRAIR e MONTAR respostas usando as bases internas

4. SEMPRE informe a confiança estimada em PERCENTUAL (0-100) baseada em:
   - Quantidade de evidências encontradas nas fontes internas
   - Correspondência textual com termos pesquisados
   - Similaridade com Modelos de Resposta existentes
   - Presença de termos-chave nos scripts

5. COMPORTAMENTOS PROIBIDOS:
   - Inventar respostas ou dados técnicos
   - Gerar modelos próprios quando existem "Modelos de Resposta"
   - Apresentar respostas sem probabilidade estimada
   - Ignorar scripts
   - Usar criatividade — seja OBJETIVA e baseada em dados internos

FONTES DISPONÍVEIS:

PRIORIDADE 1 - MODELOS DE RESPOSTA PARA CHAMADOS:
${modelosContext || "Nenhum modelo disponível"}

PRIORIDADE 2 - SCRIPTS DA BIBLIOTECA:
${scriptsContext || "Nenhum script na biblioteca"}

PRIORIDADE 3 - HISTÓRICO DE CHAMADOS RESOLVIDOS:
${closedTicketsContext || "Nenhum histórico disponível"}

PRIORIDADE 4 - BIBLIOTECA KB:
${kbContext || "KB vazia"}`;

    const userPrompt = `Analise o seguinte chamado e forneça sugestões:

TÍTULO: ${ticket.titulo}
ESTRUTURANTE: ${ticket.estruturante}
NÍVEL: ${ticket.nivel}
CLASSIFICAÇÃO: ${ticket.classificacao || "Não definida"}
ACOMPANHAMENTO/DESCRIÇÃO: ${ticket.acompanhamento}
LINKS: ${(ticket.links || []).join(", ") || "Nenhum"}

INSTRUÇÕES:
1. Busque PRIMEIRO nos Modelos de Resposta para Chamados
2. Depois vasculhe os Scripts da Biblioteca
3. Verifique chamados resolvidos similares
4. Consulte KB somente quando faltar informação nas fontes acima

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "analiseInterna": {
    "fontesEncontradas": ["lista das fontes onde encontrou informação"],
    "trechosRelevantes": ["trecho 1 encontrado", "trecho 2 encontrado"]
  },
  "explicacaoTecnica": "Explicação técnica construída a partir das fontes internas",
  "respostasFormais": [
    "Modelo 1 - extraído prioritariamente dos Modelos de Resposta existentes",
    "Modelo 2 - baseado nos scripts/documentação interna",
    "Modelo 3 - alternativa formal baseada nas fontes"
  ],
  "confiancaEstimada": 75,
  "scriptsRelacionados": [
    {
      "nome": "Nome do script relacionado",
      "relevancia": "Alta/Média/Baixa",
      "motivo": "Por que este script é relevante"
    }
  ],
  "chamadosSimilares": [
    {
      "titulo": "Título do chamado similar encontrado",
      "similaridade": "Alta/Média/Baixa",
      "solucaoAplicada": "Resumo da solução que funcionou"
    }
  ]
}

Se não encontrar nada relevante nas fontes internas, AVISE EXPLICITAMENTE e defina confiancaEstimada como um valor baixo (10-30).

Retorne APENAS o JSON, sem markdown.`;

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    let parsedResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      parsedResponse = {
        analiseInterna: {
          fontesEncontradas: [],
          trechosRelevantes: []
        },
        explicacaoTecnica: content,
        respostasFormais: [],
        confiancaEstimada: 20,
        scriptsRelacionados: [],
        chamadosSimilares: []
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: parsedResponse,
        ticket: {
          id: ticket.id,
          titulo: ticket.titulo,
          estruturante: ticket.estruturante,
          nivel: ticket.nivel
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-suggestions function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
