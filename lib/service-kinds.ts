import { z } from "zod";
import type { ServiceKind } from "@prisma/client";

// Kinds of detailing work and the details each records on a work order item. The intake
// asks for these, the tracking page and warranty card show them back to the customer.

export const KINDS: Record<ServiceKind, { label: string; hint: string }> = {
  WASH: { label: "Yıkama", hint: "Dış yıkama, detaylı temizlik" },
  INTERIOR: { label: "İç detay", hint: "Koltuk, deri, tavan, ozon" },
  POLISH: { label: "Pasta cila", hint: "Aşama sayısı kaydedilir" },
  CERAMIC: { label: "Seramik kaplama", hint: "Ürün, kat, garanti" },
  PPF: { label: "PPF", hint: "Bölgeler, film, garanti" },
  WINDOW_FILM: { label: "Cam filmi", hint: "Geçirgenlik, camlar, garanti" },
  WHEEL: { label: "Jant", hint: "Parlatma, seramik, boya" },
  OTHER: { label: "Diğer", hint: "Ek ayrıntı yok" },
};

/** Kinds that carry a product and a warranty (shown on the warranty card) */
export const WARRANTY_KINDS: ServiceKind[] = ["CERAMIC", "PPF", "WINDOW_FILM"];

export const PPF_ZONES = [
  "Ön tampon",
  "Kaput",
  "Ön çamurluklar",
  "Aynalar",
  "Farlar",
  "Kapı kenarları",
  "Kapı kolu içleri",
  "Marşpiyeller",
  "Arka tampon üstü",
  "Tam kaplama",
] as const;

export const WINDOWS = ["Ön cam şeridi", "Ön yan camlar", "Arka yan camlar", "Arka cam", "Tavan camı"] as const;

/** Light let through (VLT %): lower is darker. Front side windows have legal limits; the shop decides */
export const TINTS = [5, 15, 20, 35, 50, 70] as const;

export const WHEEL_WORK = { POLISH: "Parlatma", CERAMIC: "Jant seramiği", PAINT: "Boya" } as const;

const months = z.number().int().min(1).max(240).optional();
const text = z.string().trim().max(80).optional();

export const DETAIL_SCHEMAS = {
  CERAMIC: z.object({ product: text, layers: z.number().int().min(1).max(5).optional(), warrantyMonths: months }),
  PPF: z.object({ product: text, zones: z.array(z.enum(PPF_ZONES)).max(PPF_ZONES.length).optional(), warrantyMonths: months }),
  WINDOW_FILM: z.object({
    product: text,
    tint: z.number().int().refine((v) => (TINTS as readonly number[]).includes(v)).optional(),
    windows: z.array(z.enum(WINDOWS)).max(WINDOWS.length).optional(),
    warrantyMonths: months,
  }),
  POLISH: z.object({ stages: z.number().int().min(1).max(3).optional() }),
  WHEEL: z.object({
    work: z.enum(Object.keys(WHEEL_WORK) as [keyof typeof WHEEL_WORK, ...Array<keyof typeof WHEEL_WORK>]).optional(),
    count: z.number().int().min(1).max(5).optional(),
  }),
} as const;

export type ItemDetails = {
  product?: string;
  layers?: number;
  zones?: string[];
  warrantyMonths?: number;
  tint?: number;
  windows?: string[];
  stages?: number;
  work?: keyof typeof WHEEL_WORK;
  count?: number;
};

/** Checks the details for a kind; kinds without details store none */
export function parseDetails(kind: ServiceKind, value: unknown): ItemDetails | null {
  const schema = DETAIL_SCHEMAS[kind as keyof typeof DETAIL_SCHEMAS];
  if (!schema) return null;
  const parsed = schema.safeParse(value ?? {});
  if (!parsed.success) throw new Error("Hizmet ayrıntıları geçersiz");
  const clean = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0)));
  return Object.keys(clean).length ? (clean as ItemDetails) : null;
}

export const warrantyLabel = (m: number) => (m % 12 === 0 ? `${m / 12} yıl` : `${m} ay`);

/** One line for cards, receipts and the tracking page: "Gyeon Q2 · 2 kat · 2 yıl garanti" */
export function detailSummary(kind: ServiceKind, details: ItemDetails | null | undefined) {
  if (!details) return "";
  const parts: string[] = [];
  if (details.product) parts.push(details.product);
  if (kind === "CERAMIC" && details.layers) parts.push(`${details.layers} kat`);
  if (kind === "PPF" && details.zones?.length) parts.push(details.zones.join(", "));
  if (kind === "WINDOW_FILM" && details.tint) parts.push(`%${details.tint}`);
  if (kind === "WINDOW_FILM" && details.windows?.length) parts.push(details.windows.join(", "));
  if (kind === "POLISH" && details.stages) parts.push(`${details.stages} aşama`);
  if (kind === "WHEEL" && details.work) parts.push(WHEEL_WORK[details.work]);
  if (kind === "WHEEL" && details.count) parts.push(`${details.count} jant`);
  if (details.warrantyMonths) parts.push(`${warrantyLabel(details.warrantyMonths)} garanti`);
  return parts.join(" · ");
}
