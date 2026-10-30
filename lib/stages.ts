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

/** Moves the workshop can make from each stage (a check can send a car back for rework) */
export const TRANSITIONS: Record<WorkStage, WorkStage[]> = {
  RECEIVED: ["WASHING", "DETAILING", "QUALITY_CHECK", "CANCELLED"],
  WASHING: ["DETAILING", "QUALITY_CHECK", "CANCELLED"],
  DETAILING: ["QUALITY_CHECK", "CANCELLED"],
  QUALITY_CHECK: ["READY", "DETAILING", "CANCELLED"],
  READY: ["DELIVERED", "VALET_DELIVERY", "QUALITY_CHECK"],
  VALET_DELIVERY: ["DELIVERED", "READY"],
  DELIVERED: [],
  CANCELLED: [],
};

export const canMove = (from: WorkStage, to: WorkStage) => TRANSITIONS[from].includes(to);

/**
 * The one button that moves an order on. A wash-only order skips the detailing stage, since
 * nothing happens there for it.
 */
export function nextStage(stage: WorkStage, needsDetailing: boolean): { target: WorkStage; label: string } | null {
  switch (stage) {
    case "RECEIVED":
      return { target: "WASHING", label: "Yıkamaya al" };
    case "WASHING":
      return needsDetailing ? { target: "DETAILING", label: "Detailing'e al" } : { target: "QUALITY_CHECK", label: "Son kontrole al" };
    case "DETAILING":
      return { target: "QUALITY_CHECK", label: "Son kontrole al" };
    case "QUALITY_CHECK":
      return { target: "READY", label: "Hazır" };
    case "READY":
    case "VALET_DELIVERY":
      return { target: "DELIVERED", label: "Teslim et" };
    default:
      return null;
  }
}
