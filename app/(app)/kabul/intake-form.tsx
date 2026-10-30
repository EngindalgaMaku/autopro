"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Check, CheckCircle2, Loader2, MessageCircle, Plus } from "lucide-react";
import type { PaymentMethod, ServiceKind, VehicleSegment } from "@prisma/client";
import { Plate } from "@/components/plate";
import { Button, buttonStyles, Card, Eyebrow, Field, Input } from "@/components/ui";
import { formatTL, parseTL, segmentPrice } from "@/lib/money";
import { formatPhone, isValidPhone, whatsappNumber } from "@/lib/phone";
import { formatPlate, isValidPlate, normalizePlate } from "@/lib/plate";
import { KINDS, type ItemDetails } from "@/lib/service-kinds";
import { SEGMENTS } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { createWorkOrder, findByPlate, findCustomerByPhone, type VehicleMatch } from "./actions";
import { hasDetails, ItemDetailsFields } from "./item-details";

interface ServiceOption {
  id: string;
  name: string;
  kind: ServiceKind;
  defaultProduct: string;
  warrantyMonths: number | null;
  description: string;
  basePrice: number;
  durationMinutes: number;
}

interface PackageOption {
  id: string;
  name: string;
  price: number;
  serviceIds: string[];
}

/**
 * A package's price for the vehicle class, shared out over its services in proportion to their
 * list prices (equally when none has a price), so each item keeps a price of its own and the
 * items add up to the package price exactly.
 */
function spreadPackage(pkg: PackageOption, services: ServiceOption[], factor: number) {
  const target = Math.round(pkg.price * factor);
  const members = pkg.serviceIds.map((id) => services.find((s) => s.id === id)!).filter(Boolean);
  const weights = members.map((s) => s.basePrice);
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares = members.map((_, i) => Math.floor(target * (sum > 0 ? weights[i] / sum : 1 / members.length)));
  shares[shares.length - 1] += target - shares.reduce((a, b) => a + b, 0);
  return Object.fromEntries(members.map((s, i) => [s.id, shares[i]]));
}

const SEGMENT_KEYS = Object.keys(SEGMENTS) as VehicleSegment[];
const FUEL = [
  { value: "1/4", label: "1/4" },
  { value: "1/2", label: "1/2" },
  { value: "3/4", label: "3/4" },
  { value: "DOLU", label: "Dolu" },
] as const;
const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Nakit" },
  { value: "CARD", label: "Kart" },
  { value: "BANK_TRANSFER", label: "Havale" },
];
// Common in Turkish traffic; a suggestion list only, any name can be typed
const BRANDS = [
  "Audi", "BMW", "BYD", "Chery", "Citroën", "Cupra", "Dacia", "Fiat", "Ford", "Honda", "Hyundai", "Jeep", "Kia",
  "Land Rover", "Lexus", "Mazda", "Mercedes-Benz", "MG", "Mini", "Mitsubishi", "Nissan", "Opel", "Peugeot", "Porsche",
  "Renault", "Seat", "Skoda", "Suzuki", "Tesla", "Togg", "Toyota", "Volkswagen", "Volvo",
];

const tl = (n: number) => formatTL(n);
const priceText = (n: number) => (n > 0 ? String(n).replace(".", ",") : "");

type Lookup = "idle" | "searching" | "found" | "new";

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "min-h-12 rounded-xl px-3 py-2 text-left text-[15px] transition-colors",
        selected ? "border border-accent bg-accent font-semibold text-accent-ink" : "border border-line bg-raised hover:border-line-strong"
      )}
    >
      {children}
    </button>
  );
}

