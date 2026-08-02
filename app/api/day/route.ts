import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { withLiveDistance } from "@/lib/distance";
import { unauthorized } from "@/lib/http";
import { localDateInZone } from "@/lib/location";
import type { DaySession } from "@/lib/types";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled } from "@/lib/demo";
import {
  approvedBreakExtensionMinutes,
  policyForAssociate,
} from "@/lib/approvals";
import { breakSummary } from "@/lib/breaks";
function requestedTimeZone(request: Request) {
  const timeZone = new URL(request.url).searchParams.get("timezone");
  if (!timeZone) return "Asia/Kolkata";
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return timeZone;
  } catch {
    return "Asia/Kolkata";
  }
}
export async function GET(request: Request) {
  const s = await requireSession("associate");
  if (!s) return unauthorized();
  const localDate = localDateInZone(new Date(), requestedTimeZone(request));
  if (demoEnabled()) {
    const days = demoDays()
      .filter((day) => day.userId === s.userId && day.localDate === localDate)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    if (!days.length) return NextResponse.json(null);
    const sessions = await Promise.all(days.map(withLiveDistance)),
      policy = await policyForAssociate(s.userId, s.branchId),
      extension = await approvedBreakExtensionMinutes(s.userId, localDate);
    return NextResponse.json({
      ...sessions[0],
      ...breakSummary(days, policy.breakMinutes + extension),
      sessionsToday: sessions.length,
      totalDistanceTodayKm:
        Math.round(
          sessions.reduce(
            (total, session) => total + (session.totalDistanceKm ?? 0),
            0,
          ) * 10,
        ) / 10,
    });
  }
  const days = await (await db())
    .collection<DaySession>("days")
    .find({ userId: new ObjectId(s.userId), localDate })
    .sort({ startedAt: -1 })
    .toArray();
  if (!days.length) return NextResponse.json(null);
  const sessions = await Promise.all(days.map(withLiveDistance)),
    policy = await policyForAssociate(s.userId, s.branchId),
    extension = await approvedBreakExtensionMinutes(s.userId, localDate);
  return NextResponse.json({
    ...sessions[0],
    ...breakSummary(days, policy.breakMinutes + extension),
    sessionsToday: sessions.length,
    totalDistanceTodayKm:
      Math.round(
        sessions.reduce(
          (total, session) => total + (session.totalDistanceKm ?? 0),
          0,
        ) * 10,
      ) / 10,
  });
}
