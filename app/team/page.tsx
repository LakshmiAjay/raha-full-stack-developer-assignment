import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import TeamDashboard from "@/components/TeamDashboard";
export default async function Team() {
  const s = await requireSession("head");
  if (!s) redirect("/");
  return (
    <AppShell name={s.name} role="head">
      <TeamDashboard name={s.name} />
    </AppShell>
  );
}
