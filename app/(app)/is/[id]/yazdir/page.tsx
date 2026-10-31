import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/qr";
import { detailSummary, type ItemDetails } from "@/lib/service-kinds";
import { requireUser } from "@/lib/session";
import { PrintWorkOrderView, type PrintWorkOrderData } from "./print-view";

export const metadata = { title: "Yazdırılabilir İş Emri" };
export const dynamic = "force-dynamic";

export default async function PrintWorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const order = await prisma.workOrder.findFirst({
    where: { id, businessId: user.businessId },
    include: {
      business: true,
      vehicle: true,
      customer: true,
      station: { select: { name: true } },
      technician: { select: { name: true } },
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { paidAt: "asc" } },
      inspection: {
        include: {
          marks: { orderBy: { number: "asc" } },
          readings: true,
        },
      },
    },
  });

  if (!order) notFound();

  const paid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = Number(order.totalAmount);
  const remaining = Math.max(0, totalAmount - paid);

  // Generate QR code for tracking URL
  const qrUrl = `https://autopro.app/t/${order.trackingToken}`;
  const qrDataUrl = await generateQrDataUrl(qrUrl, 160);

  const printData: PrintWorkOrderData = {
    order: {
      id: order.id,
      number: order.number,
      trackingToken: order.trackingToken,
      createdAt: order.createdAt.toISOString(),
      promisedAt: order.promisedAt?.toISOString() ?? null,
      mileage: order.mileage,
      fuelLevel: order.fuelLevel,
      notes: order.notes,
      totalAmount,
      paid,
      remaining,
      technicianName: order.technician?.name ?? null,
      stationName: order.station?.name ?? null,
    },
    vehicle: {
      plate: order.vehicle.plate,
      brand: order.vehicle.brand,
      model: order.vehicle.model,
      year: order.vehicle.year,
      color: order.vehicle.color,
      segment: order.vehicle.segment,
    },
    customer: {
      name: order.customer.name,
      phone: order.customer.phone,
    },
    business: {
      name: order.business.name,
      phone: order.business.phone,
      address: order.business.address,
      city: order.business.city,
      taxNumber: order.business.taxNumber,
    },
    items: order.items.map((i) => ({
      id: i.id,
      name: i.name,
      packageName: i.packageName,
      detail: detailSummary(i.kind, i.details as ItemDetails | null) || null,
      price: Number(i.totalPrice),
    })),
    marks: (order.inspection?.marks ?? []).map((m) => ({
      id: m.id,
      number: m.number,
      part: m.part,
      kind: m.kind,
      note: m.note,
    })),
    readings: (order.inspection?.readings ?? []).map((r) => ({
      part: r.part,
      phase: r.phase,
      microns: r.microns,
    })),
    qrDataUrl,
  };

  return <PrintWorkOrderView data={printData} />;
}
