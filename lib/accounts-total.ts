/** Account is excluded from portfolio totals only when explicitly false. */
export function accountIncludedInTotals(
  inTotal: boolean | null | undefined
): boolean {
  return inTotal !== false;
}
