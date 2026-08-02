import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { withLiveDistance } from "@/lib/distance";
import { unauthorized } from "@/lib/http";
import { localDateInZone } from "@/lib/location";
import type { DaySession } from "@/lib/types";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled } from "@/lib/demo";
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
    const day =
      demoDays()
        .filter((d) => d.userId === s.userId && d.localDate === localDate)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ??
      null;
    return NextResponse.json(day ? await withLiveDistance(day) : null);
  }
  const day = await (await db())
    .collection<DaySession>("days")
    .findOne(
      { userId: new ObjectId(s.userId), localDate },
      { sort: { startedAt: -1 } },
    );
  return NextResponse.json(day ? await withLiveDistance(day) : null);
}
