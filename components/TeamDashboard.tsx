"use client";
import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Download,
  Map,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";
import RouteMap from "@/components/RouteMap";
type Associate = { _id: string; name: string };
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
  leadLocationDistanceMeters?: number;
};
type Day = {
  _id: string;
  userId: string;
  associateName: string;
  localDate: string;
  sessionNumber?: number;
  status: "active" | "completed";
  startedAt: string;
  endedAt?: string;
  startLocation: Loc;
  endLocation?: Loc;
  routeSamples?: Loc[];
  routePath?: { latitude: number; longitude: number }[];
  activities: Activity[];
  totalDistanceKm?: number;
};
type HistoryData = { associate: Associate; days: Day[] };
function leadDistanceLabel(meters: number) {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}
function todayValue() {
  const today = new Date(),
    year = today.getFullYear(),
    month = String(today.getMonth() + 1).padStart(2, "0"),
    day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export default function TeamDashboard({ name }: { name: string }) {
  const [data, setData] = useState<{ associates: Associate[]; days: Day[] }>({
      associates: [],
      days: [],
    }),
    [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7)),
    [history, setHistory] = useState<HistoryData | null>(null),
    [historyOpen, setHistoryOpen] = useState(false),
    [historyLoading, setHistoryLoading] = useState(false),
    [historyError, setHistoryError] = useState(""),
    [expandedRouteId, setExpandedRouteId] = useState<string | null>(null),
    [routeDays, setRouteDays] = useState<Record<string, Day>>({}),
    [routeLoadingId, setRouteLoadingId] = useState<string | null>(null),
    [routeErrors, setRouteErrors] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/team?${params}`);
    setData(await res.json());
  }, [q, from, to]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  function showToday() {
    const today = todayValue();
    setFrom(today);
    setTo(today);
  }
  async function openHistory(associateId: string) {
    setHistoryOpen(true);
    setHistory(null);
    setHistoryError("");
    setExpandedRouteId(null);
    setRouteDays({});
    setRouteErrors({});
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ associateId }),
        res = await fetch(`/api/team/history?${params}`, { cache: "no-store" }),
        json = await res.json();
      if (!res.ok)
        throw new Error(json.error || "Could not load activity history");
      setHistory(json);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Could not load activity history",
      );
    } finally {
      setHistoryLoading(false);
    }
  }
  async function toggleRoute(day: Day) {
    if (expandedRouteId === day._id) {
      setExpandedRouteId(null);
      return;
    }
    setExpandedRouteId(day._id);
    if (routeDays[day._id]) return;
    setRouteLoadingId(day._id);
    setRouteErrors((current) => ({ ...current, [day._id]: "" }));
    try {
      const response = await fetch(`/api/team/history/${day._id}`, {
          cache: "no-store",
        }),
        json = await response.json();
      if (!response.ok)
        throw new Error(json.error || "Could not load this session route");
      setRouteDays((current) => ({ ...current, [day._id]: json }));
    } catch (routeError) {
      setRouteErrors((current) => ({
        ...current,
        [day._id]:
          routeError instanceof Error
            ? routeError.message
            : "Could not load this session route",
      }));
    } finally {
      setRouteLoadingId(null);
    }
  }
  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const total = data.days.reduce((n, d) => n + (d.totalDistanceKm || 0), 0),
    visits = data.days.reduce((n, d) => n + d.activities.length, 0);
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Branch overview</span>
          <h1>The field, at a glance.</h1>
          <p className="muted">{name}, here’s what your team has recorded.</p>
        </div>
        <div className="filters">
          <div className="field">
            <label>Reimbursement month</label>
            <input
              className="input"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <a className="btn btn-red" href={`/api/team/export?month=${month}`}>
            <Download size={15} /> Export CSV
          </a>
        </div>
      </div>
      <div className="manager-grid">
        <div className="card metric">
          <span className="eyebrow">Associates</span>
          <div className="metric-value">{data.associates.length}</div>
          <span className="muted" style={{ fontSize: 12 }}>
            in this view
          </span>
        </div>
        <div className="card metric">
          <span className="eyebrow">Visits recorded</span>
          <div className="metric-value">{visits}</div>
          <span className="muted" style={{ fontSize: 12 }}>
            across selected days
          </span>
        </div>
        <div className="card metric">
          <span className="eyebrow">Distance</span>
          <div className="metric-value">
            {total.toFixed(1)} <small>km</small>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            live estimates included
          </span>
        </div>
      </div>
      <section className="card">
        <div
          className="card-pad"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div className="filters">
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>Find an associate</label>
              <div style={{ position: "relative" }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 13,
                    color: "var(--muted)",
                  }}
                />
                <input
                  className="input"
                  style={{ paddingLeft: 36 }}
                  placeholder="Search by name"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>From</label>
              <input
                type="date"
                className="input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="field">
              <label>To</label>
              <input
                type="date"
                className="input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-plain"
              onClick={showToday}
              title="Show records from today"
            >
              <CalendarDays size={15} />
              Today
            </button>
          </div>
        </div>
        <div className="table-wrap">
          {data.days.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Associate</th>
                  <th>Date</th>
                  <th>Visits</th>
                  <th>Day status</th>
                  <th>Distance</th>
                </tr>
              </thead>
              <tbody>
                {data.days.map((d) => (
                  <tr key={d._id}>
                    <td className="person">
                      <button
                        className="history-link"
                        onClick={() => void openHistory(String(d.userId))}
                      >
                        {d.associateName}
                        <span>View history</span>
                      </button>
                    </td>
                    <td>
                      {new Date(d.localDate + "T00:00:00").toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                      <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                        Session {d.sessionNumber ?? 1}
                      </div>
                    </td>
                    <td>
                      {d.activities.length}
                      {d.activities[0] && (
                        <div
                          className="muted"
                          style={{ fontSize: 11, marginTop: 3 }}
                        >
                          {d.activities[0].leadName}
                          {d.activities.length > 1
                            ? ` +${d.activities.length - 1}`
                            : ""}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="pill">{d.status}</span>
                    </td>
                    <td>
                      <strong>{d.totalDistanceKm?.toFixed(1) ?? "—"}</strong> km
                      {d.status === "active" && (
                        <div
                          className="muted"
                          style={{ fontSize: 11, marginTop: 3 }}
                        >
                          Live estimate
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <Users size={28} style={{ margin: "0 auto 10px" }} />
              No team records match these filters.
            </div>
          )}
        </div>
      </section>
      {historyOpen && (
        <div className="modal-back" role="dialog" aria-modal="true">
          <section className="modal history-modal">
            <div className="status-row history-head">
              <div>
                <span className="eyebrow">Associate activity history</span>
                <h2>{history?.associate.name ?? "Loading history…"}</h2>
              </div>
              <button
                className="btn btn-plain"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close activity history"
              >
                <X size={16} />
              </button>
            </div>
            {historyLoading ? (
              <div className="empty">Loading day-by-day activity…</div>
            ) : historyError ? (
              <div className="notice">{historyError}</div>
            ) : history?.days.length ? (
              <div className="history-days">
                {history.days.map((day) => (
                  <article className="history-day" key={day._id}>
                    <div className="status-row history-day-head">
                      <div>
                        <strong>
                          {new Date(
                            day.localDate + "T00:00:00",
                          ).toLocaleDateString("en-IN", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </strong>
                        <div className="muted history-summary">
                          Session {day.sessionNumber ?? 1} · {day.activities.length} visit
                          {day.activities.length === 1 ? "" : "s"} ·{" "}
                          {day.totalDistanceKm?.toFixed(1) ?? "—"} km
                          {day.status === "active" ? " live estimate" : ""}
                        </div>
                      </div>
                      <div className="history-day-actions">
                        <span className="pill">{day.status}</span>
                        <button
                          className="route-history-button"
                          onClick={() => void toggleRoute(day)}
                          type="button"
                        >
                          <Map size={14} />
                          {expandedRouteId === day._id
                            ? "Hide route"
                            : "View route"}
                          {expandedRouteId === day._id ? (
                            <ChevronUp size={13} />
                          ) : (
                            <ChevronDown size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                    {expandedRouteId === day._id && (
                      <div className="manager-session-route">
                        {routeLoadingId === day._id ? (
                          <div className="manager-route-loading">
                            <Map size={22} /> Preparing saved road path…
                          </div>
                        ) : routeErrors[day._id] ? (
                          <div className="notice">{routeErrors[day._id]}</div>
                        ) : routeDays[day._id] ? (
                          <RouteMap
                            active={routeDays[day._id].status === "active"}
                            pathPoints={routeDays[day._id].routePath}
                            routePoints={
                              routeDays[day._id].routeSamples?.length
                                ? routeDays[day._id].routeSamples!
                                : [
                                    routeDays[day._id].startLocation,
                                    ...routeDays[day._id].activities.map(
                                      (activity) => activity.location,
                                    ),
                                    ...(routeDays[day._id].endLocation
                                      ? [routeDays[day._id].endLocation!]
                                      : []),
                                  ]
                            }
                            sessionNumber={day.sessionNumber ?? 1}
                            tracking={false}
                            visits={routeDays[day._id].activities}
                          />
                        ) : null}
                      </div>
                    )}
                    <div className="timeline history-timeline">
                      <div className="event">
                        <div className="event-pin">
                          <MapPin size={12} />
                        </div>
                        <div>
                          <h3>Day started</h3>
                          <p>Location accuracy ±{day.startLocation.accuracy} m</p>
                        </div>
                        <time>{formatTime(day.startedAt)}</time>
                      </div>
                      {day.activities.map((activity) => (
                        <div className="event" key={activity._id}>
                          <div className="event-pin">
                            <BriefcaseBusiness size={12} />
                          </div>
                          <div>
                            <h3>{activity.leadName}</h3>
                            <p>{activity.notes}</p>
                            <span className="proximity-note">
                              {activity.leadLocationDistanceMeters === undefined
                                ? `GPS accuracy ±${activity.location.accuracy} m`
                                : `${leadDistanceLabel(activity.leadLocationDistanceMeters)} from saved lead location · GPS accuracy ±${activity.location.accuracy} m`}
                            </span>
                          </div>
                          <time>{formatTime(activity.createdAt)}</time>
                        </div>
                      ))}
                      {day.endedAt && (
                        <div className="event">
                          <div className="event-pin">
                            <MapPin size={12} />
                          </div>
                          <div>
                            <h3>Day ended</h3>
                            <p>
                              Location accuracy ±{day.endLocation?.accuracy} m
                            </p>
                          </div>
                          <time>{formatTime(day.endedAt)}</time>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">No activity history recorded.</div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
