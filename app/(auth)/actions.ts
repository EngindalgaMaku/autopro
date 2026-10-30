"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ServiceKind, StationType, VehicleSegment } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { endSession, startSession } from "@/lib/session";
import { SEGMENTS } from "@/lib/stages";

export interface FormState {
  error?: string;
  fields?: Record<string, string>;
}

// A new workshop starts with the usual floor plan and service names. Prices, warranty terms
// and reminder intervals are left empty: they depend on the products the shop uses, so the
// owner sets them (Bugün shows a reminder for missing prices)
const STARTER_STATIONS: Array<{ name: string; type: StationType }> = [
  { name: "Yıkama peronu", type: "WASH_BAY" },
  { name: "Lift 1", type: "LIFT" },
  { name: "Detailing odası", type: "DETAILING_ROOM" },
  { name: "İç detay alanı", type: "INTERIOR" },
];

const STARTER_SERVICES: Array<{
  name: string;
  kind: ServiceKind;
  durationMinutes: number;
  stationType: StationType;
  reminderMonths?: number;
  warrantyMonths?: number;
}> = [
  { name: "Detaylı iç-dış temizlik", kind: "WASH", durationMinutes: 120, stationType: "WASH_BAY" },
  { name: "Pasta cila", kind: "POLISH", durationMinutes: 360, stationType: "DETAILING_ROOM" },
  { name: "Seramik kaplama", kind: "CERAMIC", durationMinutes: 960, stationType: "DETAILING_ROOM" },
  { name: "PPF ön paket", kind: "PPF", durationMinutes: 960, stationType: "DETAILING_ROOM" },
  { name: "Cam filmi", kind: "WINDOW_FILM", durationMinutes: 180, stationType: "DETAILING_ROOM" },
  { name: "Jant seramiği", kind: "WHEEL", durationMinutes: 120, stationType: "DETAILING_ROOM" },
  { name: "Koltuk yıkama", kind: "INTERIOR", durationMinutes: 180, stationType: "INTERIOR" },
  { name: "Ozon ile koku giderme", kind: "INTERIOR", durationMinutes: 45, stationType: "INTERIOR" },
  { name: "Motor temizliği", kind: "WASH", durationMinutes: 60, stationType: "WASH_BAY" },
];

const signUpSchema = z.object({
  businessName: z.string().trim().min(2, "İşletme adını yazın").max(100),
  name: z.string().trim().min(2, "Adınızı yazın").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta yazın"),
  phone: z.string().refine(isValidPhone, "Cep telefonunu 05XX XXX XX XX biçiminde yazın"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı").max(128),
  terms: z.literal("on", { errorMap: () => ({ message: "Kullanım şartlarını ve KVKK metnini onaylayın" }) }),
});

export async function signUp(_prev: FormState, form: FormData): Promise<FormState> {
  const fields = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  const parsed = signUpSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { ...fields, password: "" } };
  const data = parsed.data;

  if (await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } })) {
    return { error: "Bu e-posta ile bir hesap var; giriş yapın", fields: { ...fields, password: "" } };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({ data: { name: data.businessName, phone: normalizePhone(data.phone) } });
    await tx.station.createMany({
      data: STARTER_STATIONS.map((s, i) => ({ ...s, businessId: business.id, sortOrder: i })),
    });
    await tx.segmentMultiplier.createMany({
      data: (Object.keys(SEGMENTS) as VehicleSegment[]).map((segment) => ({
        businessId: business.id,
        segment,
        multiplier: SEGMENTS[segment].defaultMultiplier,
      })),
    });
    await tx.service.createMany({
      data: STARTER_SERVICES.map((s, i) => ({ ...s, businessId: business.id, basePrice: 0, sortOrder: i })),
    });
    return tx.user.create({
      data: {
        businessId: business.id,
        name: data.name,
        email: data.email,
        phone: normalizePhone(data.phone),
        passwordHash,
        role: "OWNER",
        lastLoginAt: new Date(),
      },
    });
  });

  await startSession({ userId: user.id, businessId: user.businessId, role: user.role });
  redirect("/bugun");
}

// Wrong passwords per e-mail, in memory: enough to slow down guessing on one server
const failures = new Map<string, { count: number; until: number }>();
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const fields = { email };

  const lock = failures.get(email);
  if (lock && lock.count >= LOCK_AFTER && lock.until > Date.now()) {
    return { error: "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.", fields };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!ok || !user) {
    const current = lock && lock.until > Date.now() ? lock.count : 0;
    failures.set(email, { count: current + 1, until: Date.now() + LOCK_MS });
    return { error: "E-posta veya şifre hatalı", fields };
  }

  failures.delete(email);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession({ userId: user.id, businessId: user.businessId, role: user.role });
  redirect("/bugun");
}

export async function signOut() {
  await endSession();
  redirect("/");
}
