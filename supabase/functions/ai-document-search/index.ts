import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  documentContent?: string;
  documentTitle?: string;
  urls?: string[];
  urlContents?: Array<{ url: string; content: string }>;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { query, documentContent, documentTitle, urls, urlContents, userId }: SearchRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch internal sources for priority search
    let scriptsContext = '';
    let modelosContext = '';
    let kbContext = '';

    if (userId) {
      // Fetch user's scripts (Modelos de Resposta para Chamados - HIGHEST PRIORITY)
      const { data: scripts } = await supabase
        .from("scripts")
        .select("id, nome, situacao, modelo, estruturante, nivel")
        .eq("user_id", userId);

      modelosContext = (scripts || []).map(s => 
        `[MODELO] Script: ${s.nome}\nSituação: ${s.situacao}\nModelo de resposta: ${s.modelo}\nEstruturante: ${s.estruturante}\nNível: ${s.nivel}`
      ).join("\n\n---\n\n");

      // Fetch scripts from library (SECOND PRIORITY)
      const { data: libraryScripts } = await supabase
        .from("scripts_library")
        .select("id, title, description, content, tags");

      scriptsContext = (libraryScripts || []).map(s =>
        `[SCRIPT_BIBLIOTECA] Título: ${s.title}\nDescrição: ${s.description || 'N/A'}\nConteúdo: ${s.content}\nTags: ${(s.tags || []).join(", ")}`
      ).join("\n\n---\n\n");
    }

    // Fetch KB documents (LOWEST PRIORITY - only when missing in models/scripts)
    const { data: kbDocs } = await supabase
      .from("kb_documents")
      .select("title, content, category, keywords")
      .limit(50);

    kbContext = (kbDocs || []).map(doc =>
      `[KB] ${doc.title}\nCategoria: ${doc.category || 'Geral'}\nPalavras-chave: ${(doc.keywords || []).join(", ")}\nConteúdo: ${doc.content}`
    ).join("\n\n===\n\n");

    // Build context from document or URLs (PDF - THIRD PRIORITY after models/scripts)
    let documentContext = '';
    let sourceInfo = '';

    if (documentContent) {
      documentContext = `[PDF/DOCUMENTO ANEXADO]\n${documentContent}`;
      sourceInfo = `Documento: ${documentTitle || 'Arquivo anexado'}`;
    } else if (urlContents && urlContents.length > 0) {
      documentContext = urlContents.map(u => `[URL] ${u.url}\n${u.content}`).join('\n\n');
      sourceInfo = `URLs analisadas: ${urlContents.map(u => u.url).join(', ')}`;
    }

    // Truncate content if too large
    const maxContentLength = 80000;
    let fullContext = `
PRIORIDADE 1 - MODELOS DE RESPOSTA PARA CHAMADOS (Scripts do usuário):
${modelosContext || "Nenhum modelo de resposta disponível"}

PRIORIDADE 2 - SCRIPTS DA BIBLIOTECA:
${scriptsContext || "Nenhum script na biblioteca"}

PRIORIDADE 3 - DOCUMENTO/PDF ANEXADO:
${documentContext || "Nenhum documento anexado"}

PRIORIDADE 4 - BIBLIOTECA KB (usar apenas se não encontrar nas fontes acima):
${kbContext || "KB vazia"}
`;

    if (fullContext.length > maxContentLength) {
      fullContext = fullContext.substring(0, maxContentLength) + '\n\n[... conteúdo truncado por limite de tamanho ...]';
    }

    const systemPrompt = `Você é um assistente especializado em análise de documentação técnica do Processo Eletrônico Nacional (PEN) e sistemas governamentais brasileiros.

REGRAS CRÍTICAS DE COMPORTAMENTO:

1. NUNCA INVENTE INFORMAÇÃO
   - Se não encontrar conteúdo relevante nas fontes internas, diga EXPLICITAMENTE:
   "Não encontrei conteúdo relevante nas suas fontes internas para responder com precisão."

2. ORDEM DE PRIORIDADE DE BUSCA (OBRIGATÓRIO):
   1º) Modelos de Resposta para Chamados (Scripts do usuário) - FONTE PRINCIPAL
   2º) Scripts da Biblioteca
   3º) PDF/Documento anexado - apoio secundário
   4º) Biblioteca KB - consultar apenas quando faltar nas fontes anteriores

3. NUNCA REESCREVA por conta própria - sua função é LOCALIZAR, EXTRAIR e MONTAR respostas

4. SEMPRE informe a confiança estimada em PERCENTUAL baseada em:
   - Quantidade de evidências encontradas
   - Correspondência textual com termos pesquisados
   - Similaridade com Modelos de Resposta
   - Presença de termos-chave nos scripts

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "analiseInterna": {
    "fontesEncontradas": ["Modelos", "Scripts", "PDF", "KB"],
    "trechosRelevantes": ["trecho 1 encontrado", "trecho 2 encontrado"]
  },
  "explicacaoTecnica": "Explicação construída a partir das fontes internas",
  "respostasFormais": [
    "Modelo 1 - extraído prioritariamente dos Modelos de Resposta",
    "Modelo 2 - baseado nos scripts/documentação",
    "Modelo 3 - alternativa formal"
  ],
  "confiancaEstimada": 75,
  "observacoes": "Informações adicionais relevantes"
}`;

    const userPrompt = `CONTEXTO DAS FONTES INTERNAS:
${fullContext}

PROBLEMA DO USUÁRIO:
${query}

INSTRUÇÕES:
1. Busque PRIMEIRO nos Modelos de Resposta para Chamados
2. Depois vasculhe a aba Scripts
3. Analise o PDF apenas como apoio secundário
4. Consulte KB somente quando faltar informação

Gere:
- Análise interna (fontes encontradas e trechos)
- Explicação técnica baseada nas fontes
- 3 RESPOSTAS FORMAIS (extraídas dos modelos quando possível, NÃO inventadas)
- Confiança estimada em PERCENTUAL (0-100)

Se não encontrar nada relevante, AVISE EXPLICITAMENTE.

Retorne APENAS o JSON no formato especificado, sem markdown.`;

    console.log('Sending request to Lovable AI Gateway...');
    console.log('Query:', query);
    console.log('Has models:', !!modelosContext);
    console.log('Has scripts:', !!scriptsContext);
    console.log('Has document:', !!documentContext);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const textContent = data.choices?.[0]?.message?.content;
    if (!textContent) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse JSON response
    let parsedResult;
    try {
      const cleanJson = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', textContent);
      parsedResult = {
        analiseInterna: {
          fontesEncontradas: [],
          trechosRelevantes: []
        },
        explicacaoTecnica: textContent.substring(0, 1000),
        respostasFormais: ['Não foi possível gerar resposta estruturada'],
        confiancaEstimada: 20,
        observacoes: 'Resposta processada em formato alternativo'
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: parsedResult,
        sourceInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-document-search:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
