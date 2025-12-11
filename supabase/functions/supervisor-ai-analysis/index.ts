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
    const { analysisType, metrics } = await req.json();
    
    if (!analysisType || !metrics) {
      return new Response(
        JSON.stringify({ error: "analysisType and metrics are required" }),
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

    // Check for cached analysis (1 hour cache)
    const { data: cachedAnalysis } = await supabase
      .from("ai_analysis_cache")
      .select("*")
      .eq("analysis_type", analysisType)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cachedAnalysis) {
      console.log("Returning cached analysis");
      return new Response(
        JSON.stringify({
          success: true,
          analysis: cachedAnalysis.analysis_result,
          cached: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recent logs for analysis
    const { data: recentLogs } = await supabase
      .from("system_logs")
      .select("event_type, severity, message, timestamp")
      .order("timestamp", { ascending: false })
      .limit(100);

    // Fetch alerts data
    const { data: alerts } = await supabase
      .from("alerts")
      .select("name, status, trigger_count, last_triggered_at")
      .eq("status", "triggered")
      .limit(10);

    // Fetch kb_documents for WikiPEN context
    const { data: kbDocs } = await supabase
      .from("kb_documents")
      .select("title, content, category")
      .eq("source", "wiki_pen")
      .limit(50);

    const kbContext = (kbDocs || []).map(doc => 
      `Documento: ${doc.title}\nCategoria: ${doc.category || 'Geral'}\nConteúdo: ${doc.content?.substring(0, 500)}...`
    ).join("\n\n---\n\n");

    const logsContext = (recentLogs || []).map(log =>
      `[${log.severity}] ${log.event_type}: ${log.message}`
    ).join("\n");

    const alertsContext = (alerts || []).map(alert =>
      `Alerta: ${alert.name} (Status: ${alert.status}, Disparos: ${alert.trigger_count})`
    ).join("\n");

    const systemPrompt = `Você é um analista de sistemas especializado em monitoramento e observabilidade para sistemas governamentais brasileiros (PEN/PNCP).

BASE DE CONHECIMENTO WIKIPEN:
${kbContext || "Nenhuma documentação carregada"}

Sua tarefa é analisar métricas do sistema e fornecer insights acionáveis em português brasileiro.

MÉTRICAS ATUAIS DO SISTEMA:
- Chamados Abertos: ${metrics.chamadosAbertos || 0}
- Chamados Em Andamento: ${metrics.chamadosEmAndamento || 0}
- Chamados Resolvidos: ${metrics.chamadosResolvidos || 0}
- Total de Chamados: ${metrics.totalChamados || 0}
- Scripts Executados (24h): ${metrics.scriptsExecutados24h || 0}
- Scripts Executados (Semana): ${metrics.scriptsExecutadosSemana || 0}
- Taxa de Sucesso Scripts: ${metrics.scriptsSuccesso || 0}
- Logs nas Últimas 24h: ${metrics.logsUltimas24h || 0}
- Erros nas Últimas 24h: ${metrics.errosUltimas24h || 0}
- Erros Críticos: ${metrics.errosCriticos || 0}
- Alertas Ativos: ${metrics.alertasAtivos || 0}
- Alertas Disparados: ${metrics.alertasDisparados || 0}

LOGS RECENTES:
${logsContext || "Sem logs recentes"}

ALERTAS ATIVOS:
${alertsContext || "Nenhum alerta ativo"}`;

    let userPrompt = "";
    
    if (analysisType === "dashboard") {
      userPrompt = `Analise as métricas do dashboard e forneça:

1. **Resumo Executivo**: Um parágrafo resumindo a saúde geral do sistema
2. **Pontos de Atenção**: Liste os 3-5 principais pontos que requerem atenção imediata
3. **Tendências**: Identifique padrões ou tendências importantes
4. **Recomendações**: Sugira 3-5 ações concretas para melhorar o sistema
5. **Score de Saúde**: De 0 a 100, qual o score de saúde do sistema?

Responda em formato JSON:
{
  "resumoExecutivo": "...",
  "pontosAtencao": [{"titulo": "...", "descricao": "...", "prioridade": "alta|media|baixa"}],
  "tendencias": [{"titulo": "...", "descricao": "..."}],
  "recomendacoes": [{"acao": "...", "impacto": "...", "esforco": "baixo|medio|alto"}],
  "scoresSaude": {"geral": 85, "chamados": 90, "scripts": 80, "erros": 75}
}`;
    } else if (analysisType === "logs") {
      userPrompt = `Analise os logs do sistema e identifique:

1. **Padrões de Erro**: Erros recorrentes ou anomalias
2. **Eventos Críticos**: Eventos que requerem ação imediata
3. **Correlações**: Possíveis correlações entre eventos
4. **Sugestões de Investigação**: O que investigar primeiro

Responda em formato JSON:
{
  "padroesErro": [{"tipo": "...", "frequencia": "...", "descricao": "..."}],
  "eventosCriticos": [{"evento": "...", "impacto": "...", "acao": "..."}],
  "correlacoes": [{"eventos": ["...", "..."], "analise": "..."}],
  "sugestoesInvestigacao": [{"area": "...", "motivo": "...", "prioridade": "alta|media|baixa"}]
}`;
    } else if (analysisType === "alerts") {
      userPrompt = `Analise os alertas do sistema e forneça:

1. **Status dos Alertas**: Resumo do estado atual dos alertas
2. **Alertas Críticos**: Quais alertas precisam de ação imediata
3. **Configuração**: Sugestões para melhorar a configuração de alertas
4. **Prevenção**: Como prevenir futuros disparos

Responda em formato JSON:
{
  "statusGeral": "...",
  "alertasCriticos": [{"nome": "...", "urgencia": "...", "acaoRecomendada": "..."}],
  "sugestoesConfiguracao": [{"alerta": "...", "sugestao": "..."}],
  "prevencao": [{"cenario": "...", "acao": "..."}]
}`;
    }

    console.log("Calling AI gateway for supervisor analysis:", analysisType);

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

    // Parse JSON from response
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
      parsedResponse = { raw: content };
    }

    // Cache the analysis (expires in 1 hour)
    await supabase.from("ai_analysis_cache").insert({
      analysis_type: analysisType,
      metrics_snapshot: metrics,
      analysis_result: parsedResponse,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        analysis: parsedResponse,
        cached: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in supervisor-ai-analysis function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
