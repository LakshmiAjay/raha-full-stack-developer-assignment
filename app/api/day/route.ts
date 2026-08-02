import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { withLiveDistance } from "@/lib/distance";
import { unauthorized } from "@/lib/http";
import type { DaySession } from "@/lib/types";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled } from "@/lib/demo";
export async function GET() {
  const s = await requireSession("associate");
  if (!s) return unauthorized();
  if (demoEnabled()) {
    const day =
      demoDays()
        .filter((d) => d.userId === s.userId)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ??
      null;
    return NextResponse.json(day ? await withLiveDistance(day) : null);
  }
  const day = await (await db())
    .collection<DaySession>("days")
    .findOne({ userId: new ObjectId(s.userId) }, { sort: { startedAt: -1 } });
  return NextResponse.json(day ? await withLiveDistance(day) : null);
}
