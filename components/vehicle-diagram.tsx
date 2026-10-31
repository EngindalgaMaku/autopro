"use client";

import { GLASS, PANELS, PART_LABELS, partCenter, WHEELS } from "@/lib/vehicle-parts";

interface Mark {
  number: number;
  part: string;
}

/**
 * The car from above. Tappable when `onSelect` is given (intake, paint gauge); read-only on
 * the customer's page. `values` writes a figure on each panel (paint microns); `marks` are the
 * numbered damage points, in the order they were recorded.
 */
export function VehicleDiagram({
  marks = [],
  values = {},
  selected,
  onSelect,
  className,
  theme = "dark",
}: {
  marks?: Mark[];
  values?: Record<string, string>;
  selected?: string | null;
  onSelect?: (part: string) => void;
  className?: string;
  theme?: "dark" | "print";
}) {
  const isPrint = theme === "print";
  const interactive = !!onSelect;
  const props = (key: string) =>
    interactive
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": PART_LABELS[key],
          "aria-pressed": selected === key,
          onClick: () => onSelect!(key),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect!(key);
            }
          },
          style: { cursor: "pointer" },
        }
      : {};
  const fill = (key: string) => {
    if (selected === key) return "#ffb020";
    if (isPrint) return values[key] ? "#f1f5f9" : "#ffffff";
    return values[key] ? "#2e333c" : "#22262e";
  };
  const stroke = (key: string) => {
    if (selected === key) return "#ffc94d";
    if (isPrint) return "#334155";
    return "#5b6270";
  };

  // Several marks on one panel fan out around its centre
  const perPart = new Map<string, number>();
  const placed = marks.map((m) => {
    const i = perPart.get(m.part) ?? 0;
    perPart.set(m.part, i + 1);
    const c = partCenter(m.part);
    // 0, +22, −22, +44 … along the panel's length, so narrow side panels keep their marks inside
    return { ...m, cx: c.x * 240, cy: c.y * 480 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 22 };
  });

  return (
    <svg
      viewBox="0 0 240 480"
      className={className}
      role={interactive ? "group" : "img"}
      aria-label={interactive ? "Araç şeması: parçaya dokunun" : `Araç şeması, ${marks.length} işaret`}
    >
      {WHEELS.map((w) => (
        <g key={w.key} {...props(w.key)}>
          <rect x={w.x} y={w.y} width={w.w} height={w.h} rx={5} fill={selected === w.key ? "#ffb020" : isPrint ? "#475569" : "#5b6270"} />
        </g>
      ))}
      {PANELS.map((p) => (
        <g key={p.key} {...props(p.key)}>
          <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.r} fill={fill(p.key)} stroke={stroke(p.key)} strokeWidth={isPrint ? 2 : 2.5} />
          {values[p.key] && (
            <text
              x={p.x + p.w / 2}
              y={p.y + p.h / 2 + 5}
              textAnchor="middle"
              fontSize={p.w < 40 ? 11 : 15}
              fontWeight={700}
              fill={selected === p.key ? "#1a1300" : isPrint ? "#0f172a" : "#f3f4f6"}
              fontFamily="var(--font-barlow), sans-serif"
            >
              {values[p.key]}
            </text>
          )}
        </g>
      ))}
      {GLASS.map((g) => (
        <g key={g.key} {...props(g.key)}>
          <path d={g.d} fill={selected === g.key ? "#ffb020" : isPrint ? "#e2e8f0" : "#16191e"} stroke={stroke(g.key)} strokeWidth={isPrint ? 1.5 : 2} />
        </g>
      ))}
      {placed.map((m) => (
        <g key={m.number} aria-hidden="true" pointerEvents="none">
          <circle cx={m.cx} cy={m.cy} r={10} fill={isPrint ? "#dc2626" : "#f87171"} stroke={isPrint ? "#ffffff" : "#111317"} strokeWidth={1.5} />
          <text x={m.cx} y={m.cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#ffffff" fontFamily="var(--font-inter), sans-serif">
            {m.number}
          </text>
        </g>
      ))}
    </svg>
  );
}
