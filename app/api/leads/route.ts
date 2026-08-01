import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { demoEnabled, demoLeads } from "@/lib/demo";
export async function GET() {
  const s = await requireSession("associate");
  if (!s) return unauthorized();
  if (demoEnabled())
    return NextResponse.json(
      demoLeads.filter((l) => l.branchId === s.branchId),
    );
  const leads = await (
    await db()
  )
    .collection("leads")
    .find({ branchId: new ObjectId(s.branchId) })
    .project({ name: 1, contact: 1, location: 1 })
    .sort({ name: 1 })
    .toArray();
  return NextResponse.json(leads);
}
