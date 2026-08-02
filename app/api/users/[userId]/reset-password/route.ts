import { hash } from "bcryptjs";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  demoEnabled,
  demoUsers,
  setDemoPassword,
} from "@/lib/demo";
import { apiError, unauthorized } from "@/lib/http";
import { defaultUserPassword } from "@/lib/password";
import type { User } from "@/lib/types";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireSession("head");
  if (!session) return unauthorized();
  try {
    const { userId } = await params;
    const password = defaultUserPassword();
    if (!ObjectId.isValid(userId))
      return NextResponse.json({ error: "Associate not found" }, { status: 404 });

    if (demoEnabled()) {
      const associate = demoUsers.find(
        (user) =>
          user._id === userId &&
          user.role === "associate" &&
          user.managerId === session.userId &&
          user.branchId === session.branchId,
      );
      if (!associate)
        return NextResponse.json({ error: "Associate not found" }, { status: 404 });
      setDemoPassword(associate._id, password);
      delete associate.passwordChangedAt;
      return NextResponse.json({ ok: true, defaultPassword: password });
    }

    const result = await (await db()).collection<User>("users").updateOne(
      {
        _id: new ObjectId(userId),
        role: "associate",
        managerId: new ObjectId(session.userId),
        branchId: new ObjectId(session.branchId),
      },
      {
        $set: { passwordHash: await hash(password, 12) },
        $unset: { passwordChangedAt: "" },
      },
    );
    if (!result.matchedCount)
      return NextResponse.json({ error: "Associate not found" }, { status: 404 });
    return NextResponse.json({ ok: true, defaultPassword: password });
  } catch (error) {
    return apiError(error);
  }
}
