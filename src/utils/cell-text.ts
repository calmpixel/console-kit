/** Empty list-cell display: blank / null / whitespace → `-`. */
export function cellText(value: unknown, fallback = '-'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return fallback;
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const s = String(value).trim();
  return s || fallback;
}
