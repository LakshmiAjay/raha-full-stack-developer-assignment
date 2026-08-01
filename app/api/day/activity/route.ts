import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, unauthorized } from "@/lib/http";
import { activitySchema } from "@/lib/validation";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled, demoId, demoLeads } from "@/lib/demo";
export async function POST(request: Request) {
  try {
    const s = await requireSession("associate");
    if (!s) return unauthorized();
    const body = activitySchema.parse(await request.json());
    if (demoEnabled()) {
      const lead = demoLeads.find(
          (l) => l._id === body.leadId && l.branchId === s.branchId,
        ),
        day = demoDays().find(
          (d) => d.userId === s.userId && d.status === "active",
        );
      if (!lead)
        return NextResponse.json(
          { error: "Lead not found in your branch" },
          { status: 404 },
        );
      if (!day)
        return NextResponse.json(
          { error: "Start your day before logging an activity" },
          { status: 409 },
        );
      const activity = {
        _id: demoId(),
        leadId: lead._id,
        leadName: lead.name,
        notes: body.notes,
        location: {
          ...body.location,
          capturedAt: new Date(body.location.capturedAt),
        },
        createdAt: new Date(),
      };
      day.activities.push(activity);
      return NextResponse.json(activity, { status: 201 });
    }
    const database = await db(),
      leadId = new ObjectId(body.leadId);
    const lead = await database
      .collection("leads")
      .findOne({ _id: leadId, branchId: new ObjectId(s.branchId) });
    if (!lead)
      return NextResponse.json(
        { error: "Lead not found in your branch" },
        { status: 404 },
      );
    const activity = {
      _id: new ObjectId(),
      leadId,
      leadName: lead.name,
      notes: body.notes,
      location: {
        ...body.location,
        capturedAt: new Date(body.location.capturedAt),
      },
      createdAt: new Date(),
    };
    const result = await database
      .collection("days")
      .updateOne(
        { userId: new ObjectId(s.userId), status: "active" },
        { $push: { activities: activity } as never },
      );
    if (!result.modifiedCount)
      return NextResponse.json(
        { error: "Start your day before logging an activity" },
        { status: 409 },
      );
    return NextResponse.json(activity, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
