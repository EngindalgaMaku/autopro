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
}: {
  marks?: Mark[];
  values?: Record<string, string>;
  selected?: string | null;
  onSelect?: (part: string) => void;
  className?: string;
}) {
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
  const fill = (key: string) => (selected === key ? "#ffb020" : values[key] ? "#2e333c" : "#22262e");
  const stroke = (key: string) => (selected === key ? "#ffc94d" : "#5b6270");

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
          <rect x={w.x} y={w.y} width={w.w} height={w.h} rx={5} fill={selected === w.key ? "#ffb020" : "#5b6270"} />
        </g>
      ))}
      {PANELS.map((p) => (
        <g key={p.key} {...props(p.key)}>
          <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.r} fill={fill(p.key)} stroke={stroke(p.key)} strokeWidth={2.5} />
          {values[p.key] && (
            <text
              x={p.x + p.w / 2}
              y={p.y + p.h / 2 + 5}
              textAnchor="middle"
              fontSize={p.w < 40 ? 11 : 15}
              fontWeight={700}
              fill={selected === p.key ? "#1a1300" : "#f3f4f6"}
              fontFamily="var(--font-barlow), sans-serif"
            >
              {values[p.key]}
            </text>
          )}
        </g>
      ))}
      {GLASS.map((g) => (
        <g key={g.key} {...props(g.key)}>
          <path d={g.d} fill={selected === g.key ? "#ffb020" : "#16191e"} stroke={stroke(g.key)} strokeWidth={2} />
        </g>
      ))}
      {placed.map((m) => (
        <g key={m.number} aria-hidden="true" pointerEvents="none">
          <circle cx={m.cx} cy={m.cy} r={10} fill="#f87171" stroke="#111317" strokeWidth={2} />
          <text x={m.cx} y={m.cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1a0a0a" fontFamily="var(--font-inter), sans-serif">
            {m.number}
          </text>
        </g>
      ))}
    </svg>
  );
}
