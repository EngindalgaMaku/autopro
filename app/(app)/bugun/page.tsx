import Link from "next/link";
import { LogOut, Search } from "lucide-react";
import { Plate } from "@/components/plate";
import { buttonStyles, Card, Eyebrow } from "@/components/ui";
import { prisma } from "@/lib/db";
import { whatsappNumber } from "@/lib/phone";
import { requireUser } from "@/lib/session";
import { addDays, startOfDayTR } from "@/lib/turkey-time";
import { signOut } from "../../(auth)/actions";

export const metadata = { title: "Bugün" };

const time = (d: Date) => d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

export default async function TodayPage() {
  const user = await requireUser();
  const businessId = user.businessId;
  const today = startOfDayTR();
  const tomorrow = addDays(today, 1);

  const [inside, ready, appointments, reminders, unpricedServices] = await Promise.all([
    prisma.workOrder.count({ where: { businessId, stage: { notIn: ["DELIVERED", "CANCELLED"] } } }),
    prisma.workOrder.count({ where: { businessId, stage: "READY" } }),
    prisma.appointment.findMany({
      where: { businessId, startsAt: { gte: today, lt: tomorrow }, status: { in: ["BOOKED", "ARRIVED"] } },
      orderBy: { startsAt: "asc" },
      include: { vehicle: { select: { plate: true, brand: true, model: true } }, station: { select: { name: true } } },
    }),
    prisma.reminder.findMany({
      where: { businessId, status: "PENDING", dueAt: { lt: addDays(today, 8) } },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: { customer: { select: { name: true, phone: true } }, vehicle: { select: { plate: true } } },
    }),
    prisma.service.count({ where: { businessId, isActive: true, basePrice: 0 } }),
  ]);

  const nextIndex = appointments.findIndex((a) => a.status === "BOOKED" && a.startsAt >= new Date());

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-6 md:px-8">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Istanbul" })}
          </p>
          <h1 className="mt-0.5 font-display text-[28px] font-bold">Bugün</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/musteriler" aria-label="Plaka ara" className={buttonStyles({ variant: "secondary", size: "icon" })}>
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>
          <form action={signOut}>
            <button type="submit" aria-label="Çıkış yap" className={buttonStyles({ variant: "secondary", size: "icon" })}>
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        </div>
      </header>

      {unpricedServices > 0 && (
        <Card className="flex items-center justify-between gap-4 border-accent/60 p-4">
          <p className="text-sm">
            <span className="font-semibold">{unpricedServices} hizmetin fiyatı girilmedi.</span>{" "}
            <span className="text-muted">Araç kabulünde fiyatlar bu listeden gelir.</span>
          </p>
          <Link href="/hizmetler" className={buttonStyles({ size: "sm", className: "shrink-0 whitespace-nowrap" })}>
            Fiyatları gir
          </Link>
        </Card>
      )}

      <section aria-label="Özet" className="grid grid-cols-3 gap-2">
        {[
          { label: "İçeride", value: inside, tone: "" },
          { label: "Teslime hazır", value: ready, tone: "text-ready" },
          { label: "Randevu", value: appointments.length, tone: "text-accent" },
        ].map((s) => (
          <Card key={s.label} className="p-3">
            <p className={`font-display text-[26px] font-bold tabular-nums ${s.tone}`}>{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </Card>
        ))}
      </section>

      <section className="space-y-2">
        <Eyebrow>Bugünkü randevular</Eyebrow>
        {appointments.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">Bugün randevu yok.</Card>
        ) : (
          <ul className="space-y-2">
            {appointments.map((a, i) => (
              <li key={a.id}>
                <Card className={`flex items-center gap-3 p-3 ${i === nextIndex ? "border-accent" : ""}`}>
                  <span className={`w-14 font-display text-xl font-bold tabular-nums ${i === nextIndex ? "text-accent" : ""}`}>
                    {time(a.startsAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {a.vehicle && <Plate plate={a.vehicle.plate} size="sm" />}
                      <span className="truncate font-semibold">{[a.vehicle?.brand, a.vehicle?.model].filter(Boolean).join(" ")}</span>
                    </span>
                    <span className="mt-1 block truncate text-sm text-muted">
                      {[a.title, a.station?.name].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {a.status === "ARRIVED" ? (
                    <span className="text-xs font-semibold text-ready">Geldi</span>
                  ) : (
                    i === nextIndex && <span className="text-xs font-semibold text-accent">Sıradaki</span>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <Eyebrow>Arayıp hatırlatın</Eyebrow>
        {reminders.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">
            Bu hafta hatırlatılacak bakım yok. Seramik gibi hizmetlerde kontrol zamanı gelince burada görünür.
          </Card>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
              <li key={r.id}>
                <Card className="space-y-3 p-3">
                  <div className="flex items-center gap-2">
                    <Plate plate={r.vehicle.plate} size="sm" />
                    <span className="truncate font-semibold">{r.customer.name}</span>
                  </div>
                  <p className="text-sm text-muted">{r.title}</p>
                  <a
                    href={`https://wa.me/${whatsappNumber(r.customer.phone)}?text=${encodeURIComponent(
                      `Merhaba ${r.customer.name}, ${r.title.toLocaleLowerCase("tr-TR")} zamanı geldi. Size uygun bir gün için randevu ayarlayalım mı? - ${user.business.name}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonStyles({ size: "sm", className: "w-full" })}
                  >
                    WhatsApp gönder
                  </a>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
