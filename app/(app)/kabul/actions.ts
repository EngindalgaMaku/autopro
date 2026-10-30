"use server";

import { z } from "zod";
import { PaymentMethod, Prisma, VehicleSegment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { newTrackingToken, newWorkOrderNumber } from "@/lib/ids";
import { segmentPrice } from "@/lib/money";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { isValidPlate, normalizePlate } from "@/lib/plate";
import { requireUser } from "@/lib/session";

export interface VehicleMatch {
  vehicleId: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  segment: VehicleSegment;
  customer: { id: string; name: string; phone: string; notes: string | null };
  visits: number;
  lastVisit: { date: string; summary: string } | null;
  openOrder: { id: string; number: string } | null;
}

/** The car behind a plate, with its owner and history; null for a car seen for the first time */
export async function findByPlate(plate: string): Promise<VehicleMatch | null> {
  const user = await requireUser();
  if (!isValidPlate(plate)) return null;
  const vehicle = await prisma.vehicle.findUnique({
    where: { businessId_plate: { businessId: user.businessId, plate: normalizePlate(plate) } },
    include: {
      customer: { select: { id: true, name: true, phone: true, notes: true } },
      workOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, number: true, stage: true, createdAt: true, items: { select: { name: true } } },
      },
      _count: { select: { workOrders: { where: { stage: { not: "CANCELLED" } } } } },
    },
  });
  if (!vehicle) return null;
  const last = vehicle.workOrders[0];
  const open = last && !["DELIVERED", "CANCELLED"].includes(last.stage) ? last : null;
  return {
    vehicleId: vehicle.id,
    plate: vehicle.plate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    color: vehicle.color,
    segment: vehicle.segment,
    customer: vehicle.customer,
    visits: vehicle._count.workOrders,
    lastVisit: last
      ? {
          date: last.createdAt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }),
          summary: last.items.map((i) => i.name).join(", "),
        }
      : null,
    openOrder: open ? { id: open.id, number: open.number } : null,
  };
}

/** An existing customer for a typed phone number (a second car of the same family, say) */
export async function findCustomerByPhone(phone: string) {
  const user = await requireUser();
  if (!isValidPhone(phone)) return null;
  return prisma.customer.findUnique({
    where: { businessId_phone: { businessId: user.businessId, phone: normalizePhone(phone) } },
    select: { id: true, name: true, _count: { select: { vehicles: true } } },
  });
}

const intakeSchema = z.object({
  plate: z.string().refine(isValidPlate, "Plakayı 34 ABC 789 biçiminde yazın"),
  vehicleId: z.string().optional(),
  brand: z.string().trim().max(40).optional(),
  model: z.string().trim().max(60).optional(),
  year: z.number().int().min(1950).max(2100).optional(),
  color: z.string().trim().max(40).optional(),
  segment: z.nativeEnum(VehicleSegment),
  customerName: z.string().trim().min(2, "Müşterinin adını yazın").max(80),
  customerPhone: z.string().refine(isValidPhone, "Telefonu 05XX XXX XX XX biçiminde yazın"),
  mileage: z.number().int().min(0).max(3_000_000).optional(),
  fuelLevel: z.enum(["1/4", "1/2", "3/4", "DOLU"]).optional(),
  items: z
    .array(z.object({ serviceId: z.string(), price: z.number().min(0).max(10_000_000) }))
    .min(1, "En az bir hizmet seçin"),
  promisedAt: z.string().datetime({ offset: true }).optional(),
  stationId: z.string().optional(),
  deposit: z.number().min(0).max(10_000_000).optional(),
  depositMethod: z.nativeEnum(PaymentMethod).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

export async function createWorkOrder(
  input: IntakeInput
): Promise<{ error: string } | { id: string; number: string; trackingToken: string }> {
  const user = await requireUser();
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const businessId = user.businessId;
  const plate = normalizePlate(d.plate);
  const phone = normalizePhone(d.customerPhone);

  // Everything the client sent by id must belong to this business
  const [services, multiplier, station] = await Promise.all([
    prisma.service.findMany({ where: { businessId, id: { in: d.items.map((i) => i.serviceId) } } }),
    prisma.segmentMultiplier.findUnique({ where: { businessId_segment: { businessId, segment: d.segment } } }),
    d.stationId ? prisma.station.findFirst({ where: { id: d.stationId, businessId } }) : null,
  ]);
  if (services.length !== new Set(d.items.map((i) => i.serviceId)).size) return { error: "Seçilen hizmetlerden biri bulunamadı" };
  if (d.stationId && !station) return { error: "İstasyon bulunamadı" };
  const factor = Number(multiplier?.multiplier ?? 1);

  const items = d.items.map((i) => {
    const s = services.find((x) => x.id === i.serviceId)!;
    return {
      serviceId: s.id,
      name: s.name,
      basePrice: s.basePrice,
      multiplier: factor,
      quantity: 1,
      // The price list gives the starting point; the shop may agree another price at the counter
      totalPrice: new Prisma.Decimal(Math.round(i.price * 100) / 100),
      listPrice: segmentPrice(Number(s.basePrice), factor),
    };
  });
  const total = items.reduce((sum, i) => sum + Number(i.totalPrice), 0);
  const deposit = Math.min(d.deposit ?? 0, total);

  const order = await prisma.$transaction(async (tx) => {
    // The customer is the phone number; a known number keeps its record (name updated)
    const customer = await tx.customer.upsert({
      where: { businessId_phone: { businessId, phone } },
      update: { name: d.customerName },
      create: { businessId, phone, name: d.customerName },
    });
    const vehicleData = {
      customerId: customer.id,
      brand: d.brand || null,
      model: d.model || null,
      year: d.year ?? null,
      color: d.color || null,
      segment: d.segment,
    };
    const vehicle = await tx.vehicle.upsert({
      where: { businessId_plate: { businessId, plate } },
      update: vehicleData,
      create: { businessId, plate, ...vehicleData },
    });

    let number = newWorkOrderNumber();
    while (await tx.workOrder.findUnique({ where: { number }, select: { id: true } })) number = newWorkOrderNumber();

    const created = await tx.workOrder.create({
      data: {
        businessId,
        number,
        trackingToken: newTrackingToken(),
        customerId: customer.id,
        vehicleId: vehicle.id,
        stationId: station?.id ?? null,
        mileage: d.mileage ?? null,
        fuelLevel: d.fuelLevel ?? null,
        promisedAt: d.promisedAt ? new Date(d.promisedAt) : null,
        totalAmount: total,
        notes: d.notes || null,
        createdById: user.id,
        items: { create: items.map(({ listPrice: _l, ...i }) => i) },
        events: { create: { stage: "RECEIVED", note: "Araç teslim alındı", userId: user.id } },
        inspection: { create: { createdById: user.id } },
        ...(deposit > 0 && {
          payments: {
            create: { amount: deposit, method: d.depositMethod ?? "CASH", note: "Kabulde alınan kapora", createdById: user.id },
          },
        }),
      },
    });
    return created;
  });

  return { id: order.id, number: order.number, trackingToken: order.trackingToken };
}
