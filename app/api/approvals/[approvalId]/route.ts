import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { demoApprovals, demoEnabled, demoLeads, demoId } from "@/lib/demo";
import { apiError, unauthorized } from "@/lib/http";
import { approvalDecisionSchema } from "@/lib/validation";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ approvalId: string }> },
) {
  try {
    const session = await requireSession("head");
    if (!session) return unauthorized();
    const { approvalId } = await context.params,
      body = approvalDecisionSchema.parse(await request.json()),
      now = new Date();
    if (!ObjectId.isValid(approvalId))
      return NextResponse.json({ error: "Invalid approval request" }, { status: 400 });
    if (demoEnabled()) {
      const approval = demoApprovals().find(
        (item) => item._id === approvalId && item.managerId === session.userId,
      );
      if (!approval || approval.status !== "pending")
        return NextResponse.json({ error: "This request is no longer pending" }, { status: 409 });
      approval.status = body.decision;
      approval.decisionNote = body.note;
      approval.decidedAt = now;
      if (body.decision === "approved" && approval.type === "lead_creation") {
        const payload = approval.payload as {
          name: string;
          contact: string;
          latitude: number;
          longitude: number;
        };
        demoLeads.push({
          _id: demoId(),
          name: payload.name,
          contact: payload.contact,
          location: { latitude: payload.latitude, longitude: payload.longitude },
          branchId: session.branchId,
        });
      }
      return NextResponse.json(approval);
    }
    const database = await db(),
      approval = await database.collection("approvals").findOne({
        _id: new ObjectId(approvalId),
        managerId: new ObjectId(session.userId),
        status: "pending",
      });
    if (!approval)
      return NextResponse.json({ error: "This request is no longer pending" }, { status: 409 });
    if (body.decision === "approved" && approval.type === "lead_creation") {
      const payload = approval.payload as {
        name: string;
        contact: string;
        latitude: number;
        longitude: number;
      };
      await database.collection("leads").insertOne({
        name: payload.name,
        contact: payload.contact,
        location: { latitude: payload.latitude, longitude: payload.longitude },
        branchId: approval.branchId,
        proposedBy: approval.userId,
        approvedBy: new ObjectId(session.userId),
        approvedAt: now,
      });
    }
    await database.collection("approvals").updateOne(
      { _id: approval._id, status: "pending" },
      {
        $set: {
          status: body.decision,
          decisionNote: body.note,
          decidedAt: now,
          decidedBy: new ObjectId(session.userId),
        },
      },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
