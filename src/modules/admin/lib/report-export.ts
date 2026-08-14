// Fetches every page of a paginated list endpoint, for one-off "download the
// whole thing" report actions — the regular list/table views intentionally
// stay paginated server-side, this is just for export buttons.
// `hardCap` bounds worst-case requests if a report's filters are too broad
// (e.g. no academic year chosen) rather than looping unbounded.
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{ data: T[]; meta: { total: number; totalPages: number } }>,
  limit = 100,
  hardCap = 3000,
): Promise<{ rows: T[]; truncated: boolean }> {
  const first = await fetchPage(1, limit);
  const rows = [...first.data];
  const cappedPages = Math.ceil(hardCap / limit);
  const pagesToFetch = Math.min(first.meta.totalPages, cappedPages);

  for (let page = 2; page <= pagesToFetch; page++) {
    const next = await fetchPage(page, limit);
    rows.push(...next.data);
  }

  return { rows, truncated: first.meta.totalPages > cappedPages };
}
