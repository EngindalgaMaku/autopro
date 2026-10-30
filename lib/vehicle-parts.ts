import type { DamageKind } from "@prisma/client";

// The body panels of the top-view diagram (front at the top, the car's left on the left), in
// a 240 × 480 drawing. Damage marks and paint readings are recorded per panel key.

export interface Panel {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

export const PANELS: Panel[] = [
  { key: "front_bumper", label: "Ön tampon", x: 40, y: 6, w: 160, h: 36, r: 18 },
  { key: "hood", label: "Kaput", x: 50, y: 46, w: 140, h: 92, r: 10 },
  { key: "roof", label: "Tavan", x: 60, y: 182, w: 120, h: 116, r: 12 },
  { key: "trunk", label: "Bagaj", x: 52, y: 340, w: 136, h: 92, r: 10 },
  { key: "rear_bumper", label: "Arka tampon", x: 40, y: 438, w: 160, h: 36, r: 18 },
  { key: "front_left_fender", label: "Sol ön çamurluk", x: 12, y: 48, w: 34, h: 96, r: 10 },
  { key: "front_left_door", label: "Sol ön kapı", x: 12, y: 150, w: 34, h: 96, r: 6 },
  { key: "rear_left_door", label: "Sol arka kapı", x: 12, y: 250, w: 34, h: 88, r: 6 },
  { key: "rear_left_fender", label: "Sol arka çamurluk", x: 12, y: 342, w: 34, h: 92, r: 10 },
  { key: "front_right_fender", label: "Sağ ön çamurluk", x: 194, y: 48, w: 34, h: 96, r: 10 },
  { key: "front_right_door", label: "Sağ ön kapı", x: 194, y: 150, w: 34, h: 96, r: 6 },
  { key: "rear_right_door", label: "Sağ arka kapı", x: 194, y: 250, w: 34, h: 88, r: 6 },
  { key: "rear_right_fender", label: "Sağ arka çamurluk", x: 194, y: 342, w: 34, h: 92, r: 10 },
];

/** Glass and wheels, drawn for orientation; damage on them is recorded under these keys */
export const GLASS = [
  { key: "windshield", label: "Ön cam", d: "M58 142 Q120 128 182 142 L176 178 Q120 170 64 178 Z" },
  { key: "rear_window", label: "Arka cam", d: "M64 302 Q120 310 176 302 L182 336 Q120 346 58 336 Z" },
];

export const WHEELS = [
  { key: "wheel_front_left", label: "Sol ön jant", x: 0, y: 70, w: 12, h: 52 },
  { key: "wheel_rear_left", label: "Sol arka jant", x: 0, y: 360, w: 12, h: 52 },
  { key: "wheel_front_right", label: "Sağ ön jant", x: 228, y: 70, w: 12, h: 52 },
  { key: "wheel_rear_right", label: "Sağ arka jant", x: 228, y: 360, w: 12, h: 52 },
];

export const PART_LABELS: Record<string, string> = Object.fromEntries([
  ...PANELS.map((p) => [p.key, p.label]),
  ...GLASS.map((g) => [g.key, g.label]),
  ...WHEELS.map((w) => [w.key, w.label]),
]);

export const isPart = (key: string) => key in PART_LABELS;

/** Centre of a part in the drawing, 0–1, where its numbered marks are drawn */
export function partCenter(key: string): { x: number; y: number } {
  const p = PANELS.find((x) => x.key === key) ?? WHEELS.find((x) => x.key === key);
  if (p) return { x: (p.x + p.w / 2) / 240, y: (p.y + p.h / 2) / 480 };
  if (key === "windshield") return { x: 0.5, y: 158 / 480 };
  if (key === "rear_window") return { x: 0.5, y: 322 / 480 };
  return { x: 0.5, y: 0.5 };
}

export const DAMAGE_KINDS: Record<DamageKind, string> = {
  SCRATCH: "Çizik",
  DENT: "Göçük",
  STONE_CHIP: "Taş izi",
  PAINT: "Boya farkı",
  RIM: "Jant sürtme",
  GLASS: "Cam çatlağı",
  OTHER: "Diğer",
};
