"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgePercent,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Loader2,
  Percent,
  Phone,
  Plus,
  Shield,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Plate } from "@/components/plate";
import { Button, Card, Eyebrow, Input } from "@/components/ui";
import { formatTL } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { createStaff, toggleStaffStatus, updateCommissionRate } from "./actions";

export interface StaffItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "OWNER" | "MANAGER" | "TECHNICIAN" | "VALET";
  commissionRate: number;
  isActive: boolean;
  completedJobsCount: number;
  totalRevenue: number;
  commissionPayout: number;
  recentJobs: Array<{
    id: string;
    orderNumber: string;
    plate: string;
    car: string;
    date: string;
    serviceName: string;
    price: number;
    commissionShare: number;
  }>;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "İşletme Sahibi",
  MANAGER: "Yönetici",
  TECHNICIAN: "Detailing Ustası",
  VALET: "Vale",
};

export function PersonelClient({ staffList }: { staffList: StaffItem[] }) {
  const router = useRouter();
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [newRateValue, setNewRateValue] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Metrics calculation
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.isActive).length;
  const totalCompletedJobs = staffList.reduce((acc, s) => acc + s.completedJobsCount, 0);
  const totalRevenue = staffList.reduce((acc, s) => acc + s.totalRevenue, 0);
  const totalCommission = staffList.reduce((acc, s) => acc + s.commissionPayout, 0);

  const filteredStaff = staffList.filter((s) => {
    if (filterRole === "ALL") return true;
    return s.role === filterRole;
  });

  const handleUpdateRate = (userId: string) => {
    const rate = Number(newRateValue.replace(",", "."));
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Lütfen 0 ile 100 arasında geçerli bir yüzde girin.");
      return;
    }

    startTransition(async () => {
      const res = await updateCommissionRate(userId, rate);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Prim oranı başarıyla güncellendi.");
        setEditingRateId(null);
        router.refresh();
      }
    });
  };

  const handleToggleStatus = (userId: string, currentStatus: boolean) => {
    if (currentStatus && !window.confirm("Bu personeli pasife almak istediğinize emin misiniz?")) {
      return;
    }
    startTransition(async () => {
      const res = await toggleStaffStatus(userId, !currentStatus);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(currentStatus ? "Personel pasife alındı." : "Personel aktifleştirildi.");
        router.refresh();
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
              Personel & Prim Yönetimi
            </h1>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
              Aylık Performans
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Ustalarınızın iş tamamlama adetlerini, ciro katkılarını ve hak ediş primlerini yönetin.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Personel Ekle
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Aktif Personel</p>
            <p className="font-display text-2xl font-bold text-ink">
              {activeStaff} <span className="text-xs font-normal text-muted">/ {totalStaff} kişi</span>
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ready/10 text-ready">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Tamamlanan İşler</p>
            <p className="font-display text-2xl font-bold text-ink">
              {totalCompletedJobs} <span className="text-xs font-normal text-muted">araç</span>
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Üretilen Toplam Ciro</p>
            <p className="font-display text-2xl font-bold text-ink">
              {formatTL(totalRevenue)}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <BadgePercent className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Toplam Prim Hak Edişi</p>
            <p className="font-display text-2xl font-bold text-accent">
              {formatTL(totalCommission)}
            </p>
          </div>
        </Card>
      </div>

      {/* Role Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {[
          { key: "ALL", label: `Tümü (${staffList.length})` },
          { key: "TECHNICIAN", label: `Ustalar (${staffList.filter((s) => s.role === "TECHNICIAN").length})` },
          { key: "VALET", label: `Valeler (${staffList.filter((s) => s.role === "VALET").length})` },
          { key: "MANAGER", label: `Yöneticiler (${staffList.filter((s) => s.role === "MANAGER").length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterRole(tab.key)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              filterRole === tab.key
                ? "bg-accent text-accent-ink shadow-sm"
                : "border border-line bg-surface text-muted hover:text-ink hover:bg-raised"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Staff Cards List */}
      <div className="space-y-3">
        {/* Desktop Column Header */}
        {filteredStaff.length > 0 && (
          <div className="hidden lg:grid lg:grid-cols-[minmax(250px,1.2fr)_110px_130px_130px_150px_auto] items-center gap-4 px-6 py-2 text-[11px] font-semibold text-muted uppercase tracking-wider">
            <div>Personel Bilgisi</div>
            <div>Tamamlanan İş</div>
            <div>Üretilen Ciro</div>
            <div className="text-center">Prim Oranı</div>
            <div className="text-right">Hakediş Primi</div>
            <div className="text-right pr-2">İşlemler</div>
          </div>
        )}

        {filteredStaff.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted">Bu filtreye uygun personel bulunamadı.</p>
          </Card>
        ) : (
          filteredStaff.map((staff) => {
            const isExpanded = expandedUser === staff.id;
            const isEditingRate = editingRateId === staff.id;
            const cleanStaffName = staff.name.replace(/\s*\([^)]*\)$/, "").trim();

            return (
              <Card key={staff.id} className="overflow-hidden border border-line bg-surface shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[minmax(250px,1.2fr)_110px_130px_130px_150px_auto] items-center gap-4 p-5">
                  {/* Col 1: Avatar & Info */}
                  <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-center gap-3.5 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 font-display text-lg font-bold text-accent shadow-sm">
                      {cleanStaffName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ink truncate">{cleanStaffName}</p>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            staff.role === "TECHNICIAN"
                              ? "bg-accent/15 text-accent"
                              : staff.role === "VALET"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-purple-500/15 text-purple-400"
                          }`}
                        >
                          {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                        {!staff.isActive && (
                          <span className="shrink-0 rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
                            Pasif
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                        <span className="truncate">{staff.email}</span>
                        {staff.phone && <span className="shrink-0">· {formatPhone(staff.phone)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Tamamlanan İş */}
                  <div className="col-span-1 min-w-0">
                    <p className="text-[11px] font-medium text-muted lg:hidden">Tamamlanan İş</p>
                    <p className="font-display text-lg font-bold text-ink whitespace-nowrap">
                      {staff.completedJobsCount} <span className="text-xs font-normal text-muted">araç</span>
                    </p>
                  </div>

                  {/* Col 3: Üretilen Ciro */}
                  <div className="col-span-1 min-w-0">
                    <p className="text-[11px] font-medium text-muted lg:hidden">Üretilen Ciro</p>
                    <p className="font-display text-lg font-bold text-ink whitespace-nowrap">
                      {formatTL(staff.totalRevenue)}
                    </p>
                  </div>

                  {/* Col 4: Prim Oranı */}
                  <div className="col-span-1 rounded-xl border border-line bg-raised/70 p-2 text-center w-full min-w-0">
                    <p className="text-[10px] font-medium text-muted uppercase tracking-wider lg:hidden">Prim Oranı</p>
                    {isEditingRate ? (
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <input
                          type="text"
                          value={newRateValue}
                          onChange={(e) => setNewRateValue(e.target.value)}
                          className="h-7 w-12 rounded border border-accent bg-sunken px-1 text-center font-mono text-xs font-bold text-ink focus:outline-none"
                          placeholder="12"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateRate(staff.id)}
                          disabled={isPending}
                          className="flex h-7 w-7 items-center justify-center rounded bg-accent text-accent-ink"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRateId(null)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-line text-muted"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRateId(staff.id);
                          setNewRateValue(String(staff.commissionRate));
                        }}
                        className="mt-0.5 inline-flex items-center gap-1 font-mono text-sm font-bold text-accent hover:underline"
                        title="Prim oranını düzenle"
                      >
                        %{staff.commissionRate}
                        <Percent className="h-3 w-3 text-muted" />
                      </button>
                    )}
                  </div>

                  {/* Col 5: Hakediş Primi */}
                  <div className="col-span-1 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-right w-full min-w-0">
                    <p className="text-[10px] font-semibold text-accent uppercase tracking-wider whitespace-nowrap lg:hidden">Hakediş Primi</p>
                    <p className="font-display text-xl font-bold text-ink whitespace-nowrap">
                      {formatTL(staff.commissionPayout)}
                    </p>
                  </div>

                  {/* Col 6: Actions */}
                  <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(staff.id, staff.isActive)}
                      disabled={isPending || staff.role === "OWNER"}
                      title={
                        staff.role === "OWNER"
                          ? "İşletme sahibi pasife alınamaz"
                          : staff.isActive
                          ? "Personeli Pasife Al"
                          : "Personeli Aktifleştir"
                      }
                      aria-label={staff.isActive ? "Personeli Pasife Al" : "Personeli Aktifleştir"}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        staff.isActive
                          ? "border-line bg-surface text-muted hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                          : "border-ready/40 bg-ready/10 text-ready hover:bg-ready/20",
                        staff.role === "OWNER" && "opacity-35 cursor-not-allowed hover:border-line hover:bg-surface hover:text-muted"
                      )}
                    >
                      {staff.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedUser(isExpanded ? null : staff.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-muted hover:border-accent/40 hover:bg-raised hover:text-ink transition-colors"
                      title={isExpanded ? "İşlem geçmişini gizle" : "İşlem geçmişini göster"}
                      aria-label={isExpanded ? "Gizle" : "İşlem detaylarını göster"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details: Recent jobs */}
                {isExpanded && (
                  <div className="border-t border-line bg-sunken/60 p-4">
                    <Eyebrow>Tamamlanan Son Detailing İşleri ({staff.recentJobs.length})</Eyebrow>
                    {staff.recentJobs.length === 0 ? (
                      <p className="mt-2 text-xs text-muted">Bu personele ait henüz tamamlanmış iş kaydı bulunmuyor.</p>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-line text-muted">
                              <th className="pb-2 font-medium">İş Emri</th>
                              <th className="pb-2 font-medium">Plaka & Araç</th>
                              <th className="pb-2 font-medium">Uygulanan Hizmet</th>
                              <th className="pb-2 font-medium">Tarih</th>
                              <th className="pb-2 font-medium text-right">İş Tutarı</th>
                              <th className="pb-2 font-medium text-right text-accent">Prim Tutarı (%{staff.commissionRate})</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/40">
                            {staff.recentJobs.map((job) => (
                              <tr key={job.id} className="hover:bg-raised/40">
                                <td className="py-2.5 font-mono">
                                  <Link href={`/is/${job.id}`} className="text-accent hover:underline">
                                    #{job.orderNumber}
                                  </Link>
                                </td>
                                <td className="py-2.5">
                                  <div className="flex items-center gap-2">
                                    <Plate plate={job.plate} size="sm" />
                                    <span className="text-muted">{job.car}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 font-medium text-ink">{job.serviceName}</td>
                                <td className="py-2.5 text-muted">{job.date}</td>
                                <td className="py-2.5 text-right font-mono font-bold text-ink">
                                  {formatTL(job.price)}
                                </td>
                                <td className="py-2.5 text-right font-mono font-bold text-accent">
                                  {formatTL(job.commissionShare)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* New Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Yeni Personel Ekle</h2>
                <p className="text-xs text-muted">Detailing ustanız veya valeniz için hesap ve prim oranı tanımlayın.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                startTransition(async () => {
                  const res = await createStaff(formData);
                  if (res?.error) {
                    toast.error(res.error);
                  } else {
                    toast.success("Yeni personel başarıyla kaydedildi!");
                    setIsModalOpen(false);
                    router.refresh();
                  }
                });
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-ink mb-1">Ad Soyad</label>
                <Input name="name" required placeholder="Örn: Hasan Yılmaz" className="h-10 text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">E-posta (Giriş İçin)</label>
                  <Input name="email" type="email" required placeholder="hasan@autopro.com" className="h-10 text-sm" />
                </div>
                <div>
                  <label className="block font-semibold text-ink mb-1">Telefon</label>
                  <Input name="phone" placeholder="0532 000 00 00" className="h-10 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">Görev / Rol</label>
                  <select
                    name="role"
                    defaultValue="TECHNICIAN"
                    className="h-10 w-full rounded-xl border border-line bg-sunken px-3 text-sm text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="TECHNICIAN">Detailing Ustası</option>
                    <option value="VALET">Vale</option>
                    <option value="MANAGER">Yönetici</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Prim Oranı (%)</label>
                  <Input
                    name="commissionRate"
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    defaultValue="12"
                    placeholder="Örn: 12"
                    className="h-10 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Giriş Şifresi</label>
                <Input
                  name="password"
                  type="password"
                  required
                  placeholder="En az 6 karakter"
                  className="h-10 text-sm"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Personeli Kaydet"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
