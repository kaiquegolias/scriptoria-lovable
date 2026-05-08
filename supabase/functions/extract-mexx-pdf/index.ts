// Extract MEXX ticket data from a PDF using Gemini (native PDF support).
// Input: { pdfBase64: string }
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
    const { pdfBase64 } = await req.json();
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'pdfBase64 obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY ausente');

    // Use Gemini native API for PDF support
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: 'user',
              parts: [
                { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
                { text: 'Extraia os dados do chamado MEXX deste PDF e retorne em JSON conforme o schema fornecido.' }
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: EXTRACTION_SCHEMA,
            temperature: 0.1,
          },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Gemini error:', resp.status, errText);
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
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
