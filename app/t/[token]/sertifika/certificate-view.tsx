"use client";

import Link from "next/link";
import { ArrowLeft, Award, CheckCircle2, Copy, Printer, QrCode, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/phone";
import { printPage } from "@/lib/print";
import { formatPlate } from "@/lib/plate";
import { warrantyLabel } from "@/lib/service-kinds";

export interface CertificateData {
  certNumber: string;
  orderNumber: string;
  trackingToken: string;
  appliedDate: string;
  business: {
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
  technicianName: string | null;
  customerName: string;
  vehicle: {
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    mileage: number | null;
  };
  warranties: Array<{
    id: string;
    serviceName: string;
    productName: string | null;
    warrantyMonths: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>;
  qrDataUrl: string;
  certificateUrl: string;
}

export function CertificateView({ data }: { data: CertificateData }) {
  const {
    certNumber,
    appliedDate,
    business,
    technicianName,
    customerName,
    vehicle,
    warranties,
    qrDataUrl,
    certificateUrl,
  } = data;

  const handlePrint = () => printPage("Garanti belgesi");

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl);
      toast.success("Belgenin bağlantısı kopyalandı");
    } catch {
      window.prompt("Belgenin bağlantısı:", certificateUrl);
    }
  };

  return (
    <div className="min-h-screen bg-ground px-4 pb-8 pt-[calc(2rem+env(safe-area-inset-top))] text-ink print:bg-white print:p-0 print:text-slate-900">
      {/* On-screen controls */}
      <div className="no-print mx-auto mb-6 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xl">
        <Link
          href={`/t/${data.trackingToken}`}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Takip Sayfasına Dön
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-3.5 py-2 text-xs font-semibold text-ink transition hover:bg-surface"
          >
            <Copy className="h-3.5 w-3.5 text-accent-strong" />
            Bağlantıyı Kopyala
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-ink transition hover:bg-accent-hover"
          >
            <Printer className="h-4 w-4" />
            Yazdır / PDF
          </button>
        </div>
      </div>

      {/* Luxury Certificate Card */}
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border-2 border-accent/40 bg-surface p-5 sm:p-8 shadow-2xl relative print:border-2 print:border-slate-800 print:bg-white print:p-8 print:shadow-none print:text-slate-950">
        {/* Subtle decorative glow watermark */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent/5 blur-3xl print:hidden" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/5 blur-3xl print:hidden" />

        {/* Certificate Header */}
        <div className="border-b border-line/60 pb-6 text-center print:border-slate-300">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/60 bg-accent/10 text-accent-strong print:border-slate-800 print:text-slate-900">
            <Award className="h-8 w-8" />
          </div>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-extrabold uppercase tracking-wide text-ink print:text-slate-950">
            GARANTİ BELGESİ
          </h1>
          <p className="mt-1 font-mono text-xs text-muted print:text-slate-600">
            Belge No: <strong className="text-ink font-bold print:text-slate-950">{certNumber}</strong>
          </p>
        </div>

        {/* Vehicle & Studio Details Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 rounded-2xl border border-line/50 bg-raised/40 p-4 print:border-slate-300 print:bg-slate-50">
          {/* Vehicle info */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted print:text-slate-500">
              Araç
            </p>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded border border-line bg-sunken px-2 py-0.5 font-mono text-sm font-black text-ink print:border-slate-800 print:bg-white print:text-slate-950">
                <span className="mr-1 rounded bg-blue-600 px-1 text-[9px] font-bold text-white">TR</span>
                {formatPlate(vehicle.plate)}
              </span>
              <p className="font-semibold text-ink print:text-slate-950">
                {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
              </p>
            </div>
            <p className="text-xs text-muted print:text-slate-600">
              {[vehicle.year && `${vehicle.year} Model`, vehicle.color, vehicle.mileage && `${vehicle.mileage.toLocaleString("tr-TR")} KM`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-xs text-muted pt-1 print:text-slate-600">
              Müşteri: <strong className="text-ink print:text-slate-950">{customerName}</strong>
            </p>
          </div>

          {/* Workshop info */}
          <div className="space-y-1 sm:border-l sm:border-line/40 sm:pl-4 print:border-slate-300">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted print:text-slate-500">
              Uygulayan Atölye
            </p>
            <p className="font-semibold text-ink print:text-slate-950">{business.name}</p>
            <p className="text-xs text-muted print:text-slate-600">
              {[[business.address, business.city].filter(Boolean).join(", "), business.phone && `Tel: ${formatPhone(business.phone)}`].filter(Boolean).join(" · ")}
            </p>
            {technicianName && (
              <p className="text-xs text-muted pt-1 print:text-slate-600">
                Usta: <strong className="text-ink print:text-slate-950">{technicianName}</strong>
              </p>
            )}
            <p className="text-xs text-muted print:text-slate-600">
              Teslim Tarihi: <strong className="text-ink print:text-slate-950">{appliedDate}</strong>
            </p>
          </div>
        </div>

        {/* Applied Warranted Protections */}
        <div className="mt-6 space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-strong print:text-slate-900">
            <Sparkles className="h-4 w-4" />
            Garantili İşler
          </p>

          <div className="space-y-2.5">
            {warranties.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/60 bg-raised/70 p-4 transition print:border-slate-300 print:bg-white"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink print:text-slate-950">{w.serviceName}</p>
                    {w.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ready/15 px-2 py-0.5 text-[10px] font-bold text-ready print:bg-emerald-100 print:text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        Süresi devam ediyor
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger print:bg-rose-100 print:text-rose-800">
                        Süresi doldu
                      </span>
                    )}
                  </div>
                  {w.productName && (
                    <p className="font-mono text-xs text-accent-strong print:text-slate-700">
                      Ürün: <strong>{w.productName}</strong>
                    </p>
                  )}
                  <p className="text-xs text-muted print:text-slate-600">
                    Başlangıç: {w.startDate} · Bitiş: <strong className="text-ink print:text-slate-900">{w.endDate}</strong>
                  </p>
                </div>

                <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-1.5 text-right print:border-slate-300 print:bg-slate-100">
                  <p className="text-[10px] uppercase tracking-wider text-muted print:text-slate-600">Süre</p>
                  <p className="font-display text-base font-bold text-accent-strong print:text-slate-950">
                    {warrantyLabel(w.warrantyMonths)} garanti
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-xs text-muted print:text-slate-600">Garanti koşulları {business.name} tarafından belirlenir.</p>

        {/* QR back to this document */}
        <div className="mt-6 border-t border-line/60 pt-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Belgenin QR kodu" className="h-20 w-20 rounded-xl border border-accent/40 bg-white p-1 shadow print:border-slate-800" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-line bg-raised text-muted">
                <QrCode className="h-10 w-10" />
              </div>
            )}
            <p className="text-[11px] text-muted max-w-xs leading-tight print:text-slate-600">
              Okutulduğunda bu belgenin çevrimiçi hâli açılır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
