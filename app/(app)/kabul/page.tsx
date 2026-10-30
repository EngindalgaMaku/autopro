import type { VehicleSegment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { SEGMENTS } from "@/lib/stages";
import { IntakeForm } from "./intake-form";

export const metadata = { title: "Araç Kabul" };

export default async function IntakePage({ searchParams }: { searchParams: Promise<{ plaka?: string }> }) {
  const user = await requireUser();
  const { plaka } = await searchParams;
  const [services, multipliers, stations] = await Promise.all([
    prisma.service.findMany({
      where: { businessId: user.businessId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, description: true, basePrice: true, durationMinutes: true },
    }),
    prisma.segmentMultiplier.findMany({ where: { businessId: user.businessId } }),
    prisma.station.findMany({
      where: { businessId: user.businessId, isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const factor = Object.fromEntries(
    (Object.keys(SEGMENTS) as VehicleSegment[]).map((s) => [
      s,
      Number(multipliers.find((m) => m.segment === s)?.multiplier ?? SEGMENTS[s].defaultMultiplier),
    ])
  ) as Record<VehicleSegment, number>;

  return (
    <IntakeForm
      initialPlate={plaka ?? ""}
      businessName={user.business.name}
      multipliers={factor}
      stations={stations}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description ?? "",
        basePrice: Number(s.basePrice),
        durationMinutes: s.durationMinutes,
      }))}
    />
  );
}
