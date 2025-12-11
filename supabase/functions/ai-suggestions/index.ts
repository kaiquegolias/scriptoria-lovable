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

    // Fetch user's scripts
    const { data: scripts } = await supabase
      .from("scripts")
      .select("id, nome, situacao, modelo, estruturante, nivel")
      .eq("user_id", userId);

    // Fetch scripts from library
    const { data: libraryScripts } = await supabase
      .from("scripts_library")
      .select("id, title, description, content, tags, sistema");

    // Fetch closed tickets with solutions (for pattern matching)
    const { data: closedTickets } = await supabase
      .from("chamados")
      .select("id, titulo, acompanhamento, classificacao, estruturante, nivel")
      .eq("status", "resolvido")
      .eq("user_id", userId)
      .limit(20);

    // Fetch followups from closed tickets for learning
    const closedTicketIds = (closedTickets || []).map(t => t.id);
    const { data: followups } = await supabase
      .from("ticket_followups")
      .select("ticket_id, content, type")
      .in("ticket_id", closedTicketIds.length > 0 ? closedTicketIds : ["00000000-0000-0000-0000-000000000000"])
      .eq("type", "ultimo_acompanhamento");

    // Fetch WikiPEN knowledge base documents
    const { data: kbDocs } = await supabase
      .from("kb_documents")
      .select("title, content, category, keywords")
      .eq("source", "wiki_pen")
      .limit(100);

    // Build context for AI
    const scriptsContext = (scripts || []).map(s => 
      `Script: ${s.nome}\nSituação: ${s.situacao}\nModelo de resposta: ${s.modelo}\nEstruturante: ${s.estruturante}\nNível: ${s.nivel}`
    ).join("\n\n---\n\n");

    const libraryContext = (libraryScripts || []).map(s =>
      `Script da Biblioteca: ${s.title}\nDescrição: ${s.description || 'N/A'}\nConteúdo: ${s.content}\nTags: ${(s.tags || []).join(", ")}`
    ).join("\n\n---\n\n");

    const closedTicketsContext = (closedTickets || []).map(t => {
      const followup = (followups || []).find(f => f.ticket_id === t.id);
      return `Chamado Resolvido: ${t.titulo}\nClassificação: ${t.classificacao || 'N/A'}\nEstruturante: ${t.estruturante}\nNível: ${t.nivel}\nAcompanhamento: ${t.acompanhamento}\nSolução aplicada: ${followup?.content || 'N/A'}`;
    }).join("\n\n---\n\n");

    // WikiPEN knowledge base context
    const wikiPenContext = (kbDocs || []).map(doc =>
      `DOCUMENTO WIKIPEN: ${doc.title}\nCategoria: ${doc.category || 'Geral'}\nPalavras-chave: ${(doc.keywords || []).join(", ")}\nConteúdo: ${doc.content}`
    ).join("\n\n===\n\n");

    const systemPrompt = `Você é um assistente especializado em suporte técnico para sistemas governamentais brasileiros (PEN e PNCP).

BASE DE CONHECIMENTO WIKIPEN (DOCUMENTAÇÃO OFICIAL):
${wikiPenContext || "Documentação não disponível"}

Sua tarefa é analisar um chamado de suporte e fornecer:
1. Uma explicação técnica clara do problema baseada na documentação oficial
2. Três respostas formais sugeridas que podem ser enviadas ao usuário

REGRAS IMPORTANTES:
- Use linguagem formal e profissional
- As respostas devem ser em português brasileiro
- Considere o contexto do estruturante (${ticket.estruturante}) e nível (${ticket.nivel})
- PRIORIZE informações da WikiPEN para fundamentar suas respostas
- Se houver chamados similares resolvidos, utilize as soluções que funcionaram
- Cite referências da documentação quando aplicável

SCRIPTS DISPONÍVEIS DO USUÁRIO:
${scriptsContext || "Nenhum script disponível"}

SCRIPTS DA BIBLIOTECA:
${libraryContext || "Nenhum script na biblioteca"}

HISTÓRICO DE CHAMADOS RESOLVIDOS:
${closedTicketsContext || "Nenhum histórico disponível"}`;

    const userPrompt = `Analise o seguinte chamado e forneça sugestões:

TÍTULO: ${ticket.titulo}
ESTRUTURANTE: ${ticket.estruturante}
NÍVEL: ${ticket.nivel}
CLASSIFICAÇÃO: ${ticket.classificacao || "Não definida"}
ACOMPANHAMENTO/DESCRIÇÃO: ${ticket.acompanhamento}
LINKS: ${(ticket.links || []).join(", ") || "Nenhum"}

Por favor, responda no seguinte formato JSON:
{
  "explicacaoTecnica": "Explicação técnica detalhada do problema...",
  "respostasFormais": [
    "Primeira resposta formal sugerida...",
    "Segunda resposta formal sugerida...",
    "Terceira resposta formal sugerida..."
  ],
  "scriptsRelacionados": [
    {
      "nome": "Nome do script relacionado",
      "relevancia": "Alta/Média/Baixa",
      "motivo": "Por que este script é relevante"
    }
  ],
  "chamadosSimilares": [
    {
      "titulo": "Título do chamado similar",
      "similaridade": "Alta/Média/Baixa",
      "solucaoAplicada": "Resumo da solução que funcionou"
    }
  ]
}`;

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

    // Try to parse JSON from response
    let parsedResponse;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      parsedResponse = {
        explicacaoTecnica: content,
        respostasFormais: [],
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
