import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { withLiveDistance } from "@/lib/distance";
import { apiError, unauthorized } from "@/lib/http";
import type { DaySession } from "@/lib/types";
import { demoDays, demoEnabled, demoUsers } from "@/lib/demo";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await requireSession("head");
    if (!session) return unauthorized();

    const associateId = new URL(request.url).searchParams.get("associateId");
    if (!associateId || !ObjectId.isValid(associateId))
      return NextResponse.json(
        { error: "A valid associate is required" },
        { status: 400 },
      );

    if (demoEnabled()) {
      const associate = demoUsers.find(
        (user) =>
          user._id === associateId &&
          user.role === "associate" &&
          user.managerId === session.userId,
      );
      if (!associate)
        return NextResponse.json(
          { error: "Associate not found in your team" },
          { status: 404 },
        );
      const days = demoDays()
          .filter((day) => day.userId === associate._id)
          .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()),
        daysWithDistance = await Promise.all(days.map(withLiveDistance));
      return NextResponse.json({ associate, days: daysWithDistance });
    }

    const database = await db(),
      associateObjectId = new ObjectId(associateId),
      associate = await database.collection("users").findOne(
        {
          _id: associateObjectId,
          managerId: new ObjectId(session.userId),
          role: "associate",
        },
        { projection: { name: 1, email: 1 } },
      );
    if (!associate)
      return NextResponse.json(
        { error: "Associate not found in your team" },
        { status: 404 },
      );

    const days = await database
        .collection<DaySession>("days")
        .find({ userId: associateObjectId })
        .sort({ startedAt: -1 })
        .toArray(),
      daysWithDistance = await Promise.all(days.map(withLiveDistance));
    return NextResponse.json({ associate, days: daysWithDistance });
  } catch (error) {
    return apiError(error);
  }
}
