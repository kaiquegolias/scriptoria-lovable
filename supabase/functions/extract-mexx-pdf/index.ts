// Extract MEXX ticket data from PDF using Lovable AI Gateway.
// Input: { pdfText?: string, pageImages?: string[], fileName?: string }
// Output: structured ticket JSON

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type MexxData = {
  numero_chamado: string;
  titulo: string;
  usuario_nome: string;
  usuario_email: string;
  usuario_telefone: string;
  usuario_cpf: string;
  data_abertura: string;
  responsavel: string;
  prioridade: string;
  categoria: string;
  orgao: string;
  descricao: string;
  tem_anexo: boolean;
  sla_atendimento: string;
  sla_solucao: string;
  previsao_solucao: string;
  time_atendimento: string;
  tipo_chamado: string;
  status_portal: string;
  chave_ativacao: string;
  campos_personalizados: Record<string, string>;
};

const EMPTY_DATA: MexxData = {
  numero_chamado: '',
  titulo: '',
  usuario_nome: '',
  usuario_email: '',
  usuario_telefone: '',
  usuario_cpf: '',
  data_abertura: '',
  responsavel: 'KAIQUE MATHEUS NEVES MACHADO',
  prioridade: '',
  categoria: '',
  orgao: '',
  descricao: '',
  tem_anexo: false,
  sla_atendimento: '',
  sla_solucao: '',
  previsao_solucao: '',
  time_atendimento: '',
  tipo_chamado: '',
  status_portal: '',
  chave_ativacao: '',
  campos_personalizados: {},
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

const SYSTEM_PROMPT = `Você é um extrator determinístico de PDFs do Portal MEXX (gestao.gov.br).
Retorne APENAS um JSON válido, sem markdown, com EXATAMENTE estas chaves:
numero_chamado, titulo, usuario_nome, usuario_email, usuario_telefone, usuario_cpf, data_abertura, responsavel, prioridade, categoria, orgao, descricao, tem_anexo, sla_atendimento, sla_solucao, previsao_solucao, time_atendimento, tipo_chamado, status_portal, chave_ativacao, campos_personalizados.

Regras obrigatórias:
- NÃO invente dados. Copie somente valores presentes no PDF/texto; se não existir, use string vazia, exceto responsavel.
- responsavel deve ser sempre "KAIQUE MATHEUS NEVES MACHADO".
- numero_chamado normalmente aparece como "Nº", "N°", "Número", "Chamado", "Ticket" ou no topo do documento.
- titulo deve ser "Chamado MEXX Nº {numero}" quando houver número; caso contrário, "Chamado importado do MEXX".
- usuario_nome é o nome do solicitante/usuário/requerente.
- orgao é o órgão/entidade/unidade do usuário; também pode estar em Campos Personalizados.
- descricao deve conter TODO o campo Descrição/Descrição da solicitação, sem resumir.
- campos_personalizados deve conter TODOS os pares da seção "Campos Personalizados", inclusive Ambiente, Etapa da Ocorrência, Órgão, Versão Módulo, Versão SEI, Evidências do erro foram anexadas.
- tem_anexo deve ser true quando anexos/evidências estiverem indicados como presentes/sim; false quando indicar não/sem anexo.
- Datas devem ficar em ISO local sem timezone, ex: 2026-05-06T15:54:00.`;

const normalizeWhitespace = (value: unknown) => typeof value === 'string'
  ? value.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  : '';

const normalizeDate = (value: unknown) => {
  const text = normalizeWhitespace(value);
  const br = text.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (br) {
    const [, day, month, year, hour = '00', minute = '00', second = '00'] = br;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }
  const iso = text.match(/\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?/);
  return iso?.[0] || '';
};

const extractJson = (raw: string) => {
  let cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
};

const normalizeData = (input: Record<string, unknown>): MexxData => {
  const campos: Record<string, string> = {};
  const rawCampos = input.campos_personalizados;
  if (rawCampos && typeof rawCampos === 'object' && !Array.isArray(rawCampos)) {
    Object.entries(rawCampos as Record<string, unknown>).forEach(([key, value]) => {
      const normalizedKey = normalizeWhitespace(key);
      const normalizedValue = normalizeWhitespace(value);
      if (normalizedKey && normalizedValue) campos[normalizedKey] = normalizedValue;
    });
  }

  const numero = normalizeWhitespace(input.numero_chamado).replace(/^#|^n[º°o.]?\s*/i, '');
  const descricao = normalizeWhitespace(input.descricao);
  const orgao = normalizeWhitespace(input.orgao) || campos['Órgão'] || campos['Orgao'] || campos['Nome do órgão'] || '';
  const temAnexoText = `${normalizeWhitespace(input.tem_anexo)} ${campos['Evidências do erro foram anexadas'] || ''}`;

  return {
    ...EMPTY_DATA,
    numero_chamado: numero,
    titulo: normalizeWhitespace(input.titulo) || (numero ? `Chamado MEXX Nº ${numero}` : 'Chamado importado do MEXX'),
    usuario_nome: normalizeWhitespace(input.usuario_nome),
    usuario_email: normalizeWhitespace(input.usuario_email),
    usuario_telefone: normalizeWhitespace(input.usuario_telefone),
    usuario_cpf: normalizeWhitespace(input.usuario_cpf),
    data_abertura: normalizeDate(input.data_abertura),
    responsavel: 'KAIQUE MATHEUS NEVES MACHADO',
    prioridade: normalizeWhitespace(input.prioridade),
    categoria: normalizeWhitespace(input.categoria),
    orgao,
    descricao,
    tem_anexo: input.tem_anexo === true || /\b(sim|true|possui|anexad[ao]s?|presente)\b/i.test(temAnexoText),
    sla_atendimento: normalizeWhitespace(input.sla_atendimento),
    sla_solucao: normalizeWhitespace(input.sla_solucao),
    previsao_solucao: normalizeDate(input.previsao_solucao),
    time_atendimento: normalizeWhitespace(input.time_atendimento),
    tipo_chamado: normalizeWhitespace(input.tipo_chamado),
    status_portal: normalizeWhitespace(input.status_portal),
    chave_ativacao: normalizeWhitespace(input.chave_ativacao),
    campos_personalizados: campos,
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { pdfText, pageImages, fileName } = await req.json();
    const images = Array.isArray(pageImages)
      ? pageImages.filter((img) => typeof img === 'string' && img.startsWith('data:image/')).slice(0, 6)
      : [];
    const hasImages = images.length > 0;
    const hasText = typeof pdfText === 'string' && pdfText.trim().length >= 30;

    if (!hasImages && !hasText) {
      return jsonResponse({ error: 'Não recebi conteúdo suficiente para analisar o PDF.', fallback: true });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return jsonResponse({ error: 'LOVABLE_API_KEY ausente', fallback: true });

    const content: Array<Record<string, unknown>> = [
      {
        type: 'text',
        text: `Arquivo: ${fileName || 'PDF MEXX'}\n${hasText ? `\nTexto extraído pelo navegador:\n${String(pdfText).slice(0, 70000)}` : '\nO texto extraído pelo navegador veio insuficiente; leia as imagens das páginas via OCR.'}\n\nExtraia os dados do chamado MEXX e retorne somente o JSON solicitado.`,
      },
    ];

    images.forEach((imageUrl, index) => {
      content.push({ type: 'text', text: `Página ${index + 1} do PDF MEXX:` });
      content.push({ type: 'image_url', image_url: { url: imageUrl } });
    });

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('Lovable AI Gateway error:', resp.status, errText);
      return jsonResponse({ error: 'Falha na extração via IA', detail: errText, fallback: true });
    }

    const gatewayData = await resp.json();
    const finishReason = gatewayData?.choices?.[0]?.finish_reason;
    if (finishReason === 'length' || finishReason === 'max_tokens') {
      return jsonResponse({ error: 'Resposta da IA foi truncada. Tente um PDF menor.', fallback: true });
    }

    const text = gatewayData?.choices?.[0]?.message?.content;
    if (!text) return jsonResponse({ error: 'IA não retornou conteúdo', fallback: true });

    try {
      const parsed = extractJson(text);
      return jsonResponse({ data: normalizeData(parsed) });
    } catch (_e) {
      console.error('JSON parse fail:', text);
      return jsonResponse({ error: 'Resposta da IA inválida', raw: text, fallback: true });
    }
  } catch (e) {
    console.error('extract-mexx-pdf error:', e);
    return jsonResponse({ error: e instanceof Error ? e.message : 'Erro desconhecido', fallback: true });
  }
});