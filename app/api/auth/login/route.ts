import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { apiError } from "@/lib/http";
import type { User } from "@/lib/types";
import { demoEnabled, demoUsers } from "@/lib/demo";
export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    if (demoEnabled()) {
      const user = demoUsers.find((u) => u.email === body.email.toLowerCase());
      if (!user || body.password !== "Raha@123")
        return NextResponse.json(
          { error: "Email or password is incorrect" },
          { status: 401 },
        );
      await createSession(user as unknown as User);
      return NextResponse.json({ role: user.role, demo: true });
    }
    const user = await (await db())
      .collection<User>("users")
      .findOne({ email: body.email.toLowerCase() });
    if (!user || !(await compare(body.password, user.passwordHash)))
      return NextResponse.json(
        { error: "Email or password is incorrect" },
        { status: 401 },
      );
    await createSession(user);
    return NextResponse.json({ role: user.role });
  } catch (e) {
    return apiError(e);
  }
}
