import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, unauthorized } from "@/lib/http";
import { localDateInZone, logCapturedLocation } from "@/lib/location";
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
      const sessionNumber =
        demoDays().filter(
          (day) => day.userId === s.userId && day.localDate === localDate,
        ).length + 1;
      const day = {
        _id: demoId(),
        userId: s.userId,
        branchId: s.branchId,
        localDate,
        sessionNumber,
        timezone: body.timezone,
        status: "active" as const,
        startedAt: now,
        startLocation: {
          ...body.location,
          capturedAt: new Date(body.location.capturedAt),
        },
        routeSamples: [
          {
            ...body.location,
            capturedAt: new Date(body.location.capturedAt),
          },
        ],
        activities: [],
      };
      demoDays().push(day);
      logCapturedLocation("day-start", s.userId, body.location);
      return NextResponse.json(
        { _id: day._id, sessionNumber },
        { status: 201 },
      );
    }
    const database = await db(),
      userId = new ObjectId(s.userId),
      active = await database
        .collection("days")
        .findOne({ userId, status: "active" });
    if (active)
      return NextResponse.json(
        { error: "Your workday is already running" },
        { status: 409 },
      );
    const sessionNumber =
      (await database.collection("days").countDocuments({ userId, localDate })) +
      1;
    const result = await database.collection("days").insertOne({
      userId,
      branchId: new ObjectId(s.branchId),
      localDate,
      sessionNumber,
      timezone: body.timezone,
      status: "active",
      startedAt: now,
      startLocation: {
        ...body.location,
        capturedAt: new Date(body.location.capturedAt),
      },
      routeSamples: [
        {
          ...body.location,
          capturedAt: new Date(body.location.capturedAt),
        },
      ],
      activities: [],
    });
    logCapturedLocation("day-start", s.userId, body.location);
    return NextResponse.json(
      { _id: result.insertedId, sessionNumber },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
