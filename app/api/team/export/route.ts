import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/http";
import { ObjectId } from "mongodb";
import { demoDays, demoEnabled, demoUsers } from "@/lib/demo";
import {
  demoTeamExportRows,
  teamExportPipeline,
  type TeamExportRow,
} from "@/lib/team-export";
export async function GET(request: Request) {
  const s = await requireSession("head");
  if (!s) return unauthorized();
  const month = new URL(request.url).searchParams.get("month");
  if (!month || !/^\d{4}-\d{2}$/.test(month))
    return new Response("Invalid month", { status: 400 });
  let rows: TeamExportRow[];
  if (demoEnabled()) {
    rows = demoTeamExportRows(
      demoUsers,
      demoDays(),
      s.userId,
      s.branchId,
      month,
    );
  } else {
    const database = await db();
    rows = (await database
      .collection("users")
      .aggregate<TeamExportRow>(
        teamExportPipeline(
          new ObjectId(s.userId),
          new ObjectId(s.branchId),
          month,
        ),
      )
      .toArray()) as TeamExportRow[];
  }
  const csv = [
    "Associate,Email,Sessions worked,Distance (km)",
    ...rows.map((r) =>
      [r.name, r.email, r.daysWorked, r.distanceKm]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="raha-distance-${month}.csv"`,
    },
  });
}
