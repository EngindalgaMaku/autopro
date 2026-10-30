"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { StationType, VehicleSegment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseTL } from "@/lib/money";
import { canManage, requireUser } from "@/lib/session";

export interface ActionResult {
  ok?: boolean;
  error?: string;
}

async function manager() {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("Hizmet ve fiyatları yalnızca işletme sahibi ve yöneticiler değiştirebilir");
  return user;
}

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Hizmet adını yazın").max(80),
  description: z.string().trim().max(160).optional(),
  basePrice: z.string().transform((v, ctx) => {
    const n = parseTL(v);
    if (n === null || n > 10_000_000) {
      ctx.addIssue({ code: "custom", message: "Fiyatı rakamla yazın, örneğin 1.250" });
      return z.NEVER;
    }
    return n;
  }),
  durationMinutes: z.coerce.number().int().min(10).max(60 * 24 * 7),
  stationType: z.union([z.nativeEnum(StationType), z.literal("")]),
  reminderMonths: z.union([z.coerce.number().int().min(1).max(36), z.literal("")]),
});

export async function saveService(form: FormData): Promise<ActionResult> {
  try {
    const user = await manager();
    const parsed = serviceSchema.safeParse(Object.fromEntries(form.entries()));
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { id, ...d } = parsed.data;
    const data = {
      name: d.name,
      description: d.description || null,
      basePrice: d.basePrice,
      durationMinutes: d.durationMinutes,
      stationType: d.stationType || null,
      reminderMonths: d.reminderMonths === "" ? null : d.reminderMonths,
    };
    if (id) {
      const { count } = await prisma.service.updateMany({ where: { id, businessId: user.businessId }, data });
      if (!count) return { error: "Hizmet bulunamadı" };
    } else {
      const last = await prisma.service.aggregate({ where: { businessId: user.businessId }, _max: { sortOrder: true } });
      await prisma.service.create({
        data: { ...data, businessId: user.businessId, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
    }
    revalidatePath("/hizmetler");
    revalidatePath("/bugun");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Kaydedilemedi" };
  }
}

/** Hidden from the intake list; kept because past work orders refer to it */
export async function setServiceActive(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    const user = await manager();
    await prisma.service.updateMany({ where: { id, businessId: user.businessId }, data: { isActive } });
    revalidatePath("/hizmetler");
    revalidatePath("/bugun");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Kaydedilemedi" };
  }
}

/** Deleting is only for services never used on a work order; others can be hidden */
export async function deleteService(id: string): Promise<ActionResult> {
  try {
    const user = await manager();
    const used = await prisma.workOrderItem.count({ where: { serviceId: id, workOrder: { businessId: user.businessId } } });
    if (used) return { error: "Bu hizmet iş emirlerinde kullanıldı; silmek yerine gizleyin" };
    await prisma.service.deleteMany({ where: { id, businessId: user.businessId } });
    revalidatePath("/hizmetler");
    revalidatePath("/bugun");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Silinemedi" };
  }
}

export async function saveMultipliers(form: FormData): Promise<ActionResult> {
  try {
    const user = await manager();
    const rows: Array<{ segment: VehicleSegment; multiplier: number }> = [];
    for (const segment of Object.values(VehicleSegment)) {
      const raw = String(form.get(segment) ?? "").replace(",", ".");
      const multiplier = Number(raw);
      if (!raw || !Number.isFinite(multiplier) || multiplier < 0.1 || multiplier > 9.99) {
        return { error: "Katsayılar 0,1 ile 9,99 arasında olmalı" };
      }
      rows.push({ segment, multiplier: Math.round(multiplier * 100) / 100 });
    }
    await prisma.$transaction(
      rows.map(({ segment, multiplier }) =>
        prisma.segmentMultiplier.upsert({
          where: { businessId_segment: { businessId: user.businessId, segment } },
          update: { multiplier },
          create: { businessId: user.businessId, segment, multiplier },
        })
      )
    );
    revalidatePath("/hizmetler");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Kaydedilemedi" };
  }
}
