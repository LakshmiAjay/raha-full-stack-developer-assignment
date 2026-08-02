"use client";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
export default function AppShell({
  name,
  role,
  children,
}: {
  name: string;
  role: "associate" | "head";
  children: React.ReactNode;
}) {
  const path = usePathname(),
    router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brandmark">R</span> Raha Fielddesk
        </div>
        <button className="btn btn-plain" onClick={logout}>
          <LogOut size={15} /> Sign out
        </button>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <span className="eyebrow">Workspace</span>
          <nav style={{ marginTop: 16 }}>
            {role === "associate" ? (
              <>
                <Link
                  href="/today"
                  className={`navitem ${path === "/today" ? "active" : ""}`}
                >
                  <CalendarDays size={17} /> Today
                </Link>
                <Link
                  href="/travel"
                  className={`navitem ${path === "/travel" ? "active" : ""}`}
                >
                  <Route size={17} /> My travel
                </Link>
                <Link
                  href="/approvals"
                  className={`navitem ${path === "/approvals" ? "active" : ""}`}
                >
                  <ShieldCheck size={17} /> Approvals
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/team"
                  className={`navitem ${path === "/team" ? "active" : ""}`}
                >
                  <LayoutDashboard size={17} /> Branch overview
                </Link>
                <Link
                  href="/approvals"
                  className={`navitem ${path === "/approvals" ? "active" : ""}`}
                >
                  <ShieldCheck size={17} /> Approvals
                </Link>
                <div className="navitem">
                  <Users size={17} /> Associates
                </div>
              </>
            )}
          </nav>
          <div className="side-note">
            <strong style={{ color: "var(--ink)" }}>{name}</strong>
            <br />
            {role === "head" ? "Branch head" : "Sales associate"}
            <br />
            <br />
            Location is captured only when you take an action.
          </div>
        </aside>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
