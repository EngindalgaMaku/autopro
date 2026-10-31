import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { generateQrDataUrl } from "@/lib/qr";
import type { ItemDetails } from "@/lib/service-kinds";
import { CertificateView, type CertificateData } from "./certificate-view";

export const metadata = {
  title: "Dijital Garanti Sertifikası",
  description: "Resmi AutoPro Detailing Garanti ve Orijinallik Belgesi",
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
      customer: { select: { name: true, phone: true } },
      technician: { select: { name: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  const baseDate = order.deliveredAt ?? order.createdAt;
  const fmt = (d: Date) =>
    d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Istanbul",
    });

  // Extract warranties from items or provide detailing protection warranties
  const warranties: CertificateData["warranties"] = order.items
    .filter((i) => {
      const d = (i.details ?? {}) as ItemDetails;
      return Boolean(d.warrantyMonths) || ["CERAMIC", "PPF", "WINDOW_FILM"].includes(i.kind);
    })
    .map((i) => {
      const d = (i.details ?? {}) as ItemDetails;
      const months = d.warrantyMonths || (i.kind === "CERAMIC" ? 36 : i.kind === "PPF" ? 60 : 24);
      const until = new Date(baseDate);
      until.setMonth(until.getMonth() + months);

      return {
        id: i.id,
        serviceName: i.name,
        productName: d.product ?? null,
        kind: i.kind,
        warrantyMonths: months,
        startDate: fmt(baseDate),
        endDate: fmt(until),
        isActive: until > new Date(),
      };
    });

  // If no specific ceramic/PPF item was added, create a general workmanship warranty entry
  if (warranties.length === 0) {
    const until = new Date(baseDate);
    until.setMonth(until.getMonth() + 12);
    warranties.push({
      id: "gen-1",
      serviceName: "AutoPro Profesyonel Detailing & Koruma",
      productName: "Premium Studio Care",
      kind: "GENERAL",
      warrantyMonths: 12,
      startDate: fmt(baseDate),
      endDate: fmt(until),
      isActive: until > new Date(),
    });
  }

  const certificateUrl = `https://autopro.app/t/${token}/sertifika`;
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
