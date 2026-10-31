import type { VehicleSegment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canManage, requireUser } from "@/lib/session";
import { SEGMENTS } from "@/lib/stages";
import { ServicesEditor } from "./services-editor";

export const metadata = { title: "Hizmetler ve Fiyatlar" };

export default async function ServicesPage() {
  const user = await requireUser();
  const [services, multipliers, packages] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: user.businessId },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
    }),
    prisma.segmentMultiplier.findMany({ where: { businessId: user.businessId } }),
    prisma.servicePackage.findMany({
      where: { businessId: user.businessId },
      orderBy: { sortOrder: "asc" },
      include: { items: { select: { serviceId: true } } },
    }),
  ]);

  const factor = Object.fromEntries(
    (Object.keys(SEGMENTS) as VehicleSegment[]).map((s) => [
      s,
      Number(multipliers.find((m) => m.segment === s)?.multiplier ?? SEGMENTS[s].defaultMultiplier),
    ])
  ) as Record<VehicleSegment, number>;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8">
      <ServicesEditor
        canEdit={canManage(user.role)}
        multipliers={factor}
        packages={packages.map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          serviceIds: p.items.map((i) => i.serviceId),
        }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.kind,
          defaultProduct: s.defaultProduct ?? "",
          warrantyMonths: s.warrantyMonths,
          description: s.description ?? "",
          basePrice: Number(s.basePrice),
          durationMinutes: s.durationMinutes,
          stationType: s.stationType ?? "",
          reminderMonths: s.reminderMonths,
          isActive: s.isActive,
        }))}
      />
    </div>
  );
}
