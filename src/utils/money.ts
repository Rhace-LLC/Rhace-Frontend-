/**
 * Currency-aware money formatting for report screens. `compact` shortens big
 * figures (₦2.4M); pair it with the exact value in a tooltip.
 */
export function formatMoney(
  amount: number | null | undefined,
  currency = 'NGN',
  { compact = false }: { compact?: boolean } = {},
): string {
  const value = Number(amount) || 0;
  const code = (currency || 'NGN').toUpperCase();
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
      notation: compact && Math.abs(value) >= 10_000 ? 'compact' : 'standard',
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: compact ? 0 : 2,
    }).format(value);
  } catch {
    return `${code} ${value.toLocaleString()}`;
  }
}

/** Compact count, e.g. 12.4K. */
export const formatCount = (value: number | null | undefined) =>
  new Intl.NumberFormat('en-NG', { notation: (Number(value) || 0) >= 10_000 ? 'compact' : 'standard' }).format(
    Number(value) || 0,
  );
