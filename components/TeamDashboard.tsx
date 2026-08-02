"use client";
import { useCallback, useEffect, useState } from "react";
import { Download, Search, Users } from "lucide-react";
type Associate = { _id: string; name: string };
type Activity = {
  _id: string;
  leadName: string;
  notes: string;
  createdAt: string;
};
type Day = {
  _id: string;
  associateName: string;
  localDate: string;
  status: string;
  activities: Activity[];
  totalDistanceKm?: number;
};
export default function TeamDashboard({ name }: { name: string }) {
  const [data, setData] = useState<{ associates: Associate[]; days: Day[] }>({
      associates: [],
      days: [],
    }),
    [q, setQ] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
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
                    <td className="person">{d.associateName}</td>
                    <td>
                      {new Date(d.localDate + "T00:00:00").toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
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
    </>
  );
}
