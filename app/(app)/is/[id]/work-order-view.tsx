"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Ban, Check, ChevronRight, Copy, Loader2, MessageCircle, Phone, RotateCcw, Send, Trash2, Truck, Wallet } from "lucide-react";
import type { PaymentMethod, WorkStage } from "@prisma/client";
import { Plate } from "@/components/plate";
import { Button, Card, Eyebrow, Input } from "@/components/ui";
import { whenLabel } from "@/lib/elapsed";
import { formatTL } from "@/lib/money";
import { formatPhone, whatsappNumber } from "@/lib/phone";
import { formatPlate } from "@/lib/plate";
import { BOARD_STAGES, canMove, nextStage, STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { addPayment, assignWork, deletePayment, moveStage, type ActionResult } from "../actions";

interface OrderView {
  id: string;
  number: string;
  trackingToken: string;
  stage: WorkStage;
  plate: string;
  car: string;
  customerName: string;
  customerPhone: string;
  technicianId: string;
  stationId: string;
  mileage: number | null;
  fuelLevel: string | null;
  promisedAt: string | null;
  notes: string | null;
  total: number;
  paid: number;
  needsDetailing: boolean;
  record: { marks: number; readings: number; photos: number; approved: boolean };
  items: Array<{ id: string; name: string; price: number; detail: string }>;
  payments: Array<{ id: string; amount: number; method: PaymentMethod; note: string | null; paidAt: string }>;
  events: Array<{ id: string; stage: WorkStage; note: string | null; at: string; by: string | null }>;
}

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Nakit" },
  { value: "CARD", label: "Kart" },
  { value: "BANK_TRANSFER", label: "Havale" },
];
const methodLabel = (m: PaymentMethod) => METHODS.find((x) => x.value === m)?.label ?? m;

const selectClass = "h-12 w-full rounded-xl border border-line bg-sunken px-3 text-ink focus:border-accent focus:outline-none";
const STRIP = ["Kabul", "Yıkama", "Detailing", "Kontrol", "Hazır"];

