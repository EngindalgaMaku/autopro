import { notFound } from "next/navigation";
import { Plate } from "@/components/plate";
import { Card } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { whatsappNumber } from "@/lib/phone";
import { BOARD_STAGES, STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";

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
      items: { select: { name: true, totalPrice: true } },
      payments: { select: { amount: true } },
    },
  });
  if (!order) notFound();

  const paid = order.payments.reduce((s, p) => s + Number(p.amount), 0);
  const total = Number(order.totalAmount);
  const remaining = Math.max(0, total - paid);
  const stageIndex = BOARD_STAGES.indexOf(order.stage);
  const finished = order.stage === "DELIVERED" || order.stage === "VALET_DELIVERY";
  const steps = ["Kabul", "Yıkama", "Uygulama", "Kontrol", "Hazır"];

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
          <p className={cn("font-display text-[26px] font-bold", order.stage === "READY" ? "text-ready" : "text-accent")}>
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

      <Card className="p-4">
        <h2 className="mb-2 font-display text-lg font-semibold">Yapılan işler</h2>
        <ul className="divide-y divide-line">
          {order.items.map((i) => (
            <li key={i.name} className="flex justify-between gap-3 py-2 text-sm">
              <span>{i.name}</span>
              <span className="tabular-nums">{formatTL(i.totalPrice)}</span>
            </li>
          ))}
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
