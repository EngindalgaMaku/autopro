import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { InspectionEditor } from "./inspection-editor";

export const metadata = { title: "Hasar ve boya kaydı" };
export const dynamic = "force-dynamic";

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const order = await prisma.workOrder.findFirst({
    where: { id, businessId: user.businessId },
    include: {
      vehicle: { select: { plate: true, brand: true, model: true } },
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

  return (
    <InspectionEditor
      orderId={order.id}
      plate={order.vehicle.plate}
      car={[order.vehicle.brand, order.vehicle.model].filter(Boolean).join(" ")}
      approvedAt={ins?.customerApprovedAt?.toISOString() ?? null}
      marks={(ins?.marks ?? []).map((m) => ({ id: m.id, number: m.number, part: m.part, kind: m.kind, note: m.note, photoIds: m.photos.map((p) => p.id) }))}
      readings={(ins?.readings ?? []).map((r) => ({ part: r.part, phase: r.phase, microns: r.microns }))}
      photos={order.photos}
    />
  );
}
