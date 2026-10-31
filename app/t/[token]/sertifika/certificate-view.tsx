"use client";

import Link from "next/link";
import { ArrowLeft, Award, CheckCircle2, Copy, Download, ExternalLink, Printer, QrCode, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/phone";
import { formatPlate } from "@/lib/plate";

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
    kind: string;
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

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl);
      toast.success("Sertifika doğrulama bağlantısı kopyalandı!");
    } catch {
      window.prompt("Sertifika bağlantısı:", certificateUrl);
    }
  };

  return (
    <div className="min-h-screen bg-ground px-4 py-8 text-ink print:bg-white print:p-0 print:text-slate-900">
      {/* On-screen controls */}
      <div className="no-print mx-auto mb-6 flex max-w-3xl items-center justify-between rounded-2xl border border-line bg-surface p-4 shadow-xl">
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
            <Copy className="h-3.5 w-3.5 text-accent" />
            Bağlantıyı Kopyala
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-ink transition hover:bg-accent-hover"
          >
            <Printer className="h-4 w-4" />
            Sertifikayı Yazdır / PDF
          </button>
        </div>
      </div>

      {/* Luxury Certificate Card */}
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border-2 border-accent/40 bg-gradient-to-b from-[#161c28] to-[#0e1117] p-8 shadow-2xl relative print:border-2 print:border-slate-800 print:bg-white print:p-8 print:shadow-none print:text-slate-950">
        {/* Subtle decorative glow watermark */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent/5 blur-3xl print:hidden" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-accent/5 blur-3xl print:hidden" />

        {/* Certificate Header */}
        <div className="border-b border-line/60 pb-6 text-center print:border-slate-300">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/60 bg-accent/10 text-accent print:border-slate-800 print:text-slate-900">
            <Award className="h-8 w-8" />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent print:text-slate-700">
            Resmi Detailing Uygulama & Orijinallik Belgesi
          </p>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-extrabold uppercase tracking-wide text-ink print:text-slate-950">
            DİJİTAL GARANTİ SERTİFİKASI
          </h1>
          <p className="mt-1 font-mono text-xs text-muted print:text-slate-600">
            Sertifika No: <strong className="text-ink font-bold print:text-slate-950">{certNumber}</strong>
          </p>
        </div>

        {/* Vehicle & Studio Details Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 rounded-2xl border border-line/50 bg-raised/40 p-4 print:border-slate-300 print:bg-slate-50">
          {/* Vehicle info */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted print:text-slate-500">
              Korumaya Alınan Araç
            </p>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center rounded border border-line bg-sunken px-2 py-0.5 font-mono text-sm font-black text-ink print:border-slate-800 print:bg-white print:text-slate-950">
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
              Ruhsat Sahibi: <strong className="text-ink print:text-slate-950">{customerName}</strong>
            </p>
          </div>

          {/* Workshop info */}
          <div className="space-y-1 sm:border-l sm:border-line/40 sm:pl-4 print:border-slate-300">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted print:text-slate-500">
              Yetkili Uygulama Merkezi
            </p>
            <p className="font-semibold text-ink print:text-slate-950">{business.name}</p>
            <p className="text-xs text-muted print:text-slate-600">
              {[business.address, business.city].filter(Boolean).join(", ")}
              {business.phone && ` · Tel: ${formatPhone(business.phone)}`}
            </p>
            <p className="text-xs text-muted pt-1 print:text-slate-600">
              Uygulayıcı Usta: <strong className="text-ink print:text-slate-950">{technicianName || "Sertifikalı Detailing Uzmanı"}</strong>
            </p>
            <p className="text-xs text-muted print:text-slate-600">
              Uygulama Tarihi: <strong className="text-ink print:text-slate-950">{appliedDate}</strong>
            </p>
          </div>
        </div>

        {/* Applied Warranted Protections */}
        <div className="mt-6 space-y-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent print:text-slate-900">
            <Sparkles className="h-4 w-4" />
            Uygulanan Koruma ve Garanti Kapsamı
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-ready/15 px-2 py-0.5 text-[10px] font-bold text-ready print:bg-emerald-100 print:text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" />
                      AKTİF KORUMA
                    </span>
                  </div>
                  {w.productName && (
                    <p className="font-mono text-xs text-accent print:text-slate-700">
                      Ürün: <strong>{w.productName}</strong>
                    </p>
                  )}
                  <p className="text-xs text-muted print:text-slate-600">
                    Başlangıç: {w.startDate} · Bitiş: <strong className="text-ink print:text-slate-900">{w.endDate}</strong>
                  </p>
                </div>

                <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-1.5 text-right print:border-slate-300 print:bg-slate-100">
                  <p className="text-[10px] uppercase tracking-wider text-muted print:text-slate-600">Süre</p>
                  <p className="font-display text-base font-bold text-accent print:text-slate-950">
                    {w.warrantyMonths} Ay Garanti
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Periodic Inspection & Care Guide */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-line/40 bg-raised/30 p-3 print:border-slate-300 print:bg-slate-50">
            <p className="font-bold text-ink mb-1 print:text-slate-900">1. Yıkama Kuralları</p>
            <p className="text-[11px] text-muted leading-relaxed print:text-slate-600">
              Araç yalnızca pH nötr şampuanlarla elle yıkanmalıdır. Sert fırçalar, kostikli deterjanlar ve otomatik fırçalı tüneller garantiyi geçersiz kılar.
            </p>
          </div>

          <div className="rounded-xl border border-line/40 bg-raised/30 p-3 print:border-slate-300 print:bg-slate-50">
            <p className="font-bold text-ink mb-1 print:text-slate-900">2. Yıllık Kontrol</p>
            <p className="text-[11px] text-muted leading-relaxed print:text-slate-600">
              Garantinin devamı için yılda en az 1 kez yetkili merkezimize gelinerek demir tozu temizliği ve seramik hidrofobi katman kontrolü yapılmalıdır.
            </p>
          </div>

          <div className="rounded-xl border border-line/40 bg-raised/30 p-3 print:border-slate-300 print:bg-slate-50">
            <p className="font-bold text-ink mb-1 print:text-slate-900">3. Garanti Devri</p>
            <p className="text-[11px] text-muted leading-relaxed print:text-slate-600">
              Araç satışı durumunda bu dijital sertifika yeni ruhsat sahibine devredilebilir ve ikinci el piyasasında araç değerine resmi katkı sağlar.
            </p>
          </div>
        </div>

        {/* Verification QR & Dual Stamp Section */}
        <div className="mt-8 border-t border-line/60 pt-6 flex flex-wrap items-center justify-between gap-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="Sertifika Doğrulama QR" className="h-20 w-20 rounded-xl border border-accent/40 bg-white p-1 shadow print:border-slate-800" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-line bg-raised text-muted">
                <QrCode className="h-10 w-10" />
              </div>
            )}
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-ink print:text-slate-950 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-ready" />
                Resmi Dijital Doğrulama
              </p>
              <p className="text-[11px] text-muted max-w-xs leading-tight print:text-slate-600">
                Bu QR kod okutulduğunda sertifikanın güncelliği ve araç şasi/plaka eşleşmesi anlık doğrulanır.
              </p>
            </div>
          </div>

          {/* Official Seal / Signature Stamp */}
          <div className="text-right">
            <div className="inline-block rounded-xl border border-dashed border-accent/50 bg-accent/5 p-3 text-center print:border-slate-400 print:bg-transparent">
              <p className="font-display font-bold text-xs uppercase tracking-wider text-accent print:text-slate-900">
                {business.name}
              </p>
              <p className="text-[10px] text-muted print:text-slate-500">Yetkili Uygulama & Kalite Onay Mührü</p>
              <div className="mt-2 text-[9px] font-mono text-ready print:text-slate-700">✓ ONAYLANDI</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
