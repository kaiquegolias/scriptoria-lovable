import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const { query, documentContent, documentTitle, urls, urlContents }: SearchRequest = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from document or URLs
    let contextContent = '';
    let sourceInfo = '';

    if (documentContent) {
      contextContent = documentContent;
      sourceInfo = `Documento: ${documentTitle || 'Arquivo anexado'}`;
    } else if (urlContents && urlContents.length > 0) {
      contextContent = urlContents.map(u => `=== CONTEÚDO DE: ${u.url} ===\n${u.content}`).join('\n\n');
      sourceInfo = `URLs analisadas: ${urlContents.map(u => u.url).join(', ')}`;
    }

    if (!contextContent) {
      return new Response(
        JSON.stringify({ error: 'Nenhum conteúdo fornecido para análise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate content if too large
    const maxContentLength = 80000;
    if (contextContent.length > maxContentLength) {
      contextContent = contextContent.substring(0, maxContentLength) + '\n\n[... conteúdo truncado por limite de tamanho ...]';
    }

    const systemPrompt = `Você é um assistente especializado em análise de documentação técnica do Processo Eletrônico Nacional (PEN) e sistemas governamentais brasileiros.

REGRAS IMPORTANTES:
1. Você DEVE responder EXCLUSIVAMENTE com base no conteúdo fornecido
2. NÃO invente informações que não estejam no documento
3. Se a informação não existir no documento, diga claramente
4. Sempre cite as partes relevantes do documento que fundamentam sua resposta
5. As respostas formais devem ser profissionais e adequadas para comunicação oficial

FORMATO DE RESPOSTA OBRIGATÓRIO:
Você deve retornar um JSON válido com a seguinte estrutura:
{
  "sugestaoResposta1": "Texto da primeira sugestão de resposta formal",
  "sugestaoResposta2": "Texto da segunda sugestão de resposta formal",
  "fundamentacaoTecnica": "Explicação detalhada do porquê dessas respostas, citando trechos do documento",
  "trechosRelevantes": ["trecho 1 do documento", "trecho 2 do documento"],
  "confianca": "alta|media|baixa",
  "observacoes": "Qualquer observação adicional relevante"
}`;

    const userPrompt = `FONTE DA INFORMAÇÃO:
${sourceInfo}

CONTEÚDO DO DOCUMENTO:
${contextContent}

PROBLEMA DO USUÁRIO:
${query}

Analise profundamente o documento acima e forneça:
1. Duas sugestões de resposta formal que posso enviar ao usuário
2. Uma fundamentação técnica baseada exclusivamente no documento
3. Os trechos relevantes que fundamentam a resposta

Retorne APENAS o JSON no formato especificado, sem markdown ou texto adicional.`;

    console.log('Sending request to Lovable AI Gateway...');
    console.log('Query:', query);
    console.log('Content length:', contextContent.length);

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
      // Remove markdown code blocks if present
      const cleanJson = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedResult = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', textContent);
      // Fallback: create structured response from text
      parsedResult = {
        sugestaoResposta1: textContent.substring(0, 1000),
        sugestaoResposta2: 'Não foi possível gerar segunda sugestão estruturada',
        fundamentacaoTecnica: 'Resposta baseada no documento fornecido. A IA não retornou formato estruturado.',
        trechosRelevantes: [],
        confianca: 'media',
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
