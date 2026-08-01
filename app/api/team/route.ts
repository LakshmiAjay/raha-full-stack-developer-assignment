import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled, demoUsers } from "@/lib/demo";
export async function GET(request: Request) {
  const s = await requireSession("head");
  if (!s) return unauthorized();
  const { searchParams } = new URL(request.url),
    q = searchParams.get("q")?.trim(),
    from = searchParams.get("from"),
    to = searchParams.get("to");
  if (demoEnabled()) {
    const users = demoUsers.filter(
        (u) =>
          u.role === "associate" &&
          u.managerId === s.userId &&
          (!q || u.name.toLowerCase().includes(q.toLowerCase())),
      ),
      ids = new Set(users.map((u) => u._id)),
      names = new Map(users.map((u) => [u._id, u.name])),
      days = demoDays()
        .filter(
          (d) =>
            ids.has(d.userId) &&
            (!from || d.localDate >= from) &&
            (!to || d.localDate <= to),
        )
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    return NextResponse.json({
      associates: users,
      days: days.map((d) => ({ ...d, associateName: names.get(d.userId) })),
      demo: true,
    });
  }
  const database = await db(),
    userFilter: Record<string, unknown> = {
      managerId: new ObjectId(s.userId),
      role: "associate",
    };
  if (q)
    userFilter.name = {
      $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
  const users = await database
      .collection("users")
      .find(userFilter)
      .project({ name: 1, email: 1 })
      .toArray(),
    ids = users.map((u) => u._id),
    dateFilter: Record<string, unknown> = { userId: { $in: ids } };
  if (from || to)
    dateFilter.localDate = {
      ...(from && { $gte: from }),
      ...(to && { $lte: to }),
    };
  const days = await database
      .collection("days")
      .find(dateFilter)
      .sort({ startedAt: -1 })
      .limit(100)
      .toArray(),
    names = new Map(users.map((u) => [String(u._id), u.name]));
  return NextResponse.json({
    associates: users,
    days: days.map((d) => ({
      ...d,
      associateName: names.get(String(d.userId)),
    })),
  });
}
