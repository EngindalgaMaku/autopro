"use client";

import type { ServiceKind } from "@prisma/client";
import { Input } from "@/components/ui";
import { PPF_ZONES, TINTS, WHEEL_WORK, WINDOWS, warrantyLabel, type ItemDetails } from "@/lib/service-kinds";
import { cn } from "@/lib/utils";

// The kind-specific questions under a picked service at intake: what is applied, where, and
// for how long it is guaranteed. Everything is a tap; only the product name is typed.

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("min-h-11 rounded-lg px-3 text-sm", on ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-sunken")}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

const toggle = (list: string[] | undefined, value: string) =>
  list?.includes(value) ? list.filter((v) => v !== value) : [...(list ?? []), value];

const WARRANTIES = [12, 24, 36, 60, 84, 120];

export function hasDetails(kind: ServiceKind) {
  return ["CERAMIC", "PPF", "WINDOW_FILM", "POLISH", "WHEEL"].includes(kind);
}

export function ItemDetailsFields({
  kind,
  value,
  onChange,
  label,
}: {
  kind: ServiceKind;
  value: ItemDetails;
  onChange: (next: ItemDetails) => void;
  label: string;
}) {
  const set = (patch: Partial<ItemDetails>) => onChange({ ...value, ...patch });
  const product = (placeholder: string) => (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-muted">Ürün</span>
      <Input
        value={value.product ?? ""}
        onChange={(e) => set({ product: e.target.value })}
        placeholder={placeholder}
        maxLength={80}
        aria-label={`${label} ürünü`}
        className="h-11"
      />
    </label>
  );
  const warranty = (
    <Row label="Garanti">
      {WARRANTIES.map((m) => (
        <Choice key={m} on={value.warrantyMonths === m} onClick={() => set({ warrantyMonths: value.warrantyMonths === m ? undefined : m })}>
          {warrantyLabel(m)}
        </Choice>
      ))}
    </Row>
  );

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
      {kind === "CERAMIC" && (
        <>
          {product("Örn. Gyeon Q2 Mohs")}
          <Row label="Kat">
            {[1, 2, 3].map((n) => (
              <Choice key={n} on={value.layers === n} onClick={() => set({ layers: value.layers === n ? undefined : n })}>
                {n} kat
              </Choice>
            ))}
          </Row>
          {warranty}
        </>
      )}

      {kind === "PPF" && (
        <>
          {product("Örn. XPEL Ultimate Plus")}
          <Row label="Kaplanan bölgeler">
            {PPF_ZONES.map((z) => (
              <Choice key={z} on={!!value.zones?.includes(z)} onClick={() => set({ zones: toggle(value.zones, z) })}>
                {z}
              </Choice>
            ))}
          </Row>
          {warranty}
        </>
      )}

      {kind === "WINDOW_FILM" && (
        <>
          {product("Örn. 3M Crystalline")}
          <Row label="Işık geçirgenliği">
            {TINTS.map((t) => (
              <Choice key={t} on={value.tint === t} onClick={() => set({ tint: value.tint === t ? undefined : t })}>
                %{t}
              </Choice>
            ))}
          </Row>
          <Row label="Camlar">
            {WINDOWS.map((w) => (
              <Choice key={w} on={!!value.windows?.includes(w)} onClick={() => set({ windows: toggle(value.windows, w) })}>
                {w}
              </Choice>
            ))}
          </Row>
          {warranty}
        </>
      )}

      {kind === "POLISH" && (
        <Row label="Aşama">
          {[1, 2, 3].map((n) => (
            <Choice key={n} on={value.stages === n} onClick={() => set({ stages: value.stages === n ? undefined : n })}>
              {n} aşama
            </Choice>
          ))}
        </Row>
      )}

      {kind === "WHEEL" && (
        <>
          <Row label="İşlem">
            {(Object.keys(WHEEL_WORK) as Array<keyof typeof WHEEL_WORK>).map((w) => (
              <Choice key={w} on={value.work === w} onClick={() => set({ work: value.work === w ? undefined : w })}>
                {WHEEL_WORK[w]}
              </Choice>
            ))}
          </Row>
          <Row label="Jant sayısı">
            {[1, 2, 3, 4, 5].map((n) => (
              <Choice key={n} on={value.count === n} onClick={() => set({ count: value.count === n ? undefined : n })}>
                {n === 5 ? "4 + stepne" : n}
              </Choice>
            ))}
          </Row>
        </>
      )}
    </div>
  );
}
