import type { VehicleSegment, WorkStage } from "@prisma/client";

// Labels and order of the work-order stages (prisma WorkStage) and vehicle classes,
// shared by the board, the work order screen and the customer's tracking page.

export const STAGES: Record<WorkStage, { label: string; customerLabel: string }> = {
  RECEIVED: { label: "Kabul", customerLabel: "Teslim alındı" },
  WASHING: { label: "Yıkama", customerLabel: "Yıkamada" },
  DETAILING: { label: "Detailing", customerLabel: "Uygulamada" },
  QUALITY_CHECK: { label: "Son kontrol", customerLabel: "Son kontrolde" },
  READY: { label: "Teslime hazır", customerLabel: "Hazır" },
  VALET_DELIVERY: { label: "Vale yolda", customerLabel: "Size getiriliyor" },
  DELIVERED: { label: "Teslim edildi", customerLabel: "Teslim edildi" },
  CANCELLED: { label: "İptal", customerLabel: "İptal edildi" },
};

/** Board columns, in work order (delivered and cancelled orders leave the board) */
export const BOARD_STAGES: WorkStage[] = ["RECEIVED", "WASHING", "DETAILING", "QUALITY_CHECK", "READY"];

export const SEGMENTS: Record<VehicleSegment, { label: string; defaultMultiplier: number }> = {
  HATCHBACK: { label: "Hatchback", defaultMultiplier: 0.9 },
  SEDAN: { label: "Sedan", defaultMultiplier: 1 },
  SUV: { label: "SUV", defaultMultiplier: 1.25 },
  SUV_LARGE: { label: "Büyük SUV", defaultMultiplier: 1.5 },
  COMMERCIAL: { label: "Ticari", defaultMultiplier: 1.8 },
  MOTORCYCLE: { label: "Motosiklet", defaultMultiplier: 0.6 },
};
