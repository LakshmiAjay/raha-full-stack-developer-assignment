import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, unauthorized } from "@/lib/http";
import { localDateInZone } from "@/lib/location";
import { startDaySchema } from "@/lib/validation";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled, demoId } from "@/lib/demo";
export async function POST(request: Request) {
  try {
    const s = await requireSession("associate");
    if (!s) return unauthorized();
    const body = startDaySchema.parse(await request.json()),
      now = new Date(),
      localDate = localDateInZone(now, body.timezone);
    if (demoEnabled()) {
      if (
        demoDays().some((d) => d.userId === s.userId && d.status === "active")
      )
        return NextResponse.json(
          { error: "Your workday is already running" },
          { status: 409 },
        );
      const day = {
        _id: demoId(),
        userId: s.userId,
        branchId: s.branchId,
        localDate,
        timezone: body.timezone,
        status: "active" as const,
        startedAt: now,
        startLocation: {
          ...body.location,
          capturedAt: new Date(body.location.capturedAt),
        },
        activities: [],
      };
      demoDays().push(day);
      return NextResponse.json({ _id: day._id }, { status: 201 });
    }
    const database = await db(),
      active = await database
        .collection("days")
        .findOne({ userId: new ObjectId(s.userId), status: "active" });
    if (active)
      return NextResponse.json(
        { error: "Your workday is already running" },
        { status: 409 },
      );
    const result = await database
      .collection("days")
      .insertOne({
        userId: new ObjectId(s.userId),
        branchId: new ObjectId(s.branchId),
        localDate,
        timezone: body.timezone,
        status: "active",
        startedAt: now,
        startLocation: {
          ...body.location,
          capturedAt: new Date(body.location.capturedAt),
        },
        activities: [],
      });
    return NextResponse.json({ _id: result.insertedId }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
