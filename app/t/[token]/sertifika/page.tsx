import { notFound } from "next/navigation";
import { appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/qr";
import type { ItemDetails } from "@/lib/service-kinds";
import { CertificateView, type CertificateData } from "./certificate-view";

export const metadata = {
  title: "Garanti belgesi",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(token)) notFound();

  const order = await prisma.workOrder.findUnique({
    where: { trackingToken: token },
    include: {
      business: true,
      vehicle: true,
      customer: { select: { name: true } },
      technician: { select: { name: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order || order.stage !== "DELIVERED" || !order.deliveredAt) notFound();

  const baseDate = order.deliveredAt;
  const fmt = (d: Date) =>
    d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Istanbul",
    });

  // Only what the shop recorded, counted from the handover day: no recorded warranty, no document
  const warranties: CertificateData["warranties"] = order.items.flatMap((i) => {
    const d = (i.details ?? {}) as ItemDetails;
    if (!d.warrantyMonths) return [];
    const until = new Date(baseDate);
    until.setMonth(until.getMonth() + d.warrantyMonths);
    return [
      {
        id: i.id,
        serviceName: i.name,
        productName: d.product ?? null,
        warrantyMonths: d.warrantyMonths,
        startDate: fmt(baseDate),
        endDate: fmt(until),
        isActive: until > new Date(),
      },
    ];
  });
  if (warranties.length === 0) notFound();

  const certificateUrl = `${await appUrl()}/t/${token}/sertifika`;
  const qrDataUrl = await generateQrDataUrl(certificateUrl, 180);

  const certData: CertificateData = {
    certNumber: `GAR-${order.number.replace("AP-", "")}`,
    orderNumber: order.number,
    trackingToken: token,
    appliedDate: fmt(baseDate),
    business: {
      name: order.business.name,
      phone: order.business.phone,
      address: order.business.address,
      city: order.business.city,
    },
    technicianName: order.technician?.name ?? null,
    customerName: order.customer.name,
    vehicle: {
      plate: order.vehicle.plate,
      brand: order.vehicle.brand,
      model: order.vehicle.model,
      year: order.vehicle.year,
      color: order.vehicle.color,
      mileage: order.mileage,
    },
    warranties,
    qrDataUrl,
    certificateUrl,
  };

  return <CertificateView data={certData} />;
}
