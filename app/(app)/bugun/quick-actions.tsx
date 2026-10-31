"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, QrCode, CalendarPlus, Wallet, Search } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { QRScannerDialog } from "@/components/qr-scanner-dialog";

export function QuickActionsRibbon() {
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        <Link
          href="/kabul"
          className={buttonStyles({
            variant: "primary",
            size: "md",
            className: "gap-2 shadow-md shadow-accent/20 flex-1 sm:flex-none justify-center",
          })}
        >
          <Plus className="h-4 w-4" />
          <span>Hızlı Araç Kabul</span>
        </Link>

        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className={buttonStyles({
            variant: "secondary",
            size: "md",
            className: "gap-2 flex-1 sm:flex-none justify-center hover:border-accent/40",
          })}
        >
          <QrCode className="h-4 w-4 text-accent" />
          <span>Barkod / QR Tara</span>
        </button>

        <Link
          href="/randevular"
          className={buttonStyles({
            variant: "secondary",
            size: "md",
            className: "gap-2 hidden sm:inline-flex",
          })}
        >
          <CalendarPlus className="h-4 w-4 text-muted" />
          <span>Randevu Oluştur</span>
        </Link>

        <Link
          href="/kasa"
          className={buttonStyles({
            variant: "secondary",
            size: "md",
            className: "gap-2 hidden md:inline-flex",
          })}
        >
          <Wallet className="h-4 w-4 text-ready" />
          <span>Kasa & Gider</span>
        </Link>
      </div>

      <QRScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} />
    </>
  );
}
