import Link from "next/link";
import { Plus } from "lucide-react";
import type { WorkStage } from "@prisma/client";
import { buttonStyles } from "@/components/ui";
import { prisma } from "@/lib/db";
import { elapsed, whenLabel } from "@/lib/elapsed";
import { requireUser } from "@/lib/session";
import { BOARD_STAGES, STAGES } from "@/lib/stages";
import { Board, type BoardCard } from "./board";

export const metadata = { title: "Atölye" };
export const dynamic = "force-dynamic";

export default async function WorkshopPage() {
  const user = await requireUser();
  const businessId = user.businessId;
  const live: WorkStage[] = [...BOARD_STAGES, "VALET_DELIVERY"];

  const [orders, stations] = await Promise.all([
    prisma.workOrder.findMany({
      where: { businessId, stage: { in: live } },
      orderBy: [{ promisedAt: "asc" }, { createdAt: "asc" }],
      include: {
        vehicle: { select: { plate: true, brand: true, model: true } },
        items: { select: { name: true } },
        technician: { select: { name: true } },
        station: { select: { name: true } },
        payments: { select: { amount: true } },
        events: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.station.findMany({ where: { businessId, isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const now = new Date();
  const cards: BoardCard[] = orders.map((o) => {
    const paid = o.payments.reduce((s, p) => s + Number(p.amount), 0);
    const late = !!o.promisedAt && o.promisedAt < now && o.stage !== "READY" && o.stage !== "VALET_DELIVERY";
    return {
      id: o.id,
      stage: o.stage === "VALET_DELIVERY" ? "READY" : o.stage,
      valet: o.stage === "VALET_DELIVERY",
      plate: o.vehicle.plate,
      car: [o.vehicle.brand, o.vehicle.model].filter(Boolean).join(" "),
      work: o.items.map((i) => i.name).join(", "),
      who: o.technician?.name ?? null,
      station: o.station?.name ?? null,
      inStage: elapsed(o.events[0]?.createdAt ?? o.createdAt, now),
      promised: o.promisedAt ? whenLabel(o.promisedAt, now) : null,
      late,
      remaining: Math.max(0, Number(o.totalAmount) - paid),
    };
  });

  const busy = new Map<string, number>();
  for (const o of orders) if (o.stationId && o.stage !== "READY" && o.stage !== "VALET_DELIVERY") busy.set(o.stationId, (busy.get(o.stationId) ?? 0) + 1);

  return (
    <div className="px-4 pt-6 md:px-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold">Atölye</h1>
          <p className="text-sm text-muted">{orders.length} araç içeride</p>
        </div>
        <Link href="/kabul" className={buttonStyles({ className: "hidden md:inline-flex" })}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          Araç Kabul
        </Link>
      </header>

      {stations.length > 0 && (
        <section aria-label="İstasyonlar" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stations.map((s) => {
            const n = busy.get(s.id) ?? 0;
            return (
              <div key={s.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${n ? "bg-danger" : "bg-ready"}`} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{s.name}</span>
                  <span className="block text-xs text-muted">{n ? `Dolu · ${n} araç` : "Boş"}</span>
                </span>
              </div>
            );
          })}
        </section>
      )}

      <Board cards={cards} columns={BOARD_STAGES.map((s) => ({ stage: s, title: STAGES[s].label }))} />
    </div>
  );
}
