"use client";

import { Bell, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Notification = {
  _id: string;
  type: "session_started" | "session_ended";
  actorName: string;
  sessionNumber: number;
  createdAt: string;
  readAt?: string;
};

function eventTime(value: string) {
  const date = new Date(value),
    today = new Date(),
    sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat("en-IN", {
    ...(sameDay
      ? {}
      : { day: "numeric" as const, month: "short" as const }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]),
    [unreadCount, setUnreadCount] = useState(0),
    [open, setOpen] = useState(false),
    container = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        notifications: Notification[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // A missed poll can wait until the next interval or tab focus.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 30_000),
      onVisibility = () => {
        if (document.visibilityState === "visible") void load();
      },
      onPointerDown = (event: PointerEvent) => {
        if (!container.current?.contains(event.target as Node)) setOpen(false);
      };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [load]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || !unreadCount) return;
    setUnreadCount(0);
    setNotifications((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
    try {
      const response = await fetch("/api/notifications", { method: "PATCH" });
      if (!response.ok) void load();
    } catch {
      void load();
    }
  }

  return (
    <div className="notification-center" ref={container}>
      <button
        className="notification-button"
        type="button"
        onClick={() => void toggle()}
        aria-label={
          unreadCount
            ? `${unreadCount} unread session notifications`
            : "Session notifications"
        }
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <section className="notification-panel" aria-label="Session notifications">
          <div className="notification-panel-head">
            <div>
              <span className="eyebrow">Branch activity</span>
              <h2>Session notifications</h2>
            </div>
            <span className="muted">Latest 20</span>
          </div>
          {notifications.length ? (
            <div className="notification-list">
              {notifications.map((item) => {
                const started = item.type === "session_started";
                return (
                  <article
                    className={`notification-item ${item.readAt ? "" : "unread"}`}
                    key={item._id}
                  >
                    <span className={`notification-icon ${started ? "started" : "ended"}`}>
                      {started ? <Play size={13} /> : <Square size={12} />}
                    </span>
                    <div>
                      <strong>{item.actorName}</strong>
                      <p>
                        {started ? "started" : "ended"} session {item.sessionNumber}
                      </p>
                    </div>
                    <time dateTime={item.createdAt}>{eventTime(item.createdAt)}</time>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="notification-empty">No session activity yet.</div>
          )}
        </section>
      )}
    </div>
  );
}
