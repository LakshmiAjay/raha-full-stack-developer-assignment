import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import TravelDashboard from "@/components/TravelDashboard";
export default async function Travel() {
  const s = await requireSession("associate");
  if (!s) redirect("/");
  return (
    <AppShell name={s.name} role="associate">
      <TravelDashboard />
    </AppShell>
  );
}
