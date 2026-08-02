import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, unauthorized } from "@/lib/http";
import { logCapturedLocation, shouldRecordRouteSample } from "@/lib/location";
import type { DaySession, LocationPoint } from "@/lib/types";
import { routeSampleSchema } from "@/lib/validation";
import { demoDays, demoEnabled } from "@/lib/demo";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { effectiveActiveBreak } from "@/lib/breaks";

export async function POST(request: Request) {
  try {
    const session = await requireSession("associate");
    if (!session) return unauthorized();
    const body = routeSampleSchema.parse(await request.json()),
      sample: LocationPoint = {
        ...body.location,
        capturedAt: new Date(body.location.capturedAt),
      };

    if (demoEnabled()) {
      const day = demoDays().find(
        (candidate) =>
          candidate.userId === session.userId && candidate.status === "active",
      );
      if (!day)
        return NextResponse.json(
          { error: "There is no active workday to track" },
          { status: 409 },
        );
      if (effectiveActiveBreak(day))
        return NextResponse.json({ recorded: false, pausedForBreak: true });
      const samples = (day.routeSamples ??= [day.startLocation]);
      if (!shouldRecordRouteSample(samples, sample.capturedAt))
        return NextResponse.json({ recorded: false });
      samples.push(sample);
      logCapturedLocation("route-sample", session.userId, sample);
      return NextResponse.json({ recorded: true, sample }, { status: 201 });
    }

    const database = await db(),
      day = await database.collection<DaySession>("days").findOne({
        userId: new ObjectId(session.userId),
        status: "active",
      });
    if (!day)
      return NextResponse.json(
        { error: "There is no active workday to track" },
        { status: 409 },
      );
    if (effectiveActiveBreak(day))
      return NextResponse.json({ recorded: false, pausedForBreak: true });
    const samples = day.routeSamples?.length
      ? day.routeSamples
      : [day.startLocation];
    if (!shouldRecordRouteSample(samples, sample.capturedAt))
      return NextResponse.json({ recorded: false });

    const result = await database.collection("days").updateOne(
      { _id: day._id, status: "active" },
      day.routeSamples?.length
        ? { $push: { routeSamples: sample } as never }
        : { $set: { routeSamples: [day.startLocation, sample] } },
    );
    if (!result.modifiedCount)
      return NextResponse.json(
        { error: "The workday is no longer active" },
        { status: 409 },
      );
    logCapturedLocation("route-sample", session.userId, sample);
    return NextResponse.json({ recorded: true, sample }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