export function WorkOrderView({
  order,
  technicians,
  stations,
  businessName,
}: {
  order: OrderView;
  technicians: Array<{ id: string; name: string }>;
  stations: Array<{ id: string; name: string }>;
  businessName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [payOpen, setPayOpen] = useState(false);
  const remaining = Math.max(0, Math.round((order.total - order.paid) * 100) / 100);
  const [amount, setAmount] = useState(remaining ? String(remaining).replace(".", ",") : "");
  const [method, setMethod] = useState<PaymentMethod>("CASH");

  const closed = order.stage === "DELIVERED" || order.stage === "CANCELLED";
  const step = nextStage(order.stage, order.needsDetailing);
  const collectFirst = (order.stage === "READY" || order.stage === "VALET_DELIVERY") && remaining > 0;
  const stripIndex = order.stage === "VALET_DELIVERY" ? 4 : BOARD_STAGES.indexOf(order.stage);
  const trackUrl = typeof window !== "undefined" ? `${window.location.origin}/t/${order.trackingToken}` : "";
  const wa = (text: string) => `https://wa.me/${whatsappNumber(order.customerPhone)}?text=${encodeURIComponent(text)}`;

  const run = (fn: () => Promise<ActionResult>, success: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        toast.success(success);
        after?.();
        router.refresh();
      }
    });

  const move = (target: WorkStage) =>
    run(() => moveStage(order.id, target), STAGES[target].label, () => {
      // "Ready" is the moment the customer wants to hear about
      if (target === "READY") {
        toast("Müşteriye haber verin", {
          duration: 10000,
          action: {
            label: "WhatsApp",
            onClick: () =>
              window.open(
                wa(`Merhaba ${order.customerName}, ${formatPlate(order.plate)} plakalı aracınız hazır. Detaylar: ${trackUrl}\n\n${businessName}`),
                "_blank"
              ),
          },
        });
      }
    });

  const openPay = () => {
    setPayOpen(true);
    setTimeout(() => document.getElementById("tahsilat")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 md:px-8">
      <Link href="/atolye" className="mb-3 inline-flex h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Atölye
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Plate plate={order.plate} size="md" />
          <p className="font-semibold">{order.car || "Araç bilgisi yok"}</p>
          <p className="font-mono text-xs text-muted">{order.number}</p>
        </div>
        <div className="text-right">
          <p className={cn("font-display text-2xl font-bold", order.stage === "READY" ? "text-ready" : order.stage === "CANCELLED" ? "text-danger" : "text-accent")}>
            {STAGES[order.stage].label}
          </p>
          {order.promisedAt && !closed && <p className="text-sm text-muted">Teslim: {whenLabel(new Date(order.promisedAt))}</p>}
        </div>
      </header>

      {order.stage !== "CANCELLED" && (
        <ol aria-label="Aşamalar" className="mt-4 grid grid-cols-5 gap-1">
          {STRIP.map((label, i) => (
            <li key={label} aria-current={i === stripIndex ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full", order.stage === "DELIVERED" || i <= stripIndex ? "bg-accent" : "bg-line")} />
              <span className={cn("mt-1.5 block truncate text-[11px]", i === stripIndex ? "font-semibold" : "text-muted")}>{label}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{order.customerName}</p>
                <p className="text-sm text-muted">{formatPhone(order.customerPhone)}</p>
              </div>
              <div className="flex gap-2">
                <a href={`tel:${order.customerPhone}`} aria-label="Müşteriyi ara" className="flex h-12 w-12 items-center justify-center rounded-xl border border-line">
                  <Phone className="h-5 w-5" aria-hidden="true" />
                </a>
                <a href={wa(`Merhaba ${order.customerName}, `)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-12 w-12 items-center justify-center rounded-xl border border-line">
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <a
                href={wa(`Merhaba ${order.customerName}, ${formatPlate(order.plate)} plakalı aracınızın durumunu buradan takip edebilirsiniz:\n${trackUrl}\n\n${businessName}`)}
                target="_blank"
                rel="noreferrer"
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-raised text-sm"
              >
                <Send className="h-4 w-4" aria-hidden="true" /> Takip linki gönder
              </a>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(trackUrl);
                    toast.success("Takip bağlantısı kopyalandı");
                  } catch {
                    window.prompt("Takip bağlantısı:", trackUrl);
                  }
                }}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-raised text-sm"
              >
                <Copy className="h-4 w-4" aria-hidden="true" /> Linki kopyala
              </button>
            </div>
          </Card>

          <Card className="grid grid-cols-2 gap-3 p-4">
            <label className="space-y-1.5">
              <span className="block text-sm font-medium">Usta</span>
              <select
                className={selectClass}
                defaultValue={order.technicianId}
                disabled={pending || closed}
                onChange={(e) => run(() => assignWork(order.id, "technicianId", e.target.value), "Usta kaydedildi")}
              >
                <option value="">Atanmadı</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="block text-sm font-medium">İstasyon</span>
              <select
                className={selectClass}
                defaultValue={order.stationId}
                disabled={pending || closed}
                onChange={(e) => run(() => assignWork(order.id, "stationId", e.target.value), "İstasyon kaydedildi")}
              >
                <option value="">Seçilmedi</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            {(order.mileage || order.fuelLevel) && (
              <p className="col-span-2 text-sm text-muted">
                {[order.mileage && `${order.mileage.toLocaleString("tr-TR")} km`, order.fuelLevel && `Yakıt ${order.fuelLevel === "DOLU" ? "dolu" : order.fuelLevel}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {order.notes && <p className="col-span-2 rounded-lg bg-raised px-3 py-2 text-sm">{order.notes}</p>}
          </Card>

          <Link
            href={`/is/${order.id}/kayit`}
            className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Hasar, boya ölçümü ve fotoğraflar</span>
              <span className="block text-sm text-muted">
                {order.record.marks} hasar · {order.record.readings} ölçüm · {order.record.photos} fotoğraf
                {order.record.approved ? " · müşteri onayladı" : ""}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          </Link>

          <Card className="p-4">
            <Eyebrow>Yapılacak işler</Eyebrow>
            <ul className="mt-2 divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block font-medium">{i.name}</span>
                    {i.detail && <span className="block text-sm text-muted">{i.detail}</span>}
                  </span>
                  <span className="shrink-0 font-display font-semibold tabular-nums">{formatTL(i.price)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card id="tahsilat" className="scroll-mt-4 p-4">
            <div className="grid grid-cols-3 divide-x divide-line text-center">
              <div>
                <p className="text-xs text-muted">Toplam</p>
                <p className="font-display text-lg font-bold tabular-nums">{formatTL(order.total)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Ödenen</p>
                <p className="font-display text-lg font-bold tabular-nums text-ready">{formatTL(order.paid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Kalan</p>
                <p className={cn("font-display text-lg font-bold tabular-nums", remaining > 0 ? "text-danger" : "text-muted")}>{formatTL(remaining)}</p>
              </div>
            </div>

            {payOpen && remaining > 0 && (
              <div className="mt-4 space-y-3 rounded-xl border border-accent/50 bg-raised p-3">
                <Button
                  className="w-full"
                  disabled={pending}
                  onClick={() => run(() => addPayment(order.id, String(remaining), method), "Tahsilat kaydedildi", () => setPayOpen(false))}
                >
                  <Check className="h-4 w-4" aria-hidden="true" /> Kalanın tamamı: {formatTL(remaining)}
                </Button>
                <div className="grid grid-cols-3 gap-2" role="group" aria-label="Ödeme şekli">
                  {METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      aria-pressed={method === m.value}
                      onClick={() => setMethod(m.value)}
                      className={cn("h-11 rounded-xl text-sm", method === m.value ? "bg-accent font-semibold text-accent-ink" : "border border-line")}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="Başka tutar" className="h-11" />
                  <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => addPayment(order.id, amount, method), "Tahsilat kaydedildi", () => setPayOpen(false))}>
                    Kaydet
                  </Button>
                </div>
              </div>
            )}
            {!payOpen && remaining > 0 && !closed && (
              <Button variant="secondary" className="mt-4 w-full" onClick={openPay}>
                <Wallet className="h-4 w-4" aria-hidden="true" /> Tahsilat al
              </Button>
            )}

            {order.payments.length > 0 && (
              <ul className="mt-3 divide-y divide-line border-t border-line">
                {order.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      <span className="font-semibold tabular-nums text-ready">{formatTL(p.amount)}</span>{" "}
                      <span className="text-muted">
                        {methodLabel(p.method)} · {new Date(p.paidAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
                        {p.note && ` · ${p.note}`}
                      </span>
                    </span>
                    {!closed && (
                      <button
                        type="button"
                        aria-label="Tahsilatı sil"
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-raised"
                        onClick={() => window.confirm("Bu tahsilat silinsin mi?") && run(() => deletePayment(order.id, p.id), "Tahsilat silindi")}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <Eyebrow>Geçmiş</Eyebrow>
            <ol className="mt-2 space-y-2">
              {order.events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="w-24 shrink-0 tabular-nums text-muted">
                    {new Date(e.at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
                  </span>
                  <span>
                    <span className="font-medium">{STAGES[e.stage].label}</span>
                    {(e.by || e.note) && <span className="text-muted"> · {[e.by, e.note].filter(Boolean).join(" · ")}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>

          {!closed && (
            <Card className="divide-y divide-line">
              {order.stage === "READY" && (
                <button type="button" disabled={pending} onClick={() => move("VALET_DELIVERY")} className="flex h-14 w-full items-center gap-3 px-4 text-left">
                  <Truck className="h-5 w-5 text-muted" aria-hidden="true" /> Vale ile gönder
                </button>
              )}
              {order.stage === "QUALITY_CHECK" && (
                <button type="button" disabled={pending} onClick={() => move("DETAILING")} className="flex h-14 w-full items-center gap-3 px-4 text-left">
                  <RotateCcw className="h-5 w-5 text-muted" aria-hidden="true" /> Düzeltme için Detailing&apos;e geri al
                </button>
              )}
              {canMove(order.stage, "CANCELLED") && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => window.confirm(`${order.number} iptal edilsin mi?`) && move("CANCELLED")}
                  className="flex h-14 w-full items-center gap-3 px-4 text-left text-danger"
                >
                  <Ban className="h-5 w-5" aria-hidden="true" /> İş emrini iptal et
                </button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* The next move, always in reach above the tab bar */}
      {!closed && step && (
        <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 -mx-4 mt-5 border-t border-line bg-ground/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0">
          <div className="mx-auto flex max-w-5xl gap-2">
            {collectFirst ? (
              <Button size="lg" className="flex-1" onClick={openPay}>
                <Wallet className="h-5 w-5" aria-hidden="true" /> Tahsilat al · {formatTL(remaining)}
              </Button>
            ) : (
              <Button size="lg" className="flex-1" disabled={pending} onClick={() => move(step.target)}>
                {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Check className="h-5 w-5" aria-hidden="true" />}
                {step.label}
              </Button>
            )}
            {collectFirst && (
              <Button size="lg" variant="secondary" disabled={pending} onClick={() => window.confirm("Kalan tutar alınmadan teslim edilsin mi?") && move("DELIVERED")}>
                Teslim et
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
