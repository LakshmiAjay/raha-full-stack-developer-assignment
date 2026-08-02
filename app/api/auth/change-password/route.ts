import { compare, hash } from "bcryptjs";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  demoEnabled,
  demoPassword,
  demoUser,
  setDemoPassword,
} from "@/lib/demo";
import { apiError, unauthorized } from "@/lib/http";
import type { User } from "@/lib/types";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return unauthorized();
  try {
    const body = changePasswordSchema.parse(await request.json());
    if (demoEnabled()) {
      const user = demoUser(session.userId);
      if (!user) return unauthorized();
      if (demoPassword(session.userId) !== body.currentPassword)
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 },
        );
      setDemoPassword(session.userId, body.newPassword);
      user.passwordChangedAt = new Date();
      return NextResponse.json({ ok: true });
    }
    const database = await db(),
      user = await database
        .collection<User>("users")
        .findOne({ _id: new ObjectId(session.userId) });
    if (!user || !(await compare(body.currentPassword, user.passwordHash)))
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    await database.collection<User>("users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: await hash(body.newPassword, 12),
          passwordChangedAt: new Date(),
        },
      },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
