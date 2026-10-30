import { NextRequest, NextResponse } from "next/server";
import { PhotoKind } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MAX_PHOTO_BYTES, savePhoto } from "@/lib/photos";
import { readSession } from "@/lib/session";

/** Upload one photo of a work order: kabul damage (tied to a mark), before or after */
export async function POST(request: NextRequest) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "Oturum yok" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const workOrderId = String(form?.get("workOrderId") ?? "");
  const kind = String(form?.get("kind") ?? "") as PhotoKind;
  const damageMarkId = String(form?.get("damageMarkId") ?? "") || null;

  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "Fotoğraf seçilmedi" }, { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: "Fotoğraf 8 MB'tan büyük" }, { status: 413 });
  if (!Object.values(PhotoKind).includes(kind)) return NextResponse.json({ error: "Geçersiz fotoğraf türü" }, { status: 400 });

  const order = await prisma.workOrder.findFirst({
    where: { id: workOrderId, businessId: session.businessId },
    select: { id: true, businessId: true, inspection: { select: { id: true } } },
  });
  if (!order) return NextResponse.json({ error: "İş emri bulunamadı" }, { status: 404 });
  if (damageMarkId) {
    const mark = await prisma.damageMark.count({ where: { id: damageMarkId, inspectionId: order.inspection?.id ?? "-" } });
    if (!mark) return NextResponse.json({ error: "Hasar işareti bulunamadı" }, { status: 404 });
  }

  try {
    const rel = await savePhoto(Buffer.from(await file.arrayBuffer()), order.businessId, order.id);
    const photo = await prisma.photo.create({
      data: { businessId: order.businessId, workOrderId: order.id, damageMarkId, kind, path: rel },
      select: { id: true },
    });
    return NextResponse.json({ id: photo.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fotoğraf kaydedilemedi" }, { status: 400 });
  }
}
