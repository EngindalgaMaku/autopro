import type { VehicleSegment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canManage, requireUser } from "@/lib/session";
import { SEGMENTS } from "@/lib/stages";
import { ServicesEditor } from "./services-editor";

export const metadata = { title: "Hizmetler ve Fiyatlar" };

export default async function ServicesPage() {
  const user = await requireUser();
  const [services, multipliers] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: user.businessId },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
    }),
    prisma.segmentMultiplier.findMany({ where: { businessId: user.businessId } }),
  ]);

  const factor = Object.fromEntries(
    (Object.keys(SEGMENTS) as VehicleSegment[]).map((s) => [
      s,
      Number(multipliers.find((m) => m.segment === s)?.multiplier ?? SEGMENTS[s].defaultMultiplier),
    ])
  ) as Record<VehicleSegment, number>;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 md:px-8">
      <ServicesEditor
        canEdit={canManage(user.role)}
        multipliers={factor}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
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
