/** Calendar month range in UTC for filtering `timestamptz` transaction_date. */
export function monthBoundsUtc(ym: string): { start: string; end: string } | null {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const start = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0)).toISOString();
  const end = new Date(Date.UTC(y, mo, 0, 23, 59, 59, 999)).toISOString();
  return { start, end };
}
