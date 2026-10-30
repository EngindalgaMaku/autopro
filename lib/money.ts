// Turkish lira amounts as people type and read them: "1.250", "1.250,50", "1250,5", "1250"
// all mean what a Turkish reader expects (dot = thousands, comma = decimals).

/** Parses a typed amount; null when it is not a number */
export function parseTL(input: string): number | null {
  let s = input.replace(/[₺\s]/g, "").replace(/tl$/i, "");
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ""); // "1.250" and "12.500.000": thousands
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Number(s);
}

/** ₺1.250 or ₺1.250,50 */
export function formatTL(value: number | string | { toString(): string }) {
  const n = typeof value === "number" ? value : Number(value.toString());
  return `₺${n.toLocaleString("tr-TR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** The price for a vehicle class, rounded to whole lira (workshops quote round numbers) */
export const segmentPrice = (base: number, multiplier: number) => Math.round(base * multiplier);
