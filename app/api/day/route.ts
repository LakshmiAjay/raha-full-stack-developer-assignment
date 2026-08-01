import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled } from "@/lib/demo";
export async function GET() {
  const s = await requireSession("associate");
  if (!s) return unauthorized();
  if (demoEnabled())
    return NextResponse.json(
      demoDays()
        .filter((d) => d.userId === s.userId)
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0] ??
        null,
    );
  const day = await (await db())
    .collection("days")
    .findOne({ userId: new ObjectId(s.userId) }, { sort: { startedAt: -1 } });
  return NextResponse.json(day);
}
