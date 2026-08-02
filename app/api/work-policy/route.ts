import { requireSession } from "@/lib/auth";
import { policyForAssociate } from "@/lib/approvals";
import { db } from "@/lib/db";
import { demoEnabled, demoPolicy } from "@/lib/demo";
import { apiError, unauthorized } from "@/lib/http";
import { workPolicySchema } from "@/lib/validation";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (session.role === "associate")
    return NextResponse.json(await policyForAssociate(session.userId, session.branchId));
  if (demoEnabled()) return NextResponse.json(demoPolicy());
  const stored = await (await db()).collection("workPolicies").findOne({
    managerId: new ObjectId(session.userId),
    branchId: new ObjectId(session.branchId),
  });
  return NextResponse.json(
    stored ?? {
      managerId: session.userId,
      branchId: session.branchId,
      timezone: "Asia/Kolkata",
      startTime: "09:00",
      endTime: "18:00",
      holidays: [],
    },
  );
}

export async function PUT(request: Request) {
  try {
    const session = await requireSession("head");
    if (!session) return unauthorized();
    const body = workPolicySchema.parse(await request.json());
    if (body.startTime >= body.endTime)
      return NextResponse.json({ error: "End time must be later than start time" }, { status: 400 });
    try {
      new Intl.DateTimeFormat("en", { timeZone: body.timezone }).format();
    } catch {
      return NextResponse.json({ error: "Enter a valid timezone" }, { status: 400 });
    }
    if (demoEnabled()) {
      Object.assign(demoPolicy(), body, { updatedAt: new Date() });
      return NextResponse.json(demoPolicy());
    }
    await (await db()).collection("workPolicies").updateOne(
      {
        managerId: new ObjectId(session.userId),
        branchId: new ObjectId(session.branchId),
      },
      {
        $set: { ...body, updatedAt: new Date() },
        $setOnInsert: {
          managerId: new ObjectId(session.userId),
          branchId: new ObjectId(session.branchId),
        },
      },
      { upsert: true },
    );
    return NextResponse.json(body);
  } catch (error) {
    return apiError(error);
  }
}
