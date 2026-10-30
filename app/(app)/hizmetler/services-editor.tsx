"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import type { ServiceKind, StationType, VehicleSegment } from "@prisma/client";
import { Button, Card, Eyebrow, Field, Input } from "@/components/ui";
import { formatTL, parseTL, segmentPrice } from "@/lib/money";
import { KINDS, WARRANTY_KINDS, warrantyLabel } from "@/lib/service-kinds";
import { SEGMENTS } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { deleteService, saveMultipliers, saveService, setServiceActive, type ActionResult } from "./actions";
import { PackagesEditor, type PackageRow } from "./packages-editor";

interface ServiceRow {
  id: string;
  name: string;
  kind: ServiceKind;
  defaultProduct: string;
  warrantyMonths: number | null;
  description: string;
  basePrice: number;
  durationMinutes: number;
  stationType: StationType | "";
  reminderMonths: number | null;
  isActive: boolean;
}

const STATIONS: Array<{ value: StationType | ""; label: string }> = [
  { value: "", label: "Fark etmez" },
  { value: "WASH_BAY", label: "Yıkama peronu" },
  { value: "LIFT", label: "Lift" },
  { value: "DETAILING_ROOM", label: "Detailing odası" },
  { value: "INTERIOR", label: "İç detay alanı" },
];

// Detailing jobs run from half an hour to several days; a working day is counted as 8 hours
const DURATIONS = [30, 45, 60, 90, 120, 180, 240, 360, 480, 960, 1440, 2400];
const durationLabel = (m: number) =>
  m < 60 ? `${m} dk` : m < 480 ? `${m / 60} sa`.replace(".5", ",5") : `${m / 480} gün`.replace(".5", ",5");

const REMINDERS = [null, 1, 3, 6, 12];

const SEGMENT_KEYS = Object.keys(SEGMENTS) as VehicleSegment[];

// Native <select>: custom dropdowns need precise taps that tablets in wet hands miss
const selectClass =
  "h-12 w-full rounded-xl border border-line bg-sunken px-3 text-ink focus:border-accent focus:outline-none";

function useAction() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, success: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        toast.success(success);
        after?.();
      }
    });
  return { pending, run };
}

