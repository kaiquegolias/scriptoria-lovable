// Parser de consultas estilo Splunk para o módulo Supervisor

export interface ParsedQuery {
  filters: QueryFilter[];
  textSearch: string;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
}

export interface QueryFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string;
  logic?: 'AND' | 'OR';
}

const FIELD_MAPPINGS: Record<string, string> = {
  'type': 'event_type',
  'tipo': 'event_type',
  'user': 'user_email',
  'usuario': 'user_email',
  'severity': 'severity',
  'severidade': 'severity',
  'status': 'severity',
  'origin': 'origin',
  'origem': 'origin',
  'message': 'message',
  'mensagem': 'message',
  'entity': 'entity_type',
  'entidade': 'entity_type',
  'script': 'entity_type',
  'chamado': 'entity_type',
};

const SEVERITY_MAPPINGS: Record<string, string> = {
  'erro': 'error',
  'error': 'error',
  'crítico': 'critical',
  'critico': 'critical',
  'critical': 'critical',
  'aviso': 'warning',
  'warning': 'warning',
  'info': 'info',
  'informação': 'info',
  'informacao': 'info',
};

const EVENT_TYPE_MAPPINGS: Record<string, string> = {
  'login': 'user_login',
  'logout': 'user_logout',
  'signup': 'user_signup',
  'cadastro': 'user_signup',
  'chamado_criado': 'chamado_created',
  'chamado_atualizado': 'chamado_updated',
  'chamado_deletado': 'chamado_deleted',
  'chamado_status': 'chamado_status_changed',
  'script_criado': 'script_created',
  'script_atualizado': 'script_updated',
  'script_deletado': 'script_deleted',
  'script_executado': 'script_executed',
  'erro': 'error',
  'error': 'error',
  'sistema': 'system',
  'system': 'system',
};

export function parseQuery(queryString: string): ParsedQuery {
  const result: ParsedQuery = {
    filters: [],
    textSearch: '',
  };

  if (!queryString.trim()) {
    return result;
  }

  // Tokenize the query
  const tokens = tokenize(queryString);
  let currentLogic: 'AND' | 'OR' = 'AND';
  const textParts: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check for logic operators
    if (token.toUpperCase() === 'AND') {
      currentLogic = 'AND';
      continue;
    }
    if (token.toUpperCase() === 'OR') {
      currentLogic = 'OR';
      continue;
    }

    // Check for date range
    if (token.toLowerCase().startsWith('date:') || token.toLowerCase().startsWith('data:')) {
      const dateValue = token.split(':')[1];
      result.dateRange = parseDateRange(dateValue);
      continue;
    }

    // Check for field:value or field=value patterns
    const fieldMatch = token.match(/^(\w+)([:=!><]+)(.+)$/);
    if (fieldMatch) {
      const [, fieldRaw, operatorRaw, valueRaw] = fieldMatch;
      const field = FIELD_MAPPINGS[fieldRaw.toLowerCase()] || fieldRaw;
      const operator = parseOperator(operatorRaw);
      let value = valueRaw.replace(/^["']|["']$/g, ''); // Remove quotes

      // Map values for known fields
      if (field === 'severity') {
        value = SEVERITY_MAPPINGS[value.toLowerCase()] || value;
      }
      if (field === 'event_type') {
        value = EVENT_TYPE_MAPPINGS[value.toLowerCase()] || value;
      }

      result.filters.push({
        field,
        operator,
        value,
        logic: result.filters.length > 0 ? currentLogic : undefined,
      });
      currentLogic = 'AND'; // Reset to AND after adding a filter
      continue;
    }

    // If not a filter, add to text search
    textParts.push(token.replace(/^["']|["']$/g, ''));
  }

  result.textSearch = textParts.join(' ');
  return result;
}

function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (const char of query) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      current += char;
      tokens.push(current);
      current = '';
      quoteChar = '';
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function parseOperator(op: string): QueryFilter['operator'] {
  switch (op) {
    case '!=':
    case '<>':
      return 'not_equals';
    case '>':
      return 'gt';
    case '<':
      return 'lt';
    case '>=':
      return 'gte';
    case '<=':
      return 'lte';
    case '~':
    case '*':
      return 'contains';
    default:
      return 'equals';
  }
}

function parseDateRange(value: string): ParsedQuery['dateRange'] {
  const now = new Date();
  const result: ParsedQuery['dateRange'] = {};

  // Handle relative dates
  if (value.includes('h') || value.includes('hora')) {
    const hours = parseInt(value);
    if (!isNaN(hours)) {
      result.start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    }
  } else if (value.includes('d') || value.includes('dia')) {
    const days = parseInt(value);
    if (!isNaN(days)) {
      result.start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
  } else if (value.includes('m') || value.includes('min')) {
    const minutes = parseInt(value);
    if (!isNaN(minutes)) {
      result.start = new Date(now.getTime() - minutes * 60 * 1000);
    }
  } else if (value.includes('w') || value.includes('semana')) {
    const weeks = parseInt(value);
    if (!isNaN(weeks)) {
      result.start = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    }
  } else if (value === 'hoje' || value === 'today') {
    result.start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (value === 'ontem' || value === 'yesterday') {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    result.start = yesterday;
    result.end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else {
    // Try to parse as absolute date range (start..end)
    const parts = value.split('..');
    if (parts.length === 2) {
      const startDate = new Date(parts[0]);
      const endDate = new Date(parts[1]);
      if (!isNaN(startDate.getTime())) result.start = startDate;
      if (!isNaN(endDate.getTime())) result.end = endDate;
    } else {
      // Single date
      const singleDate = new Date(value);
      if (!isNaN(singleDate.getTime())) {
        result.start = singleDate;
      }
    }
  }

  return result;
}

export function buildSupabaseQuery(parsed: ParsedQuery) {
  const conditions: string[] = [];
  const params: Record<string, any> = {};

  parsed.filters.forEach((filter, index) => {
    const paramName = `p${index}`;
    let condition = '';

    switch (filter.operator) {
      case 'equals':
        condition = `${filter.field}.eq.${filter.value}`;
        break;
      case 'not_equals':
        condition = `${filter.field}.neq.${filter.value}`;
        break;
      case 'contains':
        condition = `${filter.field}.ilike.*${filter.value}*`;
        break;
      case 'gt':
        condition = `${filter.field}.gt.${filter.value}`;
        break;
      case 'lt':
        condition = `${filter.field}.lt.${filter.value}`;
        break;
      case 'gte':
        condition = `${filter.field}.gte.${filter.value}`;
        break;
      case 'lte':
        condition = `${filter.field}.lte.${filter.value}`;
        break;
    }

    if (condition) {
      conditions.push(condition);
    }
  });

  return { conditions, params };
}

export function getQueryHelp(): string[] {
  return [
    'Exemplos de consultas:',
    '  type=erro - Buscar por tipo de evento',
    '  severity=critical - Buscar por severidade',
    '  user=email@exemplo.com - Buscar por usuário',
    '  origin=chamados - Buscar por origem',
    '  message~texto - Buscar texto na mensagem',
    '  date:24h - Últimas 24 horas',
    '  date:7d - Últimos 7 dias',
    '  date:hoje - Eventos de hoje',
    '',
    'Operadores lógicos:',
    '  type=erro AND severity=critical',
    '  type=login OR type=logout',
    '',
    'Operadores de comparação:',
    '  = ou : igual',
    '  != diferente',
    '  ~ contém',
    '  > maior que',
    '  < menor que',
  ];
}
