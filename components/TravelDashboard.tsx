"use client";
import { useCallback, useEffect, useState } from "react";
import { Clock3, Map, MapPin, Route, X } from "lucide-react";
import { readJson } from "@/lib/client-http";
import RouteMap from "@/components/RouteMap";
type Loc = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};
type Day = {
  _id: string;
  localDate: string;
  sessionNumber?: number;
  status: "active" | "completed";
  startedAt: string;
  endedAt?: string;
  totalDistanceKm?: number;
  distanceSource?: string;
  startLocation: Loc;
  endLocation?: Loc;
  routeSamples?: Loc[];
  routePath?: { latitude: number; longitude: number }[];
  activities: {
    _id: string;
    leadName: string;
    notes: string;
    createdAt: string;
    location: Loc;
  }[];
};
export default function TravelDashboard() {
  const [month, setMonth] = useState("");
  const [days, setDays] = useState<Day[]>([]);
  const [error, setError] = useState("");
  const [routeDay, setRouteDay] = useState<Day | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetch(`/api/travel${month ? `?month=${month}` : ""}`),
        json = await readJson<{ days: Day[]; error?: string }>(res);
      if (!res.ok)
        throw new Error(json.error || "Travel history could not be loaded");
      setDays(json.days);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Travel history could not be loaded",
      );
    }
  }, [month]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!routeOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRouteOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [routeOpen]);

  async function openRoute(day: Day) {
    setRouteOpen(true);
    setRouteDay(null);
    setRouteError("");
    setRouteLoading(true);
    try {
      const response = await fetch(`/api/travel/${day._id}`, {
          cache: "no-store",
        }),
        json = await readJson<Day & { error?: string }>(response);
      if (!response.ok)
        throw new Error(json.error || "Route history could not be loaded");
      setRouteDay(json);
    } catch (routeLoadError) {
      setRouteError(
        routeLoadError instanceof Error
          ? routeLoadError.message
          : "Route history could not be loaded",
      );
    } finally {
      setRouteLoading(false);
    }
  }

  const formatDate = (localDate: string) =>
      new Date(localDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    formatTime = (value?: string) =>
      value
        ? new Date(value).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Now";
  const completed = days.filter((d) => d.status === "completed"),
    total = completed.reduce((sum, d) => sum + (d.totalDistanceKm || 0), 0),
    visits = days.reduce((sum, d) => sum + d.activities.length, 0);
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Personal travel log</span>
          <h1>Roads you’ve covered.</h1>
          <p className="muted">
            A day-by-day record of visits and reimbursable distance.
          </p>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Filter by month</label>
          <input
            className="input"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="manager-grid">
        <div className="card metric">
          <span className="eyebrow">Distance</span>
          <div className="metric-value">
            {total.toFixed(1)} <small>km</small>
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            across completed sessions
          </span>
        </div>
        <div className="card metric">
          <span className="eyebrow">Sessions recorded</span>
          <div className="metric-value">{days.length}</div>
          <span className="muted" style={{ fontSize: 12 }}>
            {completed.length} completed
          </span>
        </div>
        <div className="card metric">
          <span className="eyebrow">Lead visits</span>
          <div className="metric-value">{visits}</div>
          <span className="muted" style={{ fontSize: 12 }}>
            in this period
          </span>
        </div>
      </div>
      <section className="card">
        <div
          className="card-pad"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <h2 className="section-title">Travel history</h2>
        </div>
        {days.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Visits</th>
                  <th>Status</th>
                  <th>Distance</th>
                  <th>Calculation</th>
                  <th>Route</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day._id}>
                    <td className="person">
                      {formatDate(day.localDate)}
                      <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                        Session {day.sessionNumber ?? 1}
                      </div>
                    </td>
                    <td>
                      {day.activities.length}
                      <div
                        className="muted"
                        style={{ fontSize: 11, marginTop: 3 }}
                      >
                        {day.activities.map((a) => a.leadName).join(" · ") ||
                          "No visits"}
                      </div>
                    </td>
                    <td>
                      <span className="pill">{day.status}</span>
                    </td>
                    <td>
                      <strong>{day.totalDistanceKm?.toFixed(1) ?? "—"}</strong>{" "}
                      km
                    </td>
                    <td className="muted">
                      {day.distanceSource || "Pending day close"}
                    </td>
                    <td>
                      <button
                        className="route-history-button"
                        onClick={() => void openRoute(day)}
                        type="button"
                      >
                        <Map size={14} />
                        View route
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <Route size={28} style={{ margin: "0 auto 10px" }} />
            <strong>No travel records yet</strong>
            <br />
            <span>Completed field days will appear here.</span>
          </div>
        )}
      </section>
      <div
        style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 18 }}
        className="muted"
      >
        <MapPin size={14} />
        <small>
          Saved road paths use field actions and two-minute route samples.
        </small>
      </div>
      {routeOpen && (
        <div
          className="modal-back"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setRouteOpen(false);
          }}
        >
          <section className="modal session-map-modal">
            <div className="status-row session-map-head">
              <div>
                <span className="eyebrow">Session route history</span>
                <h2>
                  {routeDay
                    ? `Session ${routeDay.sessionNumber ?? 1}`
                    : "Loading route…"}
                </h2>
                {routeDay && (
                  <p className="muted session-map-subtitle">
                    {formatDate(routeDay.localDate)} ·{" "}
                    {formatTime(routeDay.startedAt)}–
                    {formatTime(routeDay.endedAt)}
                  </p>
                )}
              </div>
              <button
                aria-label="Close route history"
                className="btn btn-plain"
                onClick={() => setRouteOpen(false)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            {routeLoading ? (
              <div className="empty session-map-loading">
                <Route size={28} />
                Preparing the saved road path…
              </div>
            ) : routeError ? (
              <div className="notice">{routeError}</div>
            ) : routeDay ? (
              <>
                <div className="session-map-summary">
                  <span>
                    <Route size={14} />
                    {routeDay.totalDistanceKm?.toFixed(1) ?? "—"} km
                  </span>
                  <span>
                    <MapPin size={14} />
                    {routeDay.activities.length} visit
                    {routeDay.activities.length === 1 ? "" : "s"}
                  </span>
                  <span>
                    <Clock3 size={14} /> {routeDay.status}
                  </span>
                </div>
                <RouteMap
                  active={routeDay.status === "active"}
                  pathPoints={routeDay.routePath}
                  routePoints={
                    routeDay.routeSamples?.length
                      ? routeDay.routeSamples
                      : [
                          routeDay.startLocation,
                          ...routeDay.activities.map(
                            (activity) => activity.location,
                          ),
                          ...(routeDay.endLocation
                            ? [routeDay.endLocation]
                            : []),
                        ]
                  }
                  sessionNumber={routeDay.sessionNumber ?? 1}
                  tracking={false}
                  visits={routeDay.activities}
                />
                {routeDay.activities.length > 0 && (
                  <div className="session-map-visits">
                    <strong>Lead visits on this route</strong>
                    <span>
                      {routeDay.activities
                        .map((activity) => activity.leadName)
                        .join(" · ")}
                    </span>
                  </div>
                )}
              </>
            ) : null}
          </section>
        </div>
      )}
    </>
  );
}
