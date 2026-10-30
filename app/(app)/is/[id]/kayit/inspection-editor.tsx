"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Camera, Check, ChevronRight, Loader2, Lock, Trash2 } from "lucide-react";
import type { DamageKind, ReadingPhase } from "@prisma/client";
import { Plate } from "@/components/plate";
import { Button, Card, Eyebrow, Input } from "@/components/ui";
import { VehicleDiagram } from "@/components/vehicle-diagram";
import { uploadPhoto } from "@/lib/upload-photo";
import { cn } from "@/lib/utils";
import { DAMAGE_KINDS, PANELS, PART_LABELS } from "@/lib/vehicle-parts";
import { addMark, deleteMark, deletePhoto, setReading, type ActionResult } from "../../inspection-actions";

interface Mark {
  id: string;
  number: number;
  part: string;
  kind: DamageKind;
  note: string | null;
  photoIds: string[];
}

type Tab = "damage" | "paint" | "photos";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "damage", label: "Hasar" },
  { value: "paint", label: "Boya ölçümü" },
  { value: "photos", label: "Öncesi / sonrası" },
];

function Thumb({ id, onDelete, disabled }: { id: string; onDelete?: () => void; disabled?: boolean }) {
  return (
    <span className="relative block aspect-square overflow-hidden rounded-lg bg-raised">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/photos/${id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
      {onDelete && !disabled && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Fotoğrafı sil"
          className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg bg-ground/80 text-ink"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

/** A camera button: phones open the camera straight away */
function PhotoButton({ onFile, busy, label = "Fotoğraf çek" }: { onFile: (f: File) => void; busy: boolean; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="light" size="sm" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
        {label}
      </Button>
    </>
  );
}

export function InspectionEditor({
  orderId,
  plate,
  car,
  approvedAt,
  marks,
  readings,
  photos,
}: {
  orderId: string;
  plate: string;
  car: string;
  approvedAt: string | null;
  marks: Mark[];
  readings: Array<{ part: string; phase: ReadingPhase; microns: number }>;
  photos: Array<{ id: string; kind: "DAMAGE" | "BEFORE" | "AFTER" }>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("damage");
  const [part, setPart] = useState<string | null>(null);
  const [kind, setKind] = useState<DamageKind>("SCRATCH");
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<ReadingPhase>("BEFORE");
  const [microns, setMicrons] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locked = !!approvedAt;

  const run = (fn: () => Promise<ActionResult>, success?: string, after?: (r: ActionResult) => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        if (success) toast.success(success);
        after?.(r);
        router.refresh();
      }
    });

  const upload = async (file: File, kindOf: "DAMAGE" | "BEFORE" | "AFTER", damageMarkId?: string) => {
    setUploading(damageMarkId ?? kindOf);
    const r = await uploadPhoto(file, { workOrderId: orderId, kind: kindOf, damageMarkId });
    setUploading(null);
    if ("error" in r) toast.error(r.error);
    else {
      toast.success("Fotoğraf eklendi");
      router.refresh();
    }
  };

  const reading = (p: string, ph: ReadingPhase) => readings.find((r) => r.part === p && r.phase === ph)?.microns;
  const values =
    tab === "paint"
      ? Object.fromEntries(PANELS.flatMap((p) => (reading(p.key, phase) ? [[p.key, String(reading(p.key, phase))]] : [])))
      : {};

  const selectPart = (p: string) => {
    if (tab === "paint" && !PANELS.some((x) => x.key === p)) return; // glass and wheels are not measured
    setPart(p);
    if (tab === "paint") setMicrons(reading(p, phase) ? String(reading(p, phase)) : "");
  };

  // Gauge round: save and go on to the next panel, so a full car is 13 quick entries
  const saveReading = (advance: boolean) => {
    if (!part) return;
    const value = microns.trim() ? Number(microns.replace(/\D/g, "")) : null;
    run(() => setReading(orderId, part, phase, value), undefined, () => {
      if (!advance) return;
      const i = PANELS.findIndex((p) => p.key === part);
      const next = PANELS[(i + 1) % PANELS.length];
      setPart(next.key);
      setMicrons(reading(next.key, phase) ? String(reading(next.key, phase)) : "");
    });
  };

  const partMarks = part ? marks.filter((m) => m.part === part) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 md:px-8">
      <Link href={`/is/${orderId}`} className="mb-3 inline-flex h-11 items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> İş emri
      </Link>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Plate plate={plate} size="md" />
          <span className="text-sm text-muted">{car}</span>
        </div>
        {locked && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ready/15 px-3 py-1 text-sm font-semibold text-ready">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Müşteri onayladı · {new Date(approvedAt!).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
          </span>
        )}
      </header>

      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-sunken p-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => {
              setTab(t.value);
              setPart(null);
            }}
            className={cn("h-11 rounded-lg text-sm font-medium", tab === t.value ? "bg-raised text-ink" : "text-muted")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "photos" && (
        <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Card className="p-3">
            {tab === "paint" && (
              <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Ölçüm zamanı">
                {(["BEFORE", "AFTER"] as ReadingPhase[]).map((ph) => (
                  <button
                    key={ph}
                    type="button"
                    aria-pressed={phase === ph}
                    onClick={() => {
                      setPhase(ph);
                      setPart(null);
                    }}
                    className={cn("h-10 rounded-md text-sm", phase === ph ? "bg-accent font-semibold text-accent-ink" : "text-muted")}
                  >
                    {ph === "BEFORE" ? "Kabulde" : "İş sonrası"}
                  </button>
                ))}
              </div>
            )}
            <VehicleDiagram
              className="mx-auto block max-h-[52vh] w-full max-w-[300px]"
              marks={tab === "damage" ? marks : []}
              values={values}
              selected={part}
              onSelect={selectPart}
            />
            <p className="mt-2 text-center text-xs text-muted">{part ? PART_LABELS[part] : "Bir parçaya dokunun"}</p>
          </Card>

          <div className="min-w-0 space-y-4">
            {tab === "damage" && (
              <>
                {part && !locked && (
                  <Card className="space-y-3 border-accent/60 p-4">
                    <p className="font-semibold">{PART_LABELS[part]}</p>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Hasar türü">
                      {(Object.keys(DAMAGE_KINDS) as DamageKind[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          aria-pressed={kind === k}
                          onClick={() => setKind(k)}
                          className={cn("min-h-11 rounded-lg px-2 text-sm", kind === k ? "bg-accent font-semibold text-accent-ink" : "border border-line bg-sunken")}
                        >
                          {DAMAGE_KINDS[k]}
                        </button>
                      ))}
                    </div>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (isteğe bağlı): derin, 5 cm…" maxLength={200} />
                    <Button
                      className="w-full"
                      disabled={pending}
                      onClick={() => run(() => addMark(orderId, part, kind, note), "Hasar işaretlendi", () => setNote(""))}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" /> İşaretle
                    </Button>
                  </Card>
                )}

                <Card className="p-4">
                  <Eyebrow>Kayda geçen hasarlar · {marks.length}</Eyebrow>
                  {marks.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">Hasar yok. Şemada parçaya dokunup türünü seçin.</p>
                  ) : (
                    <ol className="mt-2 space-y-3">
                      {(part && partMarks.length ? partMarks : marks).map((m) => (
                        <li key={m.id} className="space-y-2 rounded-xl bg-raised p-3">
                          <div className="flex items-start gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger text-sm font-bold text-[#1a0a0a]">{m.number}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">
                                {PART_LABELS[m.part]} · {DAMAGE_KINDS[m.kind]}
                              </span>
                              {m.note && <span className="block text-sm text-muted">{m.note}</span>}
                            </span>
                            {!locked && (
                              <button
                                type="button"
                                aria-label={`${m.number} numaralı işareti sil`}
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-line"
                                onClick={() => window.confirm(`${m.number} numaralı işaret silinsin mi?`) && run(() => deleteMark(orderId, m.id), "İşaret silindi")}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                          {m.photoIds.length > 0 && (
                            <div className="grid grid-cols-4 gap-2">
                              {m.photoIds.map((pid) => (
                                <Thumb key={pid} id={pid} disabled={locked} onDelete={() => run(() => deletePhoto(orderId, pid), "Fotoğraf silindi")} />
                              ))}
                            </div>
                          )}
                          {!locked && <PhotoButton busy={uploading === m.id} onFile={(f) => upload(f, "DAMAGE", m.id)} label="Yakından fotoğraf" />}
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </>
            )}

            {tab === "paint" && (
              <>
                {part ? (
                  <Card className="space-y-3 border-accent/60 p-4">
                    <p className="font-semibold">
                      {PART_LABELS[part]} · {phase === "BEFORE" ? "kabulde" : "iş sonrası"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        autoFocus
                        value={microns}
                        onChange={(e) => setMicrons(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        onKeyDown={(e) => e.key === "Enter" && saveReading(true)}
                        inputMode="numeric"
                        placeholder="Ölçüm"
                        aria-label="Boya kalınlığı (mikron)"
                        className="h-14 font-display text-2xl font-bold"
                      />
                      <span className="text-muted">µm</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" disabled={pending} onClick={() => saveReading(false)}>
                        Kaydet
                      </Button>
                      <Button disabled={pending} onClick={() => saveReading(true)}>
                        Kaydet, sonraki <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-4 text-sm text-muted">Ölçüm cihazındaki değeri girmek için bir panele dokunun.</Card>
                )}

                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <caption className="px-4 pt-3 text-left">
                      <Eyebrow>Boya kalınlığı (µm)</Eyebrow>
                    </caption>
                    <thead className="text-xs text-muted">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Parça</th>
                        <th className="px-2 py-2 text-right font-medium">Kabulde</th>
                        <th className="px-2 py-2 text-right font-medium">Sonra</th>
                        <th className="px-4 py-2 text-right font-medium">Fark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {PANELS.map((p) => {
                        const b = reading(p.key, "BEFORE");
                        const a = reading(p.key, "AFTER");
                        return (
                          <tr key={p.key} className={cn(part === p.key && "bg-raised")}>
                            <td className="px-4 py-2">{p.label}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{b ?? "—"}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{a ?? "—"}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-muted">{b && a ? `${a - b > 0 ? "+" : ""}${a - b}` : ""}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "photos" && (
        <div className="grid gap-4 md:grid-cols-2">
          {(["BEFORE", "AFTER"] as const).map((k) => {
            const list = photos.filter((p) => p.kind === k);
            return (
              <Card key={k} className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Eyebrow>{k === "BEFORE" ? "İşlem öncesi" : "İşlem sonrası"}</Eyebrow>
                  <PhotoButton busy={uploading === k} onFile={(f) => upload(f, k)} />
                </div>
                {list.length === 0 ? (
                  <p className="text-sm text-muted">Henüz fotoğraf yok.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {list.map((p) => (
                      <Thumb key={p.id} id={p.id} onDelete={() => run(() => deletePhoto(orderId, p.id), "Fotoğraf silindi")} />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
