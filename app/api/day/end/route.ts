import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { routeDistance } from "@/lib/distance";
import { apiError, unauthorized } from "@/lib/http";
import type { DaySession, LocationPoint } from "@/lib/types";
import { endDaySchema } from "@/lib/validation";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled } from "@/lib/demo";
export async function POST(request: Request) {
  try {
    const s = await requireSession("associate");
    if (!s) return unauthorized();
    const body = endDaySchema.parse(await request.json()),
      endLocation = {
        ...body.location,
        capturedAt: new Date(body.location.capturedAt),
      },
      endedAt = new Date();
    if (demoEnabled()) {
      const day = demoDays().find(
        (d) => d.userId === s.userId && d.status === "active",
      );
      if (!day)
        return NextResponse.json(
          { error: "There is no active workday to end" },
          { status: 409 },
        );
      const points = [
          day.startLocation,
          ...day.activities.map((a) => a.location),
          endLocation,
        ].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime()),
        distance = await routeDistance(points);
      Object.assign(day, {
        status: "completed",
        endedAt,
        endLocation,
        totalDistanceKm: distance.km,
        distanceSource: distance.source,
      });
      return NextResponse.json({
        totalDistanceKm: distance.km,
        distanceSource: distance.source,
      });
    }
    const database = await db(),
      day = await database
        .collection<DaySession>("days")
        .findOne({ userId: new ObjectId(s.userId), status: "active" });
    if (!day)
      return NextResponse.json(
        { error: "There is no active workday to end" },
        { status: 409 },
      );
    const points: LocationPoint[] = [
        day.startLocation,
        ...day.activities.map((a) => a.location),
        endLocation,
      ].sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime()),
      distance = await routeDistance(points);
    await database
      .collection("days")
      .updateOne(
        { _id: day._id, status: "active" },
        {
          $set: {
            status: "completed",
            endedAt,
            endLocation,
            totalDistanceKm: distance.km,
            distanceSource: distance.source,
          },
        },
      );
    return NextResponse.json({
      totalDistanceKm: distance.km,
      distanceSource: distance.source,
    });
  } catch (e) {
    return apiError(e);
  }
}
