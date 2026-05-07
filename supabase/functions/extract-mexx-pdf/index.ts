// Extract MEXX ticket data from a PDF using Gemini (native PDF support).
// Input: { pdfBase64: string }
// Output: structured ticket JSON

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    numero_chamado: { type: 'string', description: 'Número do chamado (ex: 48464666)' },
    titulo: { type: 'string', description: 'Título / assunto do chamado' },
    usuario_nome: { type: 'string' },
    usuario_email: { type: 'string' },
    usuario_telefone: { type: 'string' },
    usuario_cpf: { type: 'string' },
    data_abertura: { type: 'string', description: 'Data de abertura no formato ISO 8601' },
    responsavel: { type: 'string', description: 'Sempre "KAIQUE MATHEUS NEVES MACHADO" se aparecer' },
    prioridade: { type: 'string', description: 'Baixa, Média, Alta, Urgente' },
    categoria: { type: 'string' },
    orgao: { type: 'string', description: 'Órgão / Organização (ex: Processo Eletrônico Nacional)' },
    descricao: { type: 'string', description: 'Descrição completa do problema relatado' },
    tem_anexo: { type: 'boolean' },
    sla_atendimento: { type: 'string' },
    sla_solucao: { type: 'string' },
    previsao_solucao: { type: 'string', description: 'Data ISO 8601 ou string vazia' },
    time_atendimento: { type: 'string' },
    tipo_chamado: { type: 'string', description: 'Incidente, Solicitação, etc.' },
    status_portal: { type: 'string' },
    chave_ativacao: { type: 'string' },
    campos_personalizados: {
      type: 'object',
      description: 'Objeto chave-valor com TODOS os campos personalizados encontrados (Ambiente, Etapa da Ocorrência, Órgão, Versão Módulo, Versão SEI, Evidências, etc.)',
      additionalProperties: { type: 'string' }
    }
  },
  required: ['numero_chamado', 'titulo', 'descricao', 'campos_personalizados']
};

const SYSTEM_PROMPT = `Você é um extrator especializado em PDFs do Portal MEXX (gestao.gov.br).
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
