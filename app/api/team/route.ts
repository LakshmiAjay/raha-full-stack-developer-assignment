import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { withLiveDistance } from "@/lib/distance";
import { unauthorized } from "@/lib/http";
import type { DaySession } from "@/lib/types";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled, demoUsers } from "@/lib/demo";
export async function GET(request: Request) {
  const s = await requireSession("head");
  if (!s) return unauthorized();
  const { searchParams } = new URL(request.url),
    q = searchParams.get("q")?.trim(),
    associateId = searchParams.get("associateId")?.trim(),
    from = searchParams.get("from"),
    to = searchParams.get("to");
  if (associateId && !ObjectId.isValid(associateId))
    return NextResponse.json(
      { error: "A valid associate is required" },
      { status: 400 },
    );
  if (demoEnabled()) {
    const associates = demoUsers.filter(
        (u) =>
          u.role === "associate" &&
          u.managerId === s.userId &&
          u.branchId === s.branchId,
      ),
      matchingAssociates = associates.filter(
        (u) =>
          (!associateId || u._id === associateId) &&
          (!q || u.name.toLowerCase().includes(q.toLowerCase())),
      ),
      ids = new Set(matchingAssociates.map((u) => u._id)),
      names = new Map(associates.map((u) => [u._id, u.name])),
      days = demoDays()
        .filter(
          (d) =>
            ids.has(d.userId) &&
            (!from || d.localDate >= from) &&
            (!to || d.localDate <= to),
        )
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const daysWithDistance = await Promise.all(days.map(withLiveDistance));
    return NextResponse.json({
      associates,
      days: daysWithDistance.map((d) => ({
        ...d,
        associateName: names.get(d.userId),
      })),
      demo: true,
    });
  }
  const database = await db(),
    managerFilter = {
      managerId: new ObjectId(s.userId),
      branchId: new ObjectId(s.branchId),
      role: "associate",
    },
    associates = await database
      .collection("users")
      .find(managerFilter)
      .project({ name: 1, email: 1 })
      .sort({ name: 1 })
      .toArray(),
    userFilter: Record<string, unknown> = { ...managerFilter };
  if (associateId) userFilter._id = new ObjectId(associateId);
  if (q)
    userFilter.name = {
      $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  const matchingAssociates = await database
      .collection("users")
      .find(userFilter)
      .project({ name: 1, email: 1 })
      .toArray(),
    ids = matchingAssociates.map((u) => u._id),
    dateFilter: Record<string, unknown> = { userId: { $in: ids } };
  if (from || to)
    dateFilter.localDate = {
      ...(from && { $gte: from }),
      ...(to && { $lte: to }),
    };
  const days = await database
      .collection<DaySession>("days")
      .find(dateFilter)
      .sort({ startedAt: -1 })
      .limit(100)
      .toArray(),
    daysWithDistance = await Promise.all(days.map(withLiveDistance)),
    names = new Map(associates.map((u) => [String(u._id), u.name]));
  return NextResponse.json({
    associates,
    days: daysWithDistance.map((d) => ({
      ...d,
      associateName: names.get(String(d.userId)),
    })),
  });
}
