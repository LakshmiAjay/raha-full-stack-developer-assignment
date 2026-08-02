import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, unauthorized } from "@/lib/http";
import { localDateInZone, logCapturedLocation } from "@/lib/location";
import { startDaySchema } from "@/lib/validation";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled, demoId } from "@/lib/demo";
import {
  dateAndTimeInZone,
  ensurePendingApproval,
  hasApproval,
  policyForAssociate,
} from "@/lib/approvals";
import { createSessionNotification } from "@/lib/notifications";
export async function POST(request: Request) {
  try {
    const s = await requireSession("associate");
    if (!s) return unauthorized();
    const body = startDaySchema.parse(await request.json()),
      now = new Date(),
      policy = await policyForAssociate(s.userId, s.branchId),
      policyNow = dateAndTimeInZone(now, policy.timezone),
      localDate = localDateInZone(now, body.timezone),
      namedHoliday = policy.holidays.find((item) => item.date === policyNow.date),
      dayOfWeek = new Date(`${policyNow.date}T00:00:00Z`).getUTCDay(),
      recurringHoliday =
        dayOfWeek === 6 && policy.saturdayHoliday
          ? "Saturday"
          : dayOfWeek === 0 && policy.sundayHoliday
            ? "Sunday"
            : undefined,
      holidayName = namedHoliday?.name ?? recurringHoliday,
      outsideStartWindow =
        policyNow.time < policy.startTime || policyNow.time > policy.endTime,
      gates = [
        ...(holidayName
          ? [
              {
                type: "holiday_work" as const,
                reason: `Work on ${holidayName} requires manager approval`,
              },
            ]
          : []),
        ...(outsideStartWindow
          ? [
              {
                type: "session_start" as const,
                reason: `Starting outside ${policy.startTime}–${policy.endTime} requires manager approval`,
              },
            ]
          : []),
      ];
    let gate: (typeof gates)[number] | undefined;
    for (const candidate of gates)
      if (!(await hasApproval(s.userId, candidate.type, policyNow.date))) {
        gate = candidate;
        break;
      }
    if (gate) {
      await ensurePendingApproval({
        userId: s.userId,
        branchId: s.branchId,
        managerId: policy.managerId,
        type: gate.type,
        requestedDate: policyNow.date,
        requestedTime: policyNow.time,
        reason: gate.reason,
      });
      return NextResponse.json(
        {
          error: `${gate.reason}. A request has been sent to your manager.`,
          approvalRequired: true,
          approvalType: gate.type,
        },
        { status: 403 },
      );
    }
    if (demoEnabled()) {
      if (
        demoDays().some((d) => d.userId === s.userId && d.status === "active")
      )
        return NextResponse.json(
          { error: "Your workday is already running" },
          { status: 409 },
        );
      const sessionNumber =
        demoDays().filter(
          (day) => day.userId === s.userId && day.localDate === localDate,
        ).length + 1;
      const day = {
        _id: demoId(),
        userId: s.userId,
        branchId: s.branchId,
        localDate,
        sessionNumber,
        timezone: body.timezone,
        status: "active" as const,
        startedAt: now,
        startLocation: {
          ...body.location,
          capturedAt: new Date(body.location.capturedAt),
        },
        routeSamples: [
          {
            ...body.location,
            capturedAt: new Date(body.location.capturedAt),
          },
        ],
        routePath: [
          {
            latitude: body.location.latitude,
            longitude: body.location.longitude,
          },
        ],
        activities: [],
      };
      demoDays().push(day);
      logCapturedLocation("day-start", s.userId, body.location);
      await createSessionNotification({
        type: "session_started",
        recipientId: policy.managerId,
        actorId: s.userId,
        actorName: s.name,
        branchId: s.branchId,
        dayId: day._id,
        sessionNumber,
        createdAt: now,
      });
      return NextResponse.json(
        { _id: day._id, sessionNumber },
        { status: 201 },
      );
    }
    const database = await db(),
      userId = new ObjectId(s.userId),
      active = await database
        .collection("days")
        .findOne({ userId, status: "active" });
    if (active)
      return NextResponse.json(
        { error: "Your workday is already running" },
        { status: 409 },
      );
    const sessionNumber =
      (await database.collection("days").countDocuments({ userId, localDate })) +
      1;
    const result = await database.collection("days").insertOne({
      userId,
      branchId: new ObjectId(s.branchId),
      localDate,
      sessionNumber,
      timezone: body.timezone,
      status: "active",
      startedAt: now,
      startLocation: {
        ...body.location,
        capturedAt: new Date(body.location.capturedAt),
      },
      routeSamples: [
        {
          ...body.location,
          capturedAt: new Date(body.location.capturedAt),
        },
      ],
      routePath: [
        {
          latitude: body.location.latitude,
          longitude: body.location.longitude,
        },
      ],
      activities: [],
    });
    logCapturedLocation("day-start", s.userId, body.location);
    await createSessionNotification({
      type: "session_started",
      recipientId: policy.managerId,
      actorId: s.userId,
      actorName: s.name,
      branchId: s.branchId,
      dayId: String(result.insertedId),
      sessionNumber,
      createdAt: now,
    });
    return NextResponse.json(
      { _id: result.insertedId, sessionNumber },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
