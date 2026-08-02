"use client";
import {
  CalendarDays,
  ChevronDown,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
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
    router = useRouter(),
    [profileOpen, setProfileOpen] = useState(false),
    [passwordOpen, setPasswordOpen] = useState(false),
    profileRef = useRef<HTMLDivElement>(null),
    initial = name.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    function closeProfile(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node))
        setProfileOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("mousedown", closeProfile);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeProfile);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function logout() {
    setProfileOpen(false);
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
        <div className="topbar-actions">
          {role === "head" && <NotificationBell />}
          <div className="profile-menu-wrap" ref={profileRef}>
            <button
              className="profile-trigger"
              onClick={() => setProfileOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label={`Open account menu for ${name}`}
            >
              <span className="profile-avatar">{initial}</span>
              <ChevronDown size={14} />
            </button>
            {profileOpen && (
              <div className="profile-menu" role="menu">
                <div className="profile-menu-head">
                  <strong>{name}</strong>
                  <span>{role === "head" ? "Branch head" : "Sales associate"}</span>
                </div>
                <button
                  className="profile-menu-item"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    setPasswordOpen(true);
                  }}
                >
                  <KeyRound size={15} /> Change password
                </button>
                <button
                  className="profile-menu-item danger"
                  role="menuitem"
                  onClick={() => void logout()}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
          <ChangePasswordDialog
            open={passwordOpen}
            onClose={() => setPasswordOpen(false)}
          />
        </div>
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
                <Link
                  href="/users"
                  className={`navitem ${path === "/users" ? "active" : ""}`}
                >
                  <Users size={17} /> Associates
                </Link>
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
