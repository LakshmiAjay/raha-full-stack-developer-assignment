import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import UsersDashboard from "@/components/UsersDashboard";

export default async function UsersPage() {
  const session = await requireSession("head");
  if (!session) redirect("/");
  return (
    <AppShell name={session.name} role="head">
      <UsersDashboard />
    </AppShell>
  );
}
