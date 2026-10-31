import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PersonelClient, type StaffItem } from "./personel-client";

export const metadata = { title: "Personel & Prim Yönetimi" };
export const dynamic = "force-dynamic";

export default async function PersonelPage() {
  const user = await requireUser();

  const [users, completedOrders] = await Promise.all([
    prisma.user.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workOrder.findMany({
      where: {
        businessId: user.businessId,
        stage: { in: ["READY", "VALET_DELIVERY", "DELIVERED"] },
      },
      include: {
        vehicle: { select: { plate: true, brand: true, model: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const staffList: StaffItem[] = users.map((u) => {
    const rate = Number(u.commissionRate ?? 0);

    // Find orders assigned to this technician
    const userOrders = completedOrders.filter((o) => {
      if (o.technicianId === u.id) return true;
      return o.items.some((it) => it.technicianId === u.id);
    });

    const totalRevenue = userOrders.reduce((sum, o) => {
      // If individual items have technicianId, sum those, otherwise sum total amount
      const userItems = o.items.filter((it) => it.technicianId === u.id);
      if (userItems.length > 0) {
        return sum + userItems.reduce((iSum, it) => iSum + Number(it.totalPrice), 0);
      }
      return sum + Number(o.totalAmount);
    }, 0);

    const commissionPayout = Math.round((totalRevenue * rate) / 100);

    const recentJobs = userOrders.slice(0, 10).map((o) => {
      const price = Number(o.totalAmount);
      return {
        id: o.id,
        orderNumber: o.number,
        plate: o.vehicle.plate,
        car: [o.vehicle.brand, o.vehicle.model].filter(Boolean).join(" "),
        date: o.deliveredAt ? o.deliveredAt.toLocaleDateString("tr-TR") : o.createdAt.toLocaleDateString("tr-TR"),
        serviceName: o.items.map((it) => it.name).join(", ") || "Detailing Paketi",
        price,
        commissionShare: Math.round((price * rate) / 100),
      };
    });

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      commissionRate: rate,
      isActive: u.isActive,
      completedJobsCount: userOrders.length,
      totalRevenue,
      commissionPayout,
      recentJobs,
    };
  });

  return <PersonelClient staffList={staffList} />;
}
