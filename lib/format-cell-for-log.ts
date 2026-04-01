/** Compact string for warnings / logs (Excel cell values, etc.). */
export function formatCellForLog(value: unknown, maxLen = 96): string {
  if (value === undefined) return '(undefined)';
  if (value === null) return 'null';
  if (value === '') return '(empty string)';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (!Number.isFinite(value)) return String(value);
    return String(value);
  }
  const s =
    typeof value === 'string' ? value : JSON.stringify(value as object);
  const trimmed = s.trim();
  if (trimmed.length <= maxLen) return trimmed || '(whitespace only)';
  return `${trimmed.slice(0, maxLen)}…`;
}
