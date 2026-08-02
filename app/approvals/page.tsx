import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ApprovalsDashboard from "@/components/ApprovalsDashboard";

export default async function ApprovalsPage() {
  const session = await requireSession();
  if (!session) redirect("/");
  return (
    <AppShell name={session.name} role={session.role}>
      <ApprovalsDashboard name={session.name} role={session.role} />
    </AppShell>
  );
}
