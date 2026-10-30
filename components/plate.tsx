import { formatPlate } from "@/lib/plate";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: { box: "h-8 border-2 rounded-md", strip: "w-3.5", text: "text-lg tracking-[1.5px] px-2" },
  md: { box: "h-11 border-2 rounded-lg", strip: "w-5", text: "text-2xl tracking-[2px] px-3" },
  lg: { box: "h-[78px] border-[3px] rounded-[10px]", strip: "w-9", text: "text-[46px] tracking-[3px] px-4" },
} as const;

/**
 * A Turkish number plate as it looks on the car: white, black rim, the blue TR strip.
 * Workshops know their customers by plate, so it is the anchor of every card.
 */
export function Plate({ plate, size = "md", className }: { plate: string; size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span
      className={cn("inline-flex overflow-hidden border-black bg-white align-middle", s.box, className)}
      aria-label={`Plaka ${formatPlate(plate)}`}
      role="img"
    >
      <span className={cn("flex flex-col items-center justify-end bg-plate-blue pb-1", s.strip)} aria-hidden="true">
        {size === "lg" && <span className="text-[13px] font-bold leading-none text-white">TR</span>}
      </span>
      <span
        className={cn("flex flex-1 items-center justify-center whitespace-nowrap font-plate font-bold text-black", s.text)}
        aria-hidden="true"
      >
        {formatPlate(plate)}
      </span>
    </span>
  );
}
