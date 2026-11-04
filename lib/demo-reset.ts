import { PrismaClient } from "@prisma/client";
import { removeWorkshop, seedDemo } from "./demo-seed";

const CHECK_EVERY_MS = 10 * 60 * 1000;
const RESET_HOUR_TR = 3;
const IDLE_DAYS = 7;

/** The demo day a moment belongs to: it changes at 03:00 Turkey time (UTC+3 all year) */
export const demoDay = (at: Date) => new Date(at.getTime() + (3 - RESET_HOUR_TR) * 3600 * 1000).toISOString().slice(0, 10);

/** Calls `run` once per demo day; a failed run is tried again on the next call */
export function dailyRunner(run: () => Promise<void>, startedAt: Date) {
  let last = demoDay(startedAt);
  return async (now: Date) => {
    if (demoDay(now) === last) return false;
    await run();
    last = demoDay(now);
    return true;
  };
}

/** Visitors' own workshops go once nobody has signed in or opened a job there for a week */
export async function removeIdleWorkshops(prisma: PrismaClient, now = new Date()) {
  const cutoff = new Date(now.getTime() - IDLE_DAYS * 24 * 3600 * 1000);
  const idle = await prisma.business.findMany({
    where: {
      isDemo: false,
      createdAt: { lt: cutoff },
      users: { none: { lastLoginAt: { gte: cutoff } } },
      workOrders: { none: { createdAt: { gte: cutoff } } },
    },
    select: { id: true },
  });
  for (const { id } of idle) await removeWorkshop(prisma, id);
  if (idle.length) console.log(`[demo] ${idle.length} kullanılmayan atölye silindi`);
}

/** Fills the demo workshop now, then keeps it fresh for as long as the server runs */
export async function startDemoResets() {
  const prisma = new PrismaClient();
  const reset = async () => {
    await seedDemo(prisma);
    await removeIdleWorkshops(prisma);
  };
  const report = (error: unknown) => console.error("[demo] sıfırlama başarısız", error);

  await reset().catch(report);
  const tick = dailyRunner(reset, new Date());
  setInterval(() => void tick(new Date()).catch(report), CHECK_EVERY_MS).unref();
}
