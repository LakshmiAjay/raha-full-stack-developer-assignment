import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { demoDays, demoEnabled } from "@/lib/demo";
import { unauthorized } from "@/lib/http";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
export async function GET(request: Request) {
  const s = await requireSession("associate");
  if (!s) return unauthorized();
  const month = new URL(request.url).searchParams.get("month");
  if (month && !/^\d{4}-\d{2}$/.test(month))
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  if (demoEnabled()) {
    const days = demoDays()
      .filter(
        (d) =>
          d.userId === s.userId && (!month || d.localDate.startsWith(month)),
      )
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    return NextResponse.json({ days, demo: true });
  }
  const filter: Record<string, unknown> = { userId: new ObjectId(s.userId) };
  if (month) filter.localDate = { $gte: `${month}-01`, $lte: `${month}-31` };
  const days = await (await db())
    .collection("days")
    .find(filter)
    .project({ userId: 0, branchId: 0 })
    .sort({ startedAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json({ days });
}
