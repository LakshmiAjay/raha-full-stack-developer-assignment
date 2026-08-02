import { approvedBreakExtensionMinutes, policyForAssociate } from "@/lib/approvals";
import { requireSession } from "@/lib/auth";
import { breakUsageMinutes, effectiveActiveBreak } from "@/lib/breaks";
import { db } from "@/lib/db";
import { demoDays, demoEnabled, demoId } from "@/lib/demo";
import { apiError, unauthorized } from "@/lib/http";
import type { DaySession } from "@/lib/types";
import { startBreakSchema } from "@/lib/validation";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await requireSession("associate");
    if (!session) return unauthorized();
    const body = startBreakSchema.parse(await request.json()),
      now = new Date(),
      policy = await policyForAssociate(session.userId, session.branchId);
    if (demoEnabled()) {
      const activeDay = demoDays().find(
        (day) => day.userId === session.userId && day.status === "active",
      );
      if (!activeDay)
        return NextResponse.json({ error: "Start your day before taking a break" }, { status: 409 });
      if (effectiveActiveBreak(activeDay, now))
        return NextResponse.json({ error: "A break is already in progress" }, { status: 409 });
      const days = demoDays().filter(
          (day) => day.userId === session.userId && day.localDate === activeDay.localDate,
        ),
        extra = await approvedBreakExtensionMinutes(session.userId, activeDay.localDate),
        allowance = policy.breakMinutes + extra,
        remaining = allowance - breakUsageMinutes(days, now);
      if (body.minutes > remaining)
        return NextResponse.json(
          {
            error: `Only ${Math.max(0, Math.floor(remaining))} break minutes remain. Request additional break time for more.`,
            approvalRequired: true,
            approvalType: "break_extension",
          },
          { status: 403 },
        );
      const item = {
        _id: demoId(),
        startedAt: now,
        plannedMinutes: body.minutes,
        autoEndsAt: new Date(now.getTime() + body.minutes * 60000),
      };
      (activeDay.breaks ??= []).push(item);
      return NextResponse.json(item, { status: 201 });
    }
    const database = await db(),
      userId = new ObjectId(session.userId),
      activeDay = await database.collection<DaySession>("days").findOne({ userId, status: "active" });
    if (!activeDay)
      return NextResponse.json({ error: "Start your day before taking a break" }, { status: 409 });
    if (effectiveActiveBreak(activeDay, now))
      return NextResponse.json({ error: "A break is already in progress" }, { status: 409 });
    const days = await database
        .collection<DaySession>("days")
        .find({ userId, localDate: activeDay.localDate })
        .toArray(),
      extra = await approvedBreakExtensionMinutes(session.userId, activeDay.localDate),
      allowance = policy.breakMinutes + extra,
      remaining = allowance - breakUsageMinutes(days, now);
    if (body.minutes > remaining)
      return NextResponse.json(
        {
          error: `Only ${Math.max(0, Math.floor(remaining))} break minutes remain. Request additional break time for more.`,
          approvalRequired: true,
          approvalType: "break_extension",
        },
        { status: 403 },
      );
    const item = {
      _id: new ObjectId(),
      startedAt: now,
      plannedMinutes: body.minutes,
      autoEndsAt: new Date(now.getTime() + body.minutes * 60000),
    };
    await database.collection("days").updateOne(
      { _id: activeDay._id, status: "active" },
      { $push: { breaks: item } as never },
    );
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
