/**
 * Busca TODAS as linhas de uma consulta, contornando o limite de 1000 linhas do Supabase.
 * `build` deve retornar uma nova query a cada chamada (com filtros/ordem), sem .range().
 */
export async function fetchAllRows<T = any>(
  build: () => any,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}
