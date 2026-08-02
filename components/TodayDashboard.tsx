"use client";
import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Check,
  Clock3,
  MapPin,
  Navigation,
  Plus,
  X,
} from "lucide-react";
type Lead = { _id: string; name: string; contact: string };
type Loc = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};
type Activity = {
  _id: string;
  leadName: string;
  notes: string;
  createdAt: string;
  location: Loc;
};
type Day = {
  _id: string;
  status: "active" | "completed";
  startedAt: string;
  endedAt?: string;
  startLocation: Loc;
  endLocation?: Loc;
  activities: Activity[];
  totalDistanceKm?: number;
  distanceSource?: string;
};
function locate(): Promise<Loc> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Location is not supported on this device"));
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
          capturedAt: new Date(p.timestamp).toISOString(),
        }),
      () =>
        reject(
          new Error(
            "We could not access your location. Allow location access and try again.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  });
}
export default function TodayDashboard({ name }: { name: string }) {
  const [day, setDay] = useState<Day | null>(null),
    [leads, setLeads] = useState<Lead[]>([]),
    [leadsLoading, setLeadsLoading] = useState(false),
    [leadsError, setLeadsError] = useState(""),
    [modal, setModal] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    const params = new URLSearchParams({
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
      res = await fetch(`/api/day?${params}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Could not load your day");
    setDay(json);
  }, []);
  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    setLeadsError("");
    try {
      const res = await fetch("/api/leads", { cache: "no-store" }),
        json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Could not load branch leads");
      if (!Array.isArray(json)) throw new Error("Invalid leads response");
      setLeads(json);
    } catch (e) {
      setLeads([]);
      setLeadsError(
        e instanceof Error ? e.message : "Could not load branch leads",
      );
    } finally {
      setLeadsLoading(false);
    }
  }, []);
  useEffect(() => {
    load().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load your day"),
    );
  }, [load]);
  function openVisitModal() {
    setModal(true);
    void loadLeads();
  }
  async function action(url: string, payload: object) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
        json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    try {
      const location = await locate();
      await action("/api/day/start", {
        location,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function end() {
    try {
      const location = await locate();
      await action("/api/day/end", { location });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const location = await locate();
      if (
        await action("/api/day/activity", {
          leadId: form.get("leadId"),
          notes: form.get("notes"),
          location,
        })
      )
        setModal(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const active = day?.status === "active",
    events = day
      ? [
          {
            kind: "start",
            title: "Workday started",
            text: `Location accuracy ±${day.startLocation.accuracy} m`,
            at: day.startedAt,
          },
          ...day.activities.map((a) => ({
            kind: "visit",
            title: a.leadName,
            text: a.notes + ` · accuracy ±${a.location.accuracy} m`,
            at: a.createdAt,
          })),
          ...(day.endedAt
            ? [
                {
                  kind: "end",
                  title: "Workday ended",
                  text: `Location accuracy ±${day.endLocation?.accuracy} m`,
                  at: day.endedAt,
                },
              ]
            : []),
        ]
      : [];
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Today’s field log</span>
          <h1>
            Good {new Date().getHours() < 12 ? "morning" : "afternoon"},{" "}
            {name.split(" ")[0]}.
          </h1>
        </div>
        <div className="date-chip">
          {new Intl.DateTimeFormat("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date())}
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="grid-main">
        <div>
          <section className="card card-pad status-card">
            <div className="status-row">
              <div>
                <div>
                  <span className={`status-dot ${active ? "live" : ""}`} />
                  {active
                    ? "Workday in progress"
                    : day?.status === "completed"
                      ? "Workday completed"
                      : "Not started"}
                </div>
                <div className="big-time">
                  {day
                    ? new Date(day.startedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "— —"}
                </div>
                <div className="muted">
                  {active
                    ? `${day.activities.length} visit${day.activities.length === 1 ? "" : "s"} logged so far`
                    : day?.status === "completed"
                      ? "Your record is safely closed"
                      : "Ready when you are"}
                </div>
              </div>
              <Navigation size={24} color="var(--red)" />
            </div>
            <div className="actions">
              {!day || day.status === "completed" ? (
                <button
                  className="btn btn-primary"
                  onClick={start}
                  disabled={busy}
                >
                  <Clock3 size={16} />
                  Start day
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-red"
                    onClick={openVisitModal}
                    disabled={busy}
                  >
                    <Plus size={16} />
                    Log a visit
                  </button>
                  <button
                    className="btn btn-plain"
                    onClick={end}
                    disabled={busy}
                  >
                    <Check size={16} />
                    End day
                  </button>
                </>
              )}
            </div>
          </section>
          <section className="card card-pad" style={{ marginTop: 22 }}>
            <div className="status-row">
              <h2 className="section-title">Day timeline</h2>
              <span className="muted" style={{ fontSize: 12 }}>
                {events.length} stops
              </span>
            </div>
            {events.length ? (
              <div className="timeline">
                {events.map((e, i) => (
                  <div className="event" key={i}>
                    <div className="event-pin">
                      {e.kind === "visit" ? (
                        <BriefcaseBusiness size={12} />
                      ) : (
                        <MapPin size={12} />
                      )}
                    </div>
                    <div>
                      <h3>{e.title}</h3>
                      <p>{e.text}</p>
                    </div>
                    <time>
                      {new Date(e.at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">
                Your first location will appear here when you start the day.
              </div>
            )}
          </section>
        </div>
        <aside>
          <section className="card metric">
            <span className="eyebrow">Distance today</span>
            <div className="metric-value">
              {day?.totalDistanceKm?.toFixed(1) ?? "0.0"} <small>km</small>
            </div>
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>
              {day?.distanceSource ??
                "Calculated after your day ends, stop by stop."}
            </p>
          </section>
          <section className="card card-pad" style={{ marginTop: 22 }}>
            <h2 className="section-title">A clean record</h2>
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              Keep location services on when starting, visiting a lead, or
              ending the day. We do not track you continuously.
            </p>
          </section>
        </aside>
      </div>
      {modal && (
        <div className="modal-back" role="dialog" aria-modal="true">
          <form className="modal" onSubmit={add}>
            <div className="status-row">
              <div>
                <span className="eyebrow">In-person meeting</span>
                <h2>Log this visit</h2>
              </div>
              <button
                type="button"
                className="btn btn-plain"
                onClick={() => setModal(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="field">
              <label>Lead</label>
              <select
                className="input"
                name="leadId"
                required
                defaultValue=""
                disabled={leadsLoading || Boolean(leadsError) || !leads.length}
              >
                <option value="" disabled>
                  {leadsLoading
                    ? "Loading leads…"
                    : leadsError
                      ? "Could not load leads"
                      : leads.length
                        ? "Select a lead"
                        : "No leads available"}
                </option>
                {leads.map((l) => (
                  <option value={l._id} key={l._id}>
                    {l.name} · {l.contact}
                  </option>
                ))}
              </select>
              {leadsError && (
                <div style={{ marginTop: 8 }}>
                  <span className="notice">{leadsError}</span>
                  <button
                    type="button"
                    className="btn btn-plain"
                    onClick={() => void loadLeads()}
                    disabled={leadsLoading}
                    style={{ marginLeft: 8 }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
            <div className="field">
              <label>Meeting notes</label>
              <textarea
                className="input"
                name="notes"
                required
                minLength={3}
                placeholder="What was discussed? What happens next?"
              />
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Your current location will be captured when you save.
            </p>
            <button
              className="btn btn-red"
              style={{ width: "100%" }}
              disabled={busy || leadsLoading || !leads.length}
            >
              {busy ? "Getting location…" : "Save visit"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
