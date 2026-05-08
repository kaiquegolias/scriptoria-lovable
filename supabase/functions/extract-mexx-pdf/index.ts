// Extract MEXX ticket data from PDF text using Lovable AI Gateway.
// Input: { pdfText: string, fileName?: string }
// Output: structured ticket JSON

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um extrator especializado em PDFs do Portal MEXX (gestao.gov.br).
Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) com EXATAMENTE estas chaves:
{
  "numero_chamado": string,
  "titulo": string,
  "usuario_nome": string,
  "usuario_email": string,
  "usuario_telefone": string,
  "usuario_cpf": string,
  "data_abertura": string (ISO 8601 ou ""),
  "responsavel": string,
  "prioridade": string,
  "categoria": string,
  "orgao": string,
  "descricao": string,
  "tem_anexo": boolean,
  "sla_atendimento": string,
  "sla_solucao": string,
  "previsao_solucao": string,
  "time_atendimento": string,
  "tipo_chamado": string,
  "status_portal": string,
  "chave_ativacao": string,
  "campos_personalizados": { [chave: string]: string }
}

Regras:
Extraia TODOS os campos solicitados do chamado contido no PDF.
- O número do chamado normalmente aparece como "Nº XXXXXXXX" no topo.
- O responsável é sempre KAIQUE MATHEUS NEVES MACHADO se aparecer.
- A descrição deve incluir TODO o texto do campo "Descrição", preservando quebras de linha lógicas.
- Em campos_personalizados, capture TUDO que estiver na seção "Campos Personalizados" (ex: Ambiente, Etapa da Ocorrência, Órgão, Versão Módulo, Versão SEI, Evidências do erro foram anexadas).
- tem_anexo deve ser true se houver indicação de anexos no chamado.
- Se um campo não existir, retorne string vazia (ou false para boolean).
- Datas devem estar em ISO 8601 (ex: 2026-05-06T15:54:00).`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { pdfText, fileName } = await req.json();
    if (!pdfText || typeof pdfText !== 'string' || pdfText.trim().length < 30) {
      return new Response(JSON.stringify({ error: 'Não consegui ler texto suficiente deste PDF. Verifique se ele não está escaneado como imagem.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY ausente');

    const userPrompt = `Arquivo: ${fileName || 'PDF MEXX'}

TEXTO EXTRAÍDO DO PDF:
${pdfText.slice(0, 70000)}

Extraia os dados do chamado MEXX e retorne somente o JSON solicitado.`;

    const resp = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          generationConfig: {
            temperature: 0.1,
          },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Lovable AI Gateway error:', resp.status, errText);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em instantes.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Falha na extração via IA', detail: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      console.error('Gemini empty response:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'IA não retornou conteúdo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse fail:', text);
      return new Response(JSON.stringify({ error: 'Resposta da IA inválida', raw: text }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('extract-mexx-pdf error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
