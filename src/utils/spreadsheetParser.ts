import ExcelJS from 'exceljs';

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: string[][];
}

const cellText = (v: any): string => {
  if (v == null) return '';
  if (v instanceof Date) return v.toLocaleDateString('pt-BR');
  if (typeof v === 'object') {
    if ('richText' in v) return (v.richText || []).map((r: any) => r.text).join('');
    if ('text' in v) return String(v.text);
    if ('result' in v) return cellText(v.result);
    if ('hyperlink' in v) return String(v.hyperlink);
    return '';
  }
  return String(v).replace(/\s+/g, ' ').trim();
};

/** CSV com detecção automática de separador (; , ou tab) e suporte a aspas. */
export const parseCsv = (text: string): string[][] => {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/)[0] || '';
  const sep = [';', '\t', ','].sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (q) {
      if (ch === '"' && clean[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur.trim()); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cur.trim()); cur = '';
      if (row.some(c => c)) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur.trim());
  if (row.some(c => c)) rows.push(row);
  return rows;
};

const toSheet = (name: string, matrix: string[][]): ParsedSheet | null => {
  const nonEmpty = matrix.filter(r => r.some(c => c));
  if (!nonEmpty.length) return null;
  const width = Math.max(...nonEmpty.map(r => r.length));
  const headers = Array.from({ length: width }, (_, i) => nonEmpty[0][i] || `Coluna ${i + 1}`);
  return { name, headers, rows: nonEmpty.slice(1) };
};

export async function parseSpreadsheet(file: File): Promise<ParsedSheet[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt') || file.type === 'text/csv') {
    const s = toSheet(file.name, parseCsv(await file.text()));
    return s ? [s] : [];
  }
  if (lower.endsWith('.xls')) {
    throw new Error('Formato .xls antigo não é suportado. Salve como .xlsx ou .csv no Excel e envie novamente.');
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const out: ParsedSheet[] = [];
  wb.eachSheet(ws => {
    const matrix: string[][] = [];
    ws.eachRow({ includeEmpty: false }, row => {
      const vals = (row.values as any[]).slice(1).map(cellText);
      matrix.push(vals);
    });
    const s = toSheet(ws.name, matrix);
    if (s) out.push(s);
  });
  return out;
}

/** Converte em texto "uma linha por registro", legível pela IA: "Linha 2 | Coluna: valor | ..." */
export const sheetToRecordText = (s: ParsedSheet): string[] =>
  s.rows.map((r, i) =>
    `Linha ${i + 2} | ` + s.headers.map((h, j) => (r[j] ? `${h}: ${r[j]}` : '')).filter(Boolean).join(' | ')
  ).filter(l => l.includes(':'));

export const isSpreadsheetFile = (f: File) => /\.(xlsx|xls|csv)$/i.test(f.name);
