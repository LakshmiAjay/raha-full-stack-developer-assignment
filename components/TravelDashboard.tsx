"use client";
import { useCallback, useEffect, useState } from "react";
import { MapPin, Route } from "lucide-react";
import { readJson } from "@/lib/client-http";
type Day = {
  _id: string;
  localDate: string;
  status: "active" | "completed";
  startedAt: string;
  endedAt?: string;
  totalDistanceKm?: number;
  distanceSource?: string;
  activities: {
    _id: string;
    leadName: string;
    notes: string;
    createdAt: string;
  }[];
};
export default function TravelDashboard() {
  const [month, setMonth] = useState("");
  const [days, setDays] = useState<Day[]>([]);
  const [error, setError] = useState("");
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
            across completed days
          </span>
        </div>
        <div className="card metric">
          <span className="eyebrow">Days recorded</span>
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
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day._id}>
                    <td className="person">
                      {new Date(day.localDate + "T00:00:00").toLocaleDateString(
                        "en-IN",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
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
          Only locations captured during a field action are included.
        </small>
      </div>
    </>
  );
}
