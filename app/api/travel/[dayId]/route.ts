import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayRoutePoints, routeDetails } from "@/lib/distance";
import { apiError, unauthorized } from "@/lib/http";
import type { DaySession } from "@/lib/types";
import { demoDays, demoEnabled } from "@/lib/demo";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dayId: string }> },
) {
  try {
    const session = await requireSession("associate");
    if (!session) return unauthorized();
    const { dayId } = await params;
    if (!ObjectId.isValid(dayId))
      return NextResponse.json(
        { error: "A valid session is required" },
        { status: 400 },
      );

    if (demoEnabled()) {
      const day = demoDays().find(
        (candidate) =>
          candidate._id === dayId && candidate.userId === session.userId,
      );
      if (!day)
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 },
        );
      if (
        day.status === "active" ||
        !day.routePath ||
        (day.routePath.length < 2 && (day.routeSamples?.length ?? 0) > 1)
      ) {
        const route = await routeDetails(dayRoutePoints(day));
        day.routePath = route.path;
      }
      return NextResponse.json(day);
    }

    const database = await db(),
      day = await database.collection<DaySession>("days").findOne({
        _id: new ObjectId(dayId),
        userId: new ObjectId(session.userId),
      });
    if (!day)
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );

    if (
      day.status === "active" ||
      !day.routePath ||
      (day.routePath.length < 2 && (day.routeSamples?.length ?? 0) > 1)
    ) {
      const route = await routeDetails(dayRoutePoints(day));
      day.routePath = route.path;
      if (day.status === "completed" && route.path.length)
        await database
          .collection("days")
          .updateOne({ _id: day._id }, { $set: { routePath: route.path } });
    }

    return NextResponse.json({ ...day, userId: undefined, branchId: undefined });
  } catch (error) {
    return apiError(error);
  }
}
