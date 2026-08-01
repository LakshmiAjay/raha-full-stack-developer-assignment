import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import TodayDashboard from "@/components/TodayDashboard";
export default async function Today() {
  const s = await requireSession("associate");
  if (!s) redirect("/");
  return (
    <AppShell name={s.name} role="associate">
      <TodayDashboard name={s.name} />
    </AppShell>
  );
}