export function IntakeForm({
  services,
  packages,
  multipliers,
  stations,
  businessName,
  initialPlate,
}: {
  services: ServiceOption[];
  packages: PackageOption[];
  multipliers: Record<VehicleSegment, number>;
  stations: Array<{ id: string; name: string }>;
  businessName: string;
  initialPlate: string;
}) {
  const [plate, setPlate] = useState(initialPlate);
  const [lookup, setLookup] = useState<Lookup>("idle");
  const [match, setMatch] = useState<VehicleMatch | null>(null);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [segment, setSegment] = useState<VehicleSegment>("SEDAN");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState<string | null>(null);
  // serviceId → the price typed for it (starts at the list price for the vehicle class)
  const [picked, setPicked] = useState<Record<string, string>>({});
  // serviceId → what was applied (product, layers, zones…), for kinds that record it
  const [details, setDetails] = useState<Record<string, ItemDetails>>({});
  // serviceId → the package it came in with; its price is the package's share
  const [fromPackage, setFromPackage] = useState<Record<string, string>>({});
  const [promisedDate, setPromisedDate] = useState("");
  const [promisedTime, setPromisedTime] = useState("17:00");
  const [stationId, setStationId] = useState("");
  const [deposit, setDeposit] = useState("");
  const [depositMethod, setDepositMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState<{ number: string; trackingToken: string; total: number; plate: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const plateRef = useRef<HTMLInputElement>(null);

  const listPrice = (s: ServiceOption, seg = segment) => segmentPrice(s.basePrice, multipliers[seg]);

  // Look the plate up as soon as it is a whole plate
  useEffect(() => {
    if (!isValidPlate(plate)) {
      setLookup("idle");
      setMatch(null);
      return;
    }
    setLookup("searching");
    const wanted = normalizePlate(plate);
    const timer = setTimeout(async () => {
      const found = await findByPlate(wanted);
      if (normalizePlate(plate) !== wanted) return;
      setMatch(found);
      setLookup(found ? "found" : "new");
      if (found) {
        setBrand(found.brand ?? "");
        setModel(found.model ?? "");
        setYear(found.year ? String(found.year) : "");
        setColor(found.color ?? "");
        setSegment(found.segment);
        setCustomerName(found.customer.name);
        setCustomerPhone(formatPhone(found.customer.phone));
        setPhoneHint(null);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [plate]);

  // A typed phone of a known customer: their name, and a note that the car joins their record
  useEffect(() => {
    if (match || !isValidPhone(customerPhone)) {
      setPhoneHint(null);
      return;
    }
    let cancelled = false;
    findCustomerByPhone(customerPhone).then((c) => {
      if (cancelled || !c) return setPhoneHint(null);
      setCustomerName((n) => n || c.name);
      setPhoneHint(`Kayıtlı müşteri: ${c.name} · ${c._count.vehicles} araç`);
    });
    return () => {
      cancelled = true;
    };
  }, [customerPhone, match]);

  const packageShares = (seg: VehicleSegment) =>
    Object.fromEntries(
      packages
        .filter((p) => Object.values(fromPackage).includes(p.name))
        .flatMap((p) => Object.entries(spreadPackage(p, services, multipliers[seg])))
    );

  // A different vehicle class moves untouched prices to the new list price (package shares too)
  const changeSegment = (next: VehicleSegment) => {
    const oldShares = packageShares(segment);
    const newShares = packageShares(next);
    setPicked((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([id, price]) => {
          const s = services.find((x) => x.id === id)!;
          if (fromPackage[id]) {
            const untouched = parseTL(price) === oldShares[id];
            return [id, untouched ? priceText(newShares[id]) : price];
          }
          const untouched = parseTL(price) === listPrice(s) || price === "";
          return [id, untouched ? priceText(listPrice(s, next)) : price];
        })
      )
    );
    setSegment(next);
  };

  const defaultDetails = (s: ServiceOption): ItemDetails =>
    Object.fromEntries(
      Object.entries({ product: s.defaultProduct || undefined, warrantyMonths: s.warrantyMonths ?? undefined }).filter(([, v]) => v !== undefined)
    );

  const toggle = (s: ServiceOption) => {
    const on = s.id in picked;
    setPicked((prev) => {
      const next = { ...prev };
      if (on) delete next[s.id];
      else next[s.id] = priceText(listPrice(s));
      return next;
    });
    if (!on && hasDetails(s.kind)) setDetails((d) => ({ ...d, [s.id]: d[s.id] ?? defaultDetails(s) }));
    // Taking a service out of a package ends the package price for the rest
    if (on && fromPackage[s.id]) {
      const pkgName = fromPackage[s.id];
      setFromPackage((f) => Object.fromEntries(Object.entries(f).filter(([, n]) => n !== pkgName)));
      setPicked((prev) => {
        const next = { ...prev };
        for (const [id, n] of Object.entries(fromPackage)) {
          if (n === pkgName && id !== s.id) next[id] = priceText(listPrice(services.find((x) => x.id === id)!));
        }
        return next;
      });
    }
  };

  const activePackages = new Set(Object.values(fromPackage));
  const togglePackage = (pkg: PackageOption) => {
    if (activePackages.has(pkg.name)) {
      setPicked((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => fromPackage[id] !== pkg.name)));
      setFromPackage((f) => Object.fromEntries(Object.entries(f).filter(([, n]) => n !== pkg.name)));
      return;
    }
    const shares = spreadPackage(pkg, services, multipliers[segment]);
    setPicked((prev) => ({ ...prev, ...Object.fromEntries(Object.entries(shares).map(([id, p]) => [id, priceText(p)])) }));
    setFromPackage((f) => ({ ...f, ...Object.fromEntries(pkg.serviceIds.map((id) => [id, pkg.name])) }));
    setDetails((d) => {
      const next = { ...d };
      for (const id of pkg.serviceIds) {
        const s = services.find((x) => x.id === id);
        if (s && hasDetails(s.kind) && !next[id]) next[id] = defaultDetails(s);
      }
      return next;
    });
  };

  const total = useMemo(
    () => Object.values(picked).reduce((sum, p) => sum + (parseTL(p) ?? 0), 0),
    [picked]
  );
  const depositValue = parseTL(deposit) ?? 0;

  const problems = [
    !isValidPlate(plate) && "Plaka",
    customerName.trim().length < 2 && "Müşteri adı",
    !isValidPhone(customerPhone) && "Telefon",
    Object.keys(picked).length === 0 && "Hizmet",
    Object.values(picked).some((p) => parseTL(p) === null) && "Hizmet fiyatı",
  ].filter(Boolean) as string[];

  const submit = () => {
    if (problems.length) {
      toast.error(`Eksik: ${problems.join(", ")}`);
      return;
    }
    startSaving(async () => {
      const result = await createWorkOrder({
        plate,
        vehicleId: match?.vehicleId,
        brand: brand || undefined,
        model: model || undefined,
        year: year ? Number(year) : undefined,
        color: color || undefined,
        segment,
        customerName,
        customerPhone,
        mileage: mileage ? Number(mileage.replace(/\D/g, "")) : undefined,
        fuelLevel: (fuel as "1/4" | "1/2" | "3/4" | "DOLU" | null) ?? undefined,
        items: Object.entries(picked).map(([serviceId, price]) => ({
          serviceId,
          price: parseTL(price) ?? 0,
          details: details[serviceId],
          packageName: fromPackage[serviceId],
        })),
        promisedAt: promisedDate ? `${promisedDate}T${promisedTime || "17:00"}:00+03:00` : undefined,
        stationId: stationId || undefined,
        deposit: depositValue || undefined,
        depositMethod,
        notes: notes || undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDone({ number: result.number, trackingToken: result.trackingToken, total, plate: normalizePlate(plate) });
      window.scrollTo({ top: 0 });
    });
  };

  const reset = () => {
    setDone(null);
    setPlate("");
    setLookup("idle");
    setMatch(null);
    setBrand("");
    setModel("");
    setYear("");
    setColor("");
    setSegment("SEDAN");
    setCustomerName("");
    setCustomerPhone("");
    setMileage("");
    setFuel(null);
    setPicked({});
    setDetails({});
    setFromPackage({});
    setPromisedDate("");
    setStationId("");
    setDeposit("");
    setNotes("");
    setTimeout(() => plateRef.current?.focus(), 50);
  };

  if (done) {
    const link = `${window.location.origin}/t/${done.trackingToken}`;
    const message = `Merhaba ${customerName}, ${formatPlate(done.plate)} plakalı aracınızı teslim aldık. Aracınızın durumunu buradan takip edebilirsiniz:\n${link}\n\n${businessName}`;
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 pt-10 text-center md:px-8">
        <CheckCircle2 className="mx-auto h-14 w-14 text-ready" aria-hidden="true" />
        <div>
          <h1 className="font-display text-[28px] font-bold">Araç teslim alındı</h1>
          <p className="mt-1 font-mono text-sm text-muted">{done.number}</p>
        </div>
        <div className="flex justify-center">
          <Plate plate={done.plate} size="md" />
        </div>
        <p className="font-display text-2xl font-bold text-accent">{tl(done.total)}</p>
        <div className="space-y-2">
          <a
            href={`https://wa.me/${whatsappNumber(customerPhone)}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noreferrer"
            className={buttonStyles({ size: "lg", className: "w-full" })}
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Takip bağlantısını WhatsApp&apos;tan gönder
          </a>
          <Button variant="secondary" size="lg" className="w-full" onClick={reset}>
            <Plus className="h-5 w-5" aria-hidden="true" />
            Yeni araç kabul
          </Button>
          <Link href="/atolye" className={buttonStyles({ variant: "ghost", size: "lg", className: "w-full" })}>
            Atölyeye git
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:px-8">
      <header className="mb-5 flex items-end justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold">Araç Kabul</h1>
        <p className="hidden text-sm text-muted sm:block">Hasar kaydı bir sonraki sürümde</p>
      </header>

      {/* Phone: one column. Tablet: car on the left, services and payment on the right. Wide: three columns */}
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_340px]">
        {/* Vehicle and customer */}
        <section aria-label="Araç ve müşteri" className="min-w-0 space-y-4 lg:row-span-2 2xl:row-span-1">
          <label className="block">
            <span className="sr-only">Plaka</span>
            <span className="flex h-[78px] overflow-hidden rounded-[10px] border-[3px] border-black bg-white focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-accent">
              <span className="flex w-9 flex-col items-center justify-end bg-plate-blue pb-2" aria-hidden="true">
                <span className="text-[13px] font-bold text-white">TR</span>
              </span>
              <input
                ref={plateRef}
                autoFocus
                value={plate}
                onChange={(e) => setPlate(e.target.value.toLocaleUpperCase("tr-TR"))}
                onBlur={() => isValidPlate(plate) && setPlate(formatPlate(plate))}
                placeholder="34 ABC 789"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={12}
                className="min-w-0 flex-1 bg-transparent text-center font-plate text-[40px] font-bold tracking-[3px] text-black placeholder:text-black/25 focus:outline-none"
              />
            </span>
          </label>

          <Card className="space-y-4 p-4">
            {lookup === "idle" && <p className="text-sm text-muted">Plakayı yazın; kayıtlı araçsa bilgiler gelir.</p>}
            {lookup === "searching" && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Aranıyor
              </p>
            )}
            {lookup === "found" && match && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ready">Kayıtlı araç · {match.visits}. ziyaret</p>
                {match.lastVisit && (
                  <p className="text-sm text-muted">
                    Son: {match.lastVisit.date}
                    {match.lastVisit.summary && ` · ${match.lastVisit.summary}`}
                  </p>
                )}
                {match.customer.notes && <p className="text-sm text-accent">{match.customer.notes}</p>}
              </div>
            )}
            {lookup === "found" && match?.openOrder && (
              <p className="flex gap-2 rounded-xl bg-danger/10 p-3 text-sm text-danger">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Bu araç zaten atölyede ({match.openOrder.number}). Yine de yeni kabul açabilirsiniz.
              </p>
            )}
            {lookup === "new" && <p className="text-sm font-semibold text-accent">Yeni araç: bilgileri girin</p>}

            {(lookup === "found" || lookup === "new") && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Marka">
                    <Input value={brand} onChange={(e) => setBrand(e.target.value)} list="brands" autoComplete="off" />
                  </Field>
                  <Field label="Model">
                    <Input value={model} onChange={(e) => setModel(e.target.value)} autoComplete="off" />
                  </Field>
                  <Field label="Yıl">
                    <Input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" />
                  </Field>
                  <Field label="Renk">
                    <Input value={color} onChange={(e) => setColor(e.target.value)} />
                  </Field>
                </div>
                <datalist id="brands">
                  {BRANDS.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <div className="space-y-2">
                  <Eyebrow>Araç sınıfı</Eyebrow>
                  <div className="grid grid-cols-3 gap-2">
                    {SEGMENT_KEYS.map((s) => (
                      <Chip key={s} selected={segment === s} onClick={() => changeSegment(s)}>
                        <span className="block leading-tight">{SEGMENTS[s].label}</span>
                        <span className="block text-xs opacity-70">× {multipliers[s].toLocaleString("tr-TR")}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 border-t border-line pt-4">
                  <Field label="Telefon" hint={phoneHint ?? undefined}>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      onBlur={() => isValidPhone(customerPhone) && setCustomerPhone(formatPhone(customerPhone))}
                      type="tel"
                      inputMode="tel"
                      placeholder="0532 111 22 33"
                    />
                  </Field>
                  <Field label="Müşteri adı">
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} autoComplete="off" />
                  </Field>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t border-line pt-4">
                  <Field label="Kilometre">
                    <Input
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, "."))}
                      inputMode="numeric"
                      placeholder="48.200"
                    />
                  </Field>
                  <div className="space-y-1.5">
                    <span className="block text-sm font-medium">Yakıt</span>
                    <div className="flex gap-1">
                      {FUEL.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          aria-pressed={fuel === f.value}
                          onClick={() => setFuel(fuel === f.value ? null : f.value)}
                          className={cn(
                            "h-12 min-w-11 rounded-xl px-2 text-sm",
                            fuel === f.value ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-raised"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </section>

        {/* Services */}
        <section aria-label="Hizmetler" className="min-w-0">
          <Card className="flex h-full flex-col">
            <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
              <h2 className="font-display text-xl font-semibold">Hizmetler</h2>
              <span className="text-sm text-muted">Fiyatlar {SEGMENTS[segment].label} için</span>
            </div>
            {services.length === 0 ? (
              <p className="p-6 text-sm text-muted">
                Hizmet yok. <Link href="/hizmetler" className="text-accent">Hizmet ekleyin</Link>.
              </p>
            ) : (
              <>
              {packages.length > 0 && (
                <div className="space-y-2 border-b border-line p-3">
                  <Eyebrow>Paketler</Eyebrow>
                  <div className="flex flex-wrap gap-2">
                    {packages.map((p) => (
                      <Chip key={p.id} selected={activePackages.has(p.name)} onClick={() => togglePackage(p)}>
                        <span className="block leading-tight">{p.name}</span>
                        <span className="block text-xs opacity-75">{tl(Math.round(p.price * multipliers[segment]))}</span>
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <ul className="space-y-1 p-2">
                {services.map((s) => {
                  const on = s.id in picked;
                  const list = listPrice(s);
                  const pkg = fromPackage[s.id];
                  return (
                    <li key={s.id} className={cn("rounded-xl", on && "bg-raised")}>
                      <button
                        type="button"
                        onClick={() => toggle(s)}
                        aria-pressed={on}
                        className="flex min-h-[60px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                            on ? "bg-accent text-accent-ink" : "border-2 border-line-strong"
                          )}
                          aria-hidden="true"
                        >
                          {on && <Check className="h-4 w-4" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{s.name}</span>
                          <span className="block truncate text-sm text-muted">
                            {pkg ? `Paket: ${pkg}` : [KINDS[s.kind].label, s.description].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        {!on && (
                          <span className={cn("font-display text-lg font-semibold tabular-nums", list === 0 && "text-sm text-accent")}>
                            {list > 0 ? tl(list) : "Fiyat yok"}
                          </span>
                        )}
                      </button>
                      {on && (
                        <div className="flex items-center justify-end gap-2 px-3 pb-3">
                          {list > 0 && parseTL(picked[s.id]) !== list && (
                            <span className="text-xs text-muted line-through">{tl(list)}</span>
                          )}
                          <label className="flex items-center gap-1">
                            <span className="sr-only">{s.name} fiyatı</span>
                            <span className="text-muted">₺</span>
                            <Input
                              value={picked[s.id]}
                              onChange={(e) => setPicked({ ...picked, [s.id]: e.target.value })}
                              inputMode="decimal"
                              placeholder="Fiyat"
                              aria-invalid={parseTL(picked[s.id]) === null}
                              className={cn(
                                "h-11 w-32 text-right font-display text-lg font-semibold",
                                parseTL(picked[s.id]) === null && "border-danger focus:border-danger"
                              )}
                            />
                          </label>
                        </div>
                      )}
                      {on && hasDetails(s.kind) && (
                        <div className="px-3 pb-3">
                          <ItemDetailsFields
                            kind={s.kind}
                            label={s.name}
                            value={details[s.id] ?? {}}
                            onChange={(next) => setDetails({ ...details, [s.id]: next })}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              </>
            )}
          </Card>
        </section>

        {/* Delivery and payment */}
        <section aria-label="Teslim ve ödeme" className="min-w-0 space-y-4">
          <Card className="space-y-4 p-4">
            <h2 className="font-display text-xl font-semibold">Teslim ve ödeme</h2>
            <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
              <Field label="Teslim günü">
                <Input type="date" value={promisedDate} onChange={(e) => setPromisedDate(e.target.value)} />
              </Field>
              <Field label="Saat">
                <Input type="time" value={promisedTime} onChange={(e) => setPromisedTime(e.target.value)} step={900} />
              </Field>
            </div>
            <Field label="İstasyon">
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-sunken px-3 text-ink focus:border-accent focus:outline-none"
              >
                <option value="">Sonra seçilecek</option>
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kapora (₺)" hint={total > 0 ? `Kalan: ${tl(Math.max(0, total - depositValue))}` : undefined}>
              <Input value={deposit} onChange={(e) => setDeposit(e.target.value)} inputMode="decimal" placeholder="0" />
            </Field>
            {depositValue > 0 && (
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Kapora ödeme şekli">
                {METHODS.map((m) => (
                  <Chip key={m.value} selected={depositMethod === m.value} onClick={() => setDepositMethod(m.value)}>
                    <span className="block text-center">{m.label}</span>
                  </Chip>
                ))}
              </div>
            )}
            <Field label="Not">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Örn. Müşteri torpido içini istemiyor"
                className="w-full rounded-xl border border-line bg-sunken px-4 py-3 text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none"
              />
            </Field>
          </Card>
        </section>
      </div>

      {/* Total and the one action, always in reach */}
      <div className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 -mx-4 mt-5 border-t border-line bg-ground/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-t-2xl md:border-x">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">
              {Object.keys(picked).length} hizmet{depositValue > 0 && ` · kapora ${tl(depositValue)}`}
            </p>
            <p className="font-display text-[28px] font-bold leading-tight text-accent tabular-nums">{tl(total)}</p>
          </div>
          <Button size="lg" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Check className="h-5 w-5" aria-hidden="true" />}
            Kabulü Bitir
          </Button>
        </div>
      </div>
    </div>
  );
}