function ServiceForm({
  service,
  multipliers,
  onDone,
}: {
  service?: ServiceRow;
  multipliers: Record<VehicleSegment, number>;
  onDone: () => void;
}) {
  const { pending, run } = useAction();
  const [price, setPrice] = useState(service && service.basePrice > 0 ? String(service.basePrice).replace(".", ",") : "");
  const [kind, setKind] = useState<ServiceKind>(service?.kind ?? "OTHER");
  const parsed = parseTL(price);

  return (
    <form
      action={(form) => run(() => saveService(form), service ? "Hizmet kaydedildi" : "Hizmet eklendi", onDone)}
      className="space-y-4"
    >
      {service && <input type="hidden" name="id" value={service.id} />}
      <input type="hidden" name="kind" value={kind} />
      <div className="space-y-2">
        <span className="block text-sm font-medium">Hizmet türü</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Hizmet türü">
          {(Object.keys(KINDS) as ServiceKind[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "min-h-12 rounded-xl px-3 py-2 text-left text-sm",
                kind === k ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-raised"
              )}
            >
              {KINDS[k].label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{KINDS[kind].hint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <Field label="Hizmet adı">
          <Input name="name" required defaultValue={service?.name} placeholder="Örn. Seramik kaplama" />
        </Field>
        <Field label="Sedan fiyatı (₺)">
          <Input
            name="basePrice"
            inputMode="decimal"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1.250"
            className="font-display text-lg font-semibold"
          />
        </Field>
      </div>

      {parsed !== null && parsed > 0 && (
        <div>
          <p className="mb-2 text-sm text-muted">Araç sınıfına göre</p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {SEGMENT_KEYS.map((s) => (
              <li key={s} className="rounded-lg bg-raised px-2 py-1.5 text-center">
                <span className="block text-[11px] text-muted">{SEGMENTS[s].label}</span>
                <span className="font-display font-semibold tabular-nums">{formatTL(segmentPrice(parsed, multipliers[s]))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Süre">
          <select name="durationMinutes" defaultValue={service?.durationMinutes ?? 60} className={selectClass}>
            {DURATIONS.map((m) => (
              <option key={m} value={m}>
                {durationLabel(m)}
              </option>
            ))}
            {service && !DURATIONS.includes(service.durationMinutes) && (
              <option value={service.durationMinutes}>{durationLabel(service.durationMinutes)}</option>
            )}
          </select>
        </Field>
        <Field label="Yapıldığı yer">
          <select name="stationType" defaultValue={service?.stationType ?? ""} className={selectClass}>
            {STATIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hatırlatma" hint="Müşteriyi geri çağırma">
          <select name="reminderMonths" defaultValue={service?.reminderMonths ?? ""} className={selectClass}>
            {REMINDERS.map((m) => (
              <option key={m ?? "none"} value={m ?? ""}>
                {m ? `${m} ay sonra` : "Yok"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {WARRANTY_KINDS.includes(kind) && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Varsayılan ürün" hint="Kabulde değiştirilebilir">
            <Input
              name="defaultProduct"
              defaultValue={service?.defaultProduct}
              placeholder={kind === "CERAMIC" ? "Örn. Gyeon Q2 Mohs" : kind === "PPF" ? "Örn. XPEL Ultimate" : "Örn. 3M Crystalline"}
              maxLength={80}
            />
          </Field>
          <Field label="Garanti">
            <select name="warrantyMonths" defaultValue={service?.warrantyMonths ?? ""} className={selectClass}>
              <option value="">Yok</option>
              {[6, 12, 24, 36, 48, 60, 84, 120].map((m) => (
                <option key={m} value={m}>
                  {warrantyLabel(m)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <Field label="Kısa açıklama" hint="Fişte ve müşteri sayfasında görünür">
        <Input name="description" defaultValue={service?.description} placeholder="Örn. 2 kat uygulama" maxLength={160} />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          <Check className="h-4 w-4" aria-hidden="true" />
          {service ? "Kaydet" : "Hizmeti ekle"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

export function ServicesEditor({
  services,
  packages,
  multipliers,
  canEdit,
}: {
  services: ServiceRow[];
  packages: PackageRow[];
  multipliers: Record<VehicleSegment, number>;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const { pending, run } = useAction();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold">Hizmetler ve Fiyatlar</h1>
          <p className="mt-1 text-sm text-muted">
            Fiyatları sedan için girin; diğer araç sınıfları aşağıdaki katsayılarla hesaplanır.
          </p>
        </div>
        {canEdit && open !== "new" && (
          <Button onClick={() => setOpen("new")}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Yeni hizmet
          </Button>
        )}
      </header>

      {!canEdit && (
        <Card className="p-4 text-sm text-muted">Fiyatları yalnızca işletme sahibi ve yöneticiler değiştirebilir.</Card>
      )}

      {open === "new" && (
        <Card className="border-accent/60 p-4">
          <h2 className="mb-4 font-display text-lg font-semibold">Yeni hizmet</h2>
          <ServiceForm multipliers={multipliers} onDone={() => setOpen(null)} />
        </Card>
      )}

      <section className="space-y-2" aria-label="Hizmetler">
        {services.length === 0 && <Card className="p-6 text-center text-sm text-muted">Henüz hizmet yok.</Card>}
        {services.map((s) => {
          const isOpen = open === s.id;
          return (
            <Card key={s.id} className={cn("overflow-hidden", isOpen && "border-accent/60", !s.isActive && "opacity-60")}>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setOpen(isOpen ? null : s.id)}
                aria-expanded={isOpen}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left enabled:cursor-pointer"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{s.name}</span>
                    {!s.isActive && <span className="shrink-0 rounded-full bg-raised px-2 py-0.5 text-xs text-muted">Gizli</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted">
                    {[
                      KINDS[s.kind].label,
                      durationLabel(s.durationMinutes),
                      s.warrantyMonths && `${warrantyLabel(s.warrantyMonths)} garanti`,
                      STATIONS.find((x) => x.value === s.stationType)?.label,
                      s.reminderMonths && `${s.reminderMonths} ay sonra hatırlat`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {s.basePrice > 0 ? (
                  <span className="font-display text-lg font-semibold tabular-nums">{formatTL(s.basePrice)}</span>
                ) : (
                  <span className="text-sm font-semibold text-accent">Fiyat girin</span>
                )}
                {canEdit && (
                  <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                )}
              </button>
              {isOpen && (
                <div className="border-t border-line p-4">
                  <ServiceForm service={s} multipliers={multipliers} onDone={() => setOpen(null)} />
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(() => setServiceActive(s.id, !s.isActive), s.isActive ? "Hizmet gizlendi" : "Hizmet yeniden listede")
                      }
                    >
                      {s.isActive ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                      {s.isActive ? "Kabul listesinden gizle" : "Listede göster"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        if (window.confirm(`"${s.name}" silinsin mi?`)) {
                          run(() => deleteService(s.id), "Hizmet silindi", () => setOpen(null));
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Sil
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </section>

      <PackagesEditor packages={packages} services={services} canEdit={canEdit} />

      <section className="space-y-3" aria-labelledby="segments-title">
        <div>
          <Eyebrow>
            <span id="segments-title">Araç sınıfı katsayıları</span>
          </Eyebrow>
          <p className="mt-1 text-sm text-muted">Sedan 1,00 kabul edilir. Büyük araca daha çok malzeme ve işçilik gider.</p>
        </div>
        <Card className="p-4">
          <form
            action={(form) => run(() => saveMultipliers(form), "Katsayılar kaydedildi")}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SEGMENT_KEYS.map((s) => (
                <Field key={s} label={SEGMENTS[s].label}>
                  <Input
                    name={s}
                    inputMode="decimal"
                    defaultValue={multipliers[s].toFixed(2).replace(".", ",")}
                    disabled={!canEdit}
                    className="font-display text-lg font-semibold tabular-nums"
                  />
                </Field>
              ))}
            </div>
            {canEdit && (
              <Button type="submit" variant="secondary" disabled={pending}>
                Katsayıları kaydet
              </Button>
            )}
          </form>
        </Card>
      </section>
    </div>
  );
}
