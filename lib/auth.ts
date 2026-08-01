import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import type { Role, User } from "./types";
import { db } from "./db";
import { demoEnabled, demoUser } from "./demo";
const COOKIE = "raha_session";
const secret = () =>
  new TextEncoder().encode(
    process.env.AUTH_SECRET || "dev-only-secret-change-this-before-production",
  );
export type Session = {
  userId: string;
  role: Role;
  branchId: string;
  name: string;
};
export async function createSession(user: User) {
  const token = await new SignJWT({
    role: user.role,
    branchId: String(user.branchId),
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user._id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 604800,
  });
}
export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
export async function getSession(): Promise<Session | null> {
  try {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: String(payload.sub),
      role: payload.role as Role,
      branchId: String(payload.branchId),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
}
export async function requireSession(role?: Role) {
  const session = await getSession();
  if (!session || (role && session.role !== role)) return null;
  return session;
}
export async function currentUser() {
  const s = await getSession();
  if (!s) return null;
  if (demoEnabled()) return demoUser(s.userId) ?? null;
  return (await db())
    .collection<User>("users")
    .findOne({ _id: new ObjectId(s.userId) });
}
