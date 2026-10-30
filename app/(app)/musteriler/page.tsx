import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { Plate } from "@/components/plate";
import { Card, Input } from "@/components/ui";
import { prisma } from "@/lib/db";
import { formatTL } from "@/lib/money";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { normalizePlate } from "@/lib/plate";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Müşteriler" };
export const dynamic = "force-dynamic";

const PAGE = 50;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);

  // One box for everything a counter hears: a plate, a name or a phone number
  const or: Prisma.CustomerWhereInput[] = [];
  if (q) {
    or.push({ name: { contains: q } });
    const plate = normalizePlate(q);
    if (plate.length >= 2) or.push({ vehicles: { some: { plate: { contains: plate } } } });
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 3) or.push({ phone: { contains: digits.length >= 10 ? normalizePhone(digits) : digits } });
  }

  const customers = await prisma.customer.findMany({
    where: { businessId: user.businessId, ...(or.length && { OR: or }) },
    orderBy: { createdAt: "desc" },
    take: PAGE,
    include: {
      vehicles: { select: { plate: true, brand: true, model: true } },
      workOrders: {
        where: { stage: { not: "CANCELLED" } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, totalAmount: true, payments: { select: { amount: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-6 md:px-8">
      <header>
        <h1 className="font-display text-[28px] font-bold">Müşteriler</h1>
      </header>

      <form role="search" className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input name="q" defaultValue={q} placeholder="Plaka, ad veya telefon" aria-label="Müşteri ara" className="h-14 pl-12 text-lg" autoComplete="off" />
      </form>

      {customers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          {q ? `“${q}” ile eşleşen müşteri yok.` : "Henüz müşteri yok. İlk araç kabulünde müşteri kaydı kendiliğinden açılır."}
        </Card>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => {
            const debt = c.workOrders.reduce(
              (s, o) => s + Math.max(0, Number(o.totalAmount) - o.payments.reduce((p, x) => p + Number(x.amount), 0)),
              0
            );
            const last = c.workOrders[0]?.createdAt;
            return (
              <li key={c.id}>
                <Link href={`/musteriler/${c.id}`} className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 transition-colors hover:border-line-strong">
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-sm text-muted">{formatPhone(c.phone)}</span>
                    </span>
                    {c.vehicles.length > 0 && (
                      <span className="flex flex-wrap gap-1.5">
                        {c.vehicles.map((v) => (
                          <Plate key={v.plate} plate={v.plate} size="xs" />
                        ))}
                      </span>
                    )}
                    <span className="block text-xs text-muted">
                      {c.workOrders.length} ziyaret
                      {last && ` · son ${last.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" })}`}
                      {debt > 0 && <span className="font-semibold text-danger"> · {formatTL(debt)} borç</span>}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {customers.length === PAGE && <p className="text-center text-sm text-muted">İlk {PAGE} sonuç gösteriliyor; aramayı daraltın.</p>}
    </div>
  );
}
