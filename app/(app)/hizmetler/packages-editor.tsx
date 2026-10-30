"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button, Card, Eyebrow, Field, Input } from "@/components/ui";
import { formatTL, parseTL } from "@/lib/money";
import { cn } from "@/lib/utils";
import { deletePackage, savePackage, type ActionResult } from "./actions";

export interface PackageRow {
  id: string;
  name: string;
  price: number;
  serviceIds: string[];
}

interface ServiceLite {
  id: string;
  name: string;
  basePrice: number;
  isActive: boolean;
}

const listTotal = (ids: string[], services: ServiceLite[]) =>
  ids.reduce((sum, id) => sum + (services.find((s) => s.id === id)?.basePrice ?? 0), 0);

function PackageForm({ pkg, services, onDone }: { pkg?: PackageRow; services: ServiceLite[]; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [ids, setIds] = useState<string[]>(pkg?.serviceIds ?? []);
  const [price, setPrice] = useState(pkg ? String(pkg.price).replace(".", ",") : "");
  const sum = listTotal(ids, services);
  const p = parseTL(price);

  const submit = (form: FormData) =>
    start(async () => {
      const r: ActionResult = await savePackage(form);
      if (r.error) toast.error(r.error);
      else {
        toast.success(pkg ? "Paket kaydedildi" : "Paket eklendi");
        onDone();
      }
    });

  return (
    <form action={submit} className="space-y-4">
      {pkg && <input type="hidden" name="id" value={pkg.id} />}
      {ids.map((id) => (
        <input key={id} type="hidden" name="serviceIds" value={id} />
      ))}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
        <Field label="Paket adı">
          <Input name="name" required defaultValue={pkg?.name} placeholder="Örn. Yeni araç koruma paketi" />
        </Field>
        <Field label="Paket fiyatı (sedan)">
          <Input
            name="price"
            inputMode="decimal"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="20.000"
            className="font-display text-lg font-semibold"
          />
        </Field>
      </div>
      <div className="space-y-2">
        <span className="block text-sm font-medium">İçindeki hizmetler</span>
        <ul className="grid gap-2 sm:grid-cols-2">
          {services
            .filter((s) => s.isActive || ids.includes(s.id))
            .map((s) => {
              const on = ids.includes(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setIds(on ? ids.filter((x) => x !== s.id) : [...ids, s.id])}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm",
                      on ? "bg-raised" : "border border-line"
                    )}
                  >
                    <span
                      className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", on ? "bg-accent text-accent-ink" : "border-2 border-line-strong")}
                      aria-hidden="true"
                    >
                      {on && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                    <span className="flex-1">{s.name}</span>
                    <span className="tabular-nums text-muted">{s.basePrice > 0 ? formatTL(s.basePrice) : "—"}</span>
                  </button>
                </li>
              );
            })}
        </ul>
        {ids.length > 0 && (
          <p className="text-sm text-muted">
            Ayrı ayrı toplam {formatTL(sum)}
            {p !== null && p > 0 && sum > 0 && p < sum && (
              <span className="font-semibold text-ready"> · paketle %{Math.round((1 - p / sum) * 100)} indirim</span>
            )}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          <Check className="h-4 w-4" aria-hidden="true" />
          {pkg ? "Kaydet" : "Paketi ekle"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Vazgeç
        </Button>
      </div>
    </form>
  );
}

export function PackagesEditor({ packages, services, canEdit }: { packages: PackageRow[]; services: ServiceLite[]; canEdit: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const name = (id: string) => services.find((s) => s.id === id)?.name ?? "";

  return (
    <section className="space-y-3" aria-labelledby="packages-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Eyebrow>
            <span id="packages-title">Paketler</span>
          </Eyebrow>
          <p className="mt-1 text-sm text-muted">Birkaç hizmeti tek fiyata satın. Kabulde paket seçilince hizmetleri birlikte gelir.</p>
        </div>
        {canEdit && open !== "new" && (
          <Button variant="secondary" size="sm" onClick={() => setOpen("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Yeni paket
          </Button>
        )}
      </div>

      {open === "new" && (
        <Card className="border-accent/60 p-4">
          <PackageForm services={services} onDone={() => setOpen(null)} />
        </Card>
      )}

      {packages.length === 0 && open !== "new" && (
        <Card className="p-5 text-center text-sm text-muted">Henüz paket yok.</Card>
      )}

      {packages.map((pkg) => {
        const isOpen = open === pkg.id;
        const sum = listTotal(pkg.serviceIds, services);
        return (
          <Card key={pkg.id} className={cn("overflow-hidden", isOpen && "border-accent/60")}>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setOpen(isOpen ? null : pkg.id)}
              aria-expanded={isOpen}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left enabled:cursor-pointer"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{pkg.name}</span>
                <span className="mt-0.5 block truncate text-sm text-muted">{pkg.serviceIds.map(name).filter(Boolean).join(" + ")}</span>
              </span>
              <span className="text-right">
                <span className="block font-display text-lg font-semibold tabular-nums">{formatTL(pkg.price)}</span>
                {sum > pkg.price && <span className="block text-xs text-muted line-through">{formatTL(sum)}</span>}
              </span>
              {canEdit && <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} aria-hidden="true" />}
            </button>
            {isOpen && (
              <div className="border-t border-line p-4">
                <PackageForm pkg={pkg} services={services} onDone={() => setOpen(null)} />
                <div className="mt-4 border-t border-line pt-4">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`"${pkg.name}" paketi silinsin mi?`)) return;
                      start(async () => {
                        const r = await deletePackage(pkg.id);
                        if (r.error) toast.error(r.error);
                        else {
                          toast.success("Paket silindi");
                          setOpen(null);
                        }
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Paketi sil
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </section>
  );
}
