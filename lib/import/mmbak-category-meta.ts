/** Money Manager ZCATEGORY.ZDOTYPE → Finatra category type (matches commit importer). */
export function mmCategoryZdoToFinatraType(
  zdo: number | null
): 'income' | 'expense' | null {
  if (zdo === 2) return 'income';
  if (zdo === 1) return 'expense';
  return null;
}
