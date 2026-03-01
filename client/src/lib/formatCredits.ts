/**
 * Format credit amounts stored as u64 cents into display strings.
 *
 * Examples:
 *   formatCredits(10050)    → "100.50"
 *   formatCredits(0)        → "0.00"
 *   formatCredits(1)        → "0.01"
 *   formatCredits(123456789) → "1,234,567.89"
 */
export function formatCredits(cents: number | bigint): string {
  const n = Number(cents);
  const whole = Math.floor(Math.abs(n) / 100);
  const frac = Math.abs(n) % 100;
  const sign = n < 0 ? "-" : "";
  const wholeStr = whole.toLocaleString("en-US");
  const fracStr = frac.toString().padStart(2, "0");
  return `${sign}${wholeStr}.${fracStr}`;
}

/**
 * Short-form format for compact displays.
 *
 * Examples:
 *   formatCreditsShort(150000)   → "1.5K"
 *   formatCreditsShort(1234500)  → "12.3K"
 *   formatCreditsShort(100000000) → "1M"
 */
export function formatCreditsShort(cents: number | bigint): string {
  const value = Number(cents) / 100;
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return value.toFixed(2);
}

/**
 * Parse a display string back to cents.
 *
 * Examples:
 *   parseCredits("100.50") → 10050
 *   parseCredits("1,234.56") → 123456
 */
export function parseCredits(display: string): number {
  const cleaned = display.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Format a multiplier for display.
 *
 * Examples:
 *   formatMultiplier(2.5)  → "2.50x"
 *   formatMultiplier(14)   → "14.00x"
 */
export function formatMultiplier(mult: number): string {
  return `${mult.toFixed(2)}x`;
}
