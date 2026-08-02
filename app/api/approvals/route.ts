import { requireSession } from "@/lib/auth";
import { managerFor, managerNameMap } from "@/lib/approvals";
import { db } from "@/lib/db";
import {
  demoApprovals,
  demoEnabled,
  demoId,
} from "@/lib/demo";
import { apiError, unauthorized } from "@/lib/http";
import { approvalRequestSchema } from "@/lib/validation";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (demoEnabled()) {
    const names = await managerNameMap(
      session.role === "head" ? session.userId : (await managerFor(session.userId)) ?? "",
    );
    const approvals = demoApprovals()
      .filter((item) =>
        session.role === "head"
          ? item.managerId === session.userId
          : item.userId === session.userId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((item) => ({ ...item, associateName: names.get(item.userId) }));
    return NextResponse.json(approvals);
  }
  const filter =
      session.role === "head"
        ? { managerId: new ObjectId(session.userId) }
        : { userId: new ObjectId(session.userId) },
    rows = await (await db())
      .collection("approvals")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray(),
    names =
      session.role === "head"
        ? await managerNameMap(session.userId)
        : new Map<string, string>();
  return NextResponse.json(
    rows.map((row) => ({
      ...row,
      associateName: names.get(String(row.userId)),
    })),
  );
}

export async function POST(request: Request) {
  try {
    const session = await requireSession("associate");
    if (!session) return unauthorized();
    const body = approvalRequestSchema.parse(await request.json()),
      managerId = await managerFor(session.userId);
    if (!managerId)
      return NextResponse.json(
        { error: "A manager must be assigned before requesting approval" },
        { status: 409 },
      );
    const record = {
      ...body,
      status: "pending" as const,
      userId: session.userId,
      managerId,
      branchId: session.branchId,
      createdAt: new Date(),
    };
    if (demoEnabled()) {
      const created = { _id: demoId(), ...record };
      demoApprovals().push(created);
      return NextResponse.json(created, { status: 201 });
    }
    const result = await (await db()).collection("approvals").insertOne({
      ...record,
      userId: new ObjectId(session.userId),
      managerId: new ObjectId(managerId),
      branchId: new ObjectId(session.branchId),
    });
    return NextResponse.json({ _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
