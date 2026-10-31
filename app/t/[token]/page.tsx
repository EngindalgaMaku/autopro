import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, ChevronRight } from "lucide-react";
import { Plate } from "@/components/plate";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { whatsappNumber } from "@/lib/phone";
import { formatPlate } from "@/lib/plate";
import { detailSummary, type ItemDetails } from "@/lib/service-kinds";
import { BOARD_STAGES, STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { DAMAGE_KINDS, PANELS, PART_LABELS } from "@/lib/vehicle-parts";
import { VehicleDiagram } from "@/components/vehicle-diagram";
import { ApproveButton } from "./approve-button";

// The customer's page, opened from the WhatsApp link: no sign-in, so it shows the car and
// the work only — never the owner's phone or address
export const metadata = { title: "Araç takibi", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(token)) notFound();
  const order = await prisma.workOrder.findUnique({
    where: { trackingToken: token },
    include: {
      business: { select: { name: true, phone: true } },
      vehicle: { select: { plate: true, brand: true, model: true } },
      items: { select: { id: true, name: true, totalPrice: true, kind: true, details: true, packageName: true } },
      payments: { select: { amount: true } },
      inspection: {
        include: {
          marks: { orderBy: { number: "asc" }, include: { photos: { select: { id: true } } } },
          readings: true,
        },
      },
      photos: { where: { kind: { in: ["BEFORE", "AFTER"] } }, orderBy: { createdAt: "asc" }, select: { id: true, kind: true } },
    },
  });
  if (!order) notFound();
  const ins = order.inspection;
  const photoUrl = (id: string) => `/api/photos/${id}?t=${token}`;
  const reading = (part: string, phase: "BEFORE" | "AFTER") => ins?.readings.find((r) => r.part === part && r.phase === phase)?.microns;
  const measured = PANELS.filter((p) => reading(p.key, "BEFORE") || reading(p.key, "AFTER"));

  const paid = order.payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(order.totalAmount);
  const remaining = Math.max(0, total - paid);
  const stageIndex = BOARD_STAGES.indexOf(order.stage);
  const finished = order.stage === "DELIVERED" || order.stage === "VALET_DELIVERY";
  const steps = ["Kabul", "Yıkama", "Uygulama", "Kontrol", "Hazır"];

  // The warranty card: works the shop recorded a warranty for, counted from the handover day
  const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
  const warranties =
    order.stage === "DELIVERED" && order.deliveredAt
      ? order.items.flatMap((i) => {
          const d = (i.details ?? {}) as ItemDetails;
          if (!d.warrantyMonths) return [];
          const until = new Date(order.deliveredAt!);
          until.setMonth(until.getMonth() + d.warrantyMonths);
          return [{ id: i.id, name: i.name, product: d.product, from: fmt(order.deliveredAt!), until: fmt(until) }];
        })
      : [];

  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <span className="font-display text-lg font-bold">{order.business.name}</span>
        <span className="text-xs text-muted">Üyelik gerekmez</span>
      </header>

      <Card className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Plate plate={order.vehicle.plate} size="md" />
          <span className="text-sm text-muted">{[order.vehicle.brand, order.vehicle.model].filter(Boolean).join(" ")}</span>
        </div>
        <div>
          <p className="text-sm text-muted">Aracınız şu anda</p>
          <p className={cn("font-display text-[26px] font-bold", order.stage === "READY" || order.stage === "DELIVERED" ? "text-ready" : order.stage === "CANCELLED" ? "text-danger" : "text-accent")}>
            {STAGES[order.stage].customerLabel}
          </p>
          {order.promisedAt && !finished && order.stage !== "CANCELLED" && (
            <p className="text-sm">
              Tahmini teslim:{" "}
              <strong>
                {order.promisedAt.toLocaleString("tr-TR", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
              </strong>
            </p>
          )}
        </div>
        {order.stage !== "CANCELLED" && (
          <ol aria-label="Aşamalar" className="grid grid-cols-5 gap-1">
            {steps.map((label, i) => {
              const reached = finished || i <= stageIndex;
              return (
                <li key={label} aria-current={i === stageIndex ? "step" : undefined}>
                  <span className={cn("block h-1.5 rounded-full", reached ? "bg-accent" : "bg-line")} />
                  <span className={cn("mt-1.5 block text-[11px]", i === stageIndex ? "font-semibold text-ink" : "text-muted")}>{label}</span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      {warranties.length > 0 && (
        <Card className="space-y-3 border-accent/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Garanti belgesi</h2>
              <p className="text-xs text-muted">
                {formatPlate(order.vehicle.plate)} · {order.number}
              </p>
            </div>
            <Link
              href={`/t/${token}/sertifika`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink transition hover:bg-accent-hover"
            >
              <Award className="h-3.5 w-3.5" />
              Sertifikayı Gör
            </Link>
          </div>
          <ul className="space-y-2">
            {warranties.map((w) => (
              <li key={w.id} className="rounded-xl bg-raised p-3 text-sm">
                <p className="font-semibold">{w.name}</p>
                {w.product && <p className="text-muted">{w.product}</p>}
                <p className="mt-1">
                  {w.from} – <strong>{w.until}</strong>
                </p>
              </li>
            ))}
          </ul>
          <Link
            href={`/t/${token}/sertifika`}
            className="flex items-center justify-between rounded-xl border border-line bg-raised/70 p-3 text-xs text-ink transition hover:border-accent hover:bg-raised"
          >
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4 text-accent" />
              <span>Resmi Orijinallik ve Garanti Sertifikasını Aç</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted" />
          </Link>
          <p className="text-xs text-muted">Garanti koşulları {order.business.name} tarafından belirlenir.</p>
        </Card>
      )}

      {ins && (ins.marks.length > 0 || ins.customerApprovedAt || order.stage === "RECEIVED") && (
        <Card className="space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Kabulde kayda geçenler</h2>
            <span className="text-xs text-muted">
              {ins.createdAt.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
            </span>
          </div>
          {ins.marks.length === 0 ? (
            <p className="text-sm text-muted">Aracınızda kayda geçen hasar yok.</p>
          ) : (
            <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
              <VehicleDiagram className="w-full" marks={ins.marks} />
              <ol className="space-y-2">
                {ins.marks.map((m) => (
                  <li key={m.id} className="space-y-1.5 text-sm">
                    <p>
                      <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[11px] font-bold text-[#1a0a0a]">{m.number}</span>
                      {PART_LABELS[m.part]} · {DAMAGE_KINDS[m.kind]}
                    </p>
                    {m.note && <p className="text-xs text-muted">{m.note}</p>}
                    {m.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5">
                        {m.photos.map((p) => (
                          <a key={p.id} href={photoUrl(p.id)} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-md bg-raised">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoUrl(p.id)} alt={`${m.number} numaralı hasar`} className="h-full w-full object-cover" loading="lazy" />
                          </a>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {ins.customerApprovedAt ? (
            <p className="rounded-xl bg-ready/15 px-3 py-2 text-sm font-semibold text-ready">
              Onayladınız ·{" "}
              {ins.customerApprovedAt.toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Aracınız bu durumda teslim alındı. Bir itirazınız varsa aşağıdan bize yazın; doğruysa onaylayın.
              </p>
              <ApproveButton token={token} />
            </>
          )}
        </Card>
      )}

      {measured.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <caption className="px-4 pt-4 text-left font-display text-lg font-semibold">Boya kalınlığı ölçümü</caption>
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Parça</th>
                <th className="px-2 py-2 text-right font-medium">Kabulde</th>
                <th className="px-4 py-2 text-right font-medium">İşlem sonrası</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {measured.map((p) => (
                <tr key={p.key}>
                  <td className="px-4 py-2">{p.label}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{reading(p.key, "BEFORE") ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{reading(p.key, "AFTER") ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 pb-4 pt-1 text-xs text-muted">Değerler mikron (µm) cinsinden, atölyenin ölçüm cihazıyla alınmıştır.</p>
        </Card>
      )}

      {order.photos.length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className="font-display text-lg font-semibold">Öncesi ve sonrası</h2>
          {(["BEFORE", "AFTER"] as const).map((k) => {
            const list = order.photos.filter((p) => p.kind === k);
            if (!list.length) return null;
            return (
              <div key={k} className="space-y-1.5">
                <p className="text-sm text-muted">{k === "BEFORE" ? "Öncesi" : "Sonrası"}</p>
                <div className="grid grid-cols-3 gap-2">
                  {list.map((p) => (
                    <a key={p.id} href={photoUrl(p.id)} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-raised">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoUrl(p.id)} alt={k === "BEFORE" ? "İşlem öncesi" : "İşlem sonrası"} className="h-full w-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-2 font-display text-lg font-semibold">Yapılan işler</h2>
        <ul className="divide-y divide-line">
          {order.items.map((i) => {
            const detail = detailSummary(i.kind, i.details as ItemDetails | null);
            return (
              <li key={i.id} className="flex justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block">{i.name}</span>
                  {(detail || i.packageName) && (
                    <span className="block text-xs text-muted">{[i.packageName && `Paket: ${i.packageName}`, detail].filter(Boolean).join(" · ")}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">{formatTL(i.totalPrice)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 space-y-1 border-t border-line pt-3 text-sm">
          <p className="flex justify-between">
            <span className="text-muted">Toplam</span>
            <span className="font-semibold tabular-nums">{formatTL(total)}</span>
          </p>
          {paid > 0 && (
            <p className="flex justify-between">
              <span className="text-muted">Ödenen</span>
              <span className="font-semibold text-ready tabular-nums">{formatTL(paid)}</span>
            </p>
          )}
          <p className="flex justify-between text-base">
            <span>Kalan</span>
            <span className="font-display text-xl font-bold tabular-nums">{formatTL(remaining)}</span>
          </p>
        </div>
      </Card>

      {order.business.phone && (
        <div className="grid grid-cols-2 gap-2">
          <a href={`tel:${order.business.phone}`} className="flex h-12 items-center justify-center rounded-xl border border-line font-medium">
            Ara
          </a>
          <a
            href={`https://wa.me/${whatsappNumber(order.business.phone)}?text=${encodeURIComponent(`Merhaba, ${order.number} numaralı aracım hakkında yazıyorum.`)}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 items-center justify-center rounded-xl border border-line font-medium"
          >
            WhatsApp
          </a>
        </div>
      )}
    </main>
  );
}
