import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { demoDays, demoEnabled } from "@/lib/demo";
import { apiError, unauthorized } from "@/lib/http";
import type { DaySession } from "@/lib/types";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await requireSession("associate");
    if (!session) return unauthorized();
    const now = new Date();
    if (demoEnabled()) {
      const day = demoDays().find(
          (item) => item.userId === session.userId && item.status === "active",
        ),
        active = day?.breaks?.findLast((item) => !item.endedAt);
      if (!day || !active)
        return NextResponse.json({ error: "There is no active break to end" }, { status: 409 });
      active.endedAt = new Date(Math.min(now.getTime(), active.autoEndsAt.getTime()));
      active.durationMinutes = Math.max(
        0,
        (active.endedAt.getTime() - active.startedAt.getTime()) / 60000,
      );
      return NextResponse.json({ ok: true });
    }
    const database = await db(),
      day = await database.collection<DaySession>("days").findOne({
        userId: new ObjectId(session.userId),
        status: "active",
      }),
      active = day?.breaks?.findLast((item) => !item.endedAt);
    if (!day || !active)
      return NextResponse.json({ error: "There is no active break to end" }, { status: 409 });
    const endedAt = new Date(Math.min(now.getTime(), active.autoEndsAt.getTime()));
    await database.collection("days").updateOne(
      { _id: day._id, "breaks._id": active._id },
      {
        $set: {
          "breaks.$.endedAt": endedAt,
          "breaks.$.durationMinutes": Math.max(
            0,
            (endedAt.getTime() - active.startedAt.getTime()) / 60000,
          ),
        },
      },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
