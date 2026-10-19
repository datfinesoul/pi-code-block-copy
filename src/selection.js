/**
 * Toggle an active picker item by its displayed one-digit number.
 *
 * @template {{ index: number }} T
 * @param {readonly T[]} items
 * @param {ReadonlySet<number>} selected
 * @param {number} index
 * @returns {Set<number> | null} The updated selection, or null when the index does not address an active item.
 */
export function toggleNumberedSelection(items, selected, index) {
  if (!Number.isInteger(index) || index < 1 || index > 9) return null;
  if (!items.some((item) => item.index === index)) return null;

  const next = new Set(selected);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  return next;
}
