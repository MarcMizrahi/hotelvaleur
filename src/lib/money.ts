/**
 * Monetary utilities. All amounts are stored as integer cents.
 * French formatting: non-breaking space (U+00A0) as thousands separator,
 * "€" symbol suffixed with a non-breaking space.
 */

const NBSP = "\u00A0";

/**
 * Format an amount in cents as a French euro string.
 * Large amounts (>= 1000 €) drop decimals for readability.
 */
export function formatEuros(cents: number, opts: { decimals?: boolean } = {}): string {
  if (!Number.isFinite(cents)) return `0${NBSP}€`;
  const euros = cents / 100;
  const showDecimals = opts.decimals ?? Math.abs(euros) < 1000;
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
    useGrouping: true,
  }).format(euros);
  // Intl already uses NBSP as grouping in fr-FR
  return `${formatted}${NBSP}€`;
}

/**
 * Format a range in cents.
 */
export function formatEurosRange(lowCents: number, highCents: number): string {
  return `${formatEuros(lowCents)} – ${formatEuros(highCents)}`;
}

/**
 * Parse a user-typed euro string into cents.
 * Accepts formats like "1 234 567", "1234567,50", "1.234,50", "1234,50 €".
 * Returns 0 for empty/invalid input.
 */
export function parseEuros(input: string): number {
  if (!input) return 0;
  const cleaned = input
    .replace(/\s|\u00A0/g, "")
    .replace(/€/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove thousands dots
    .replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
