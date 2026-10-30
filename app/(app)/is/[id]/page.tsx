import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { detailSummary, type ItemDetails } from "@/lib/service-kinds";
import { WorkOrderView } from "./work-order-view";

export const metadata = { title: "İş emri" };
export const dynamic = "force-dynamic";

const DETAILING_KINDS = ["POLISH", "CERAMIC", "PPF", "WINDOW_FILM", "WHEEL"];

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [order, technicians, stations] = await Promise.all([
    prisma.workOrder.findFirst({
      where: { id, businessId: user.businessId },
      include: {
        vehicle: true,
        customer: { select: { name: true, phone: true } },
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } },
        events: { orderBy: { createdAt: "desc" } },
        inspection: { select: { customerApprovedAt: true, _count: { select: { marks: true, readings: true } } } },
        _count: { select: { photos: true } },
      },
    }),
    prisma.user.findMany({ where: { businessId: user.businessId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.station.findMany({ where: { businessId: user.businessId, isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!order) notFound();

  const names = new Map(technicians.map((t) => [t.id, t.name]));
  const paid = order.payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <WorkOrderView
      businessName={user.business.name}
      technicians={technicians}
      stations={stations}
      order={{
        id: order.id,
        number: order.number,
        trackingToken: order.trackingToken,
        stage: order.stage,
        plate: order.vehicle.plate,
        car: [order.vehicle.brand, order.vehicle.model, order.vehicle.color].filter(Boolean).join(" · "),
        customerName: order.customer.name,
        customerPhone: order.customer.phone,
        technicianId: order.technicianId ?? "",
        stationId: order.stationId ?? "",
        mileage: order.mileage,
        fuelLevel: order.fuelLevel,
        promisedAt: order.promisedAt?.toISOString() ?? null,
        notes: order.notes,
        total: Number(order.totalAmount),
        paid,
        needsDetailing: order.items.some((i) => DETAILING_KINDS.includes(i.kind)),
        record: {
          marks: order.inspection?._count.marks ?? 0,
          readings: order.inspection?._count.readings ?? 0,
          photos: order._count.photos,
          approved: !!order.inspection?.customerApprovedAt,
        },
        items: order.items.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(i.totalPrice),
          detail: [i.packageName && `Paket: ${i.packageName}`, detailSummary(i.kind, i.details as ItemDetails | null)].filter(Boolean).join(" · "),
        })),
        payments: order.payments.map((p) => ({ id: p.id, amount: Number(p.amount), method: p.method, note: p.note, paidAt: p.paidAt.toISOString() })),
        events: order.events.map((e) => ({
          id: e.id,
          stage: e.stage,
          note: e.note,
          at: e.createdAt.toISOString(),
          by: e.userId ? names.get(e.userId) ?? null : null,
        })),
      }}
    />
  );
}
