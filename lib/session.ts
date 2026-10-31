import "server-only";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

// The session is a signed token in an httpOnly cookie: page code never sees it, so a script
// injected into a page cannot read it (LaundryPro keeps its token in localStorage).
const COOKIE = "ap_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface Session {
  userId: string;
  businessId: string;
  role: Role;
}

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET is missing or shorter than 32 characters");
  return value;
}

export async function startSession(session: Session) {
  const token = jwt.sign(session, secret(), { expiresIn: MAX_AGE });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  try {
    (await cookies()).delete(COOKIE);
  } catch {
    // Next.js restricts cookie deletion to Server Actions or Route Handlers;
    // ignore if called from a read-only Server Component context.
  }
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { userId, businessId, role } = jwt.verify(token, secret()) as Session;
    return { userId, businessId, role };
  } catch {
    return null;
  }
}

/** Returns the active user if session is valid and user exists in database, otherwise clears cookie */
export async function getCurrentUser() {
  const session = await readSession();
  if (!session) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        businessId: true,
        business: { select: { id: true, name: true } },
      },
    });
    if (!user || !user.isActive || user.businessId !== session.businessId) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

/** The signed-in user for an app page; sends anyone else to sign in */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export const canManage = (role: Role) => role === "OWNER" || role === "MANAGER";
