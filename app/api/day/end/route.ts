import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { dayRoutePoints, routeDetails } from "@/lib/distance";
import { apiError, unauthorized } from "@/lib/http";
import { logCapturedLocation } from "@/lib/location";
import type { DaySession } from "@/lib/types";
import { endDaySchema } from "@/lib/validation";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled } from "@/lib/demo";
import {
  dateAndTimeInZone,
  ensurePendingApproval,
  hasApproval,
  policyForAssociate,
} from "@/lib/approvals";
import { effectiveActiveBreak } from "@/lib/breaks";
export async function POST(request: Request) {
  try {
    const s = await requireSession("associate");
    if (!s) return unauthorized();
    const body = endDaySchema.parse(await request.json()),
      endLocation = {
        ...body.location,
        capturedAt: new Date(body.location.capturedAt),
      },
      endedAt = new Date(),
      policy = await policyForAssociate(s.userId, s.branchId),
      policyNow = dateAndTimeInZone(endedAt, policy.timezone);
    if (
      (policyNow.time < policy.startTime || policyNow.time > policy.endTime) &&
      !(await hasApproval(s.userId, "session_end", policyNow.date))
    ) {
      const reason = `Ending outside ${policy.startTime}–${policy.endTime} requires manager approval`;
      await ensurePendingApproval({
        userId: s.userId,
        branchId: s.branchId,
        managerId: policy.managerId,
        type: "session_end",
        requestedDate: policyNow.date,
        requestedTime: policyNow.time,
        reason,
      });
      return NextResponse.json(
        {
          error: `${reason}. A request has been sent to your manager.`,
          approvalRequired: true,
          approvalType: "session_end",
        },
        { status: 403 },
      );
    }
    if (demoEnabled()) {
      const day = demoDays().find(
        (d) => d.userId === s.userId && d.status === "active",
      );
      if (!day)
        return NextResponse.json(
          { error: "There is no active workday to end" },
          { status: 409 },
        );
      if (effectiveActiveBreak(day))
        return NextResponse.json(
          { error: "End your break before ending the day" },
          { status: 409 },
        );
      const distance = await routeDetails(dayRoutePoints(day, endLocation));
      Object.assign(day, {
        status: "completed",
        endedAt,
        endLocation,
        totalDistanceKm: distance.km,
        distanceSource: distance.source,
        routePath: distance.path,
      });
      (day.routeSamples ??= [day.startLocation]).push(endLocation);
      logCapturedLocation("day-end", s.userId, endLocation);
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
    if (effectiveActiveBreak(day))
      return NextResponse.json(
        { error: "End your break before ending the day" },
        { status: 409 },
      );
    const distance = await routeDetails(dayRoutePoints(day, endLocation));
    await database.collection("days").updateOne(
      { _id: day._id, status: "active" },
      {
        $set: {
          status: "completed",
          endedAt,
          endLocation,
          totalDistanceKm: distance.km,
          distanceSource: distance.source,
          routePath: distance.path,
        },
        $push: { routeSamples: endLocation } as never,
      },
    );
    logCapturedLocation("day-end", s.userId, endLocation);
    return NextResponse.json({
      totalDistanceKm: distance.km,
      distanceSource: distance.source,
    });
  } catch (e) {
    return apiError(e);
  }
}
