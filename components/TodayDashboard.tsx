"use client";
import { useCallback, useEffect, useState } from "react";
import RouteMap from "@/components/RouteMap";
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
  leadLocationDistanceMeters?: number;
};
type Day = {
  _id: string;
  status: "active" | "completed";
  startedAt: string;
  endedAt?: string;
  startLocation: Loc;
  endLocation?: Loc;
  routeSamples?: Loc[];
  activities: Activity[];
  totalDistanceKm?: number;
  distanceSource?: string;
};
const TARGET_ACCURACY_METERS = 100,
  MAX_ACCEPTED_ACCURACY_METERS = 250,
  LOCATION_TIMEOUT_MS = 15000,
  ROUTE_SAMPLE_INTERVAL_MS = 120000,
  ROUTE_CONSENT_KEY = "raha-route-tracking-consent";

function positionToLocation(position: GeolocationPosition): Loc {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy),
    capturedAt: new Date(position.timestamp).toISOString(),
  };
}
function locate(): Promise<Loc> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation)
      return reject(new Error("Location is not supported on this device"));
    let bestPosition: GeolocationPosition | null = null,
      watchId: number | undefined,
      settled = false;
    const cleanup = () => {
        clearTimeout(timeoutId);
        if (watchId !== undefined)
          navigator.geolocation.clearWatch(watchId);
      },
      finish = () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (
          bestPosition &&
          bestPosition.coords.accuracy <= MAX_ACCEPTED_ACCURACY_METERS
        ) {
          resolve(positionToLocation(bestPosition));
          return;
        }
        const accuracy = bestPosition
          ? ` The best fix was ±${Math.round(bestPosition.coords.accuracy)} m.`
          : "";
        reject(
          new Error(
            `A precise device location could not be obtained.${accuracy} Turn on GPS and precise location, then try again.`,
          ),
        );
      },
      timeoutId = window.setTimeout(finish, LOCATION_TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy < bestPosition.coords.accuracy
        )
          bestPosition = position;
        if (position.coords.accuracy <= TARGET_ACCURACY_METERS) finish();
      },
      (error) => {
        if (error.code !== error.PERMISSION_DENIED) return;
        if (settled) return;
        settled = true;
        cleanup();
        reject(
          new Error(
            "Location permission was denied. Allow precise location access and try again.",
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: LOCATION_TIMEOUT_MS,
        maximumAge: 0,
      },
    );
  });
}
function leadDistanceLabel(meters: number) {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}
export default function TodayDashboard({ name }: { name: string }) {
  const [day, setDay] = useState<Day | null>(null),
    [leads, setLeads] = useState<Lead[]>([]),
    [leadsLoading, setLeadsLoading] = useState(false),
    [leadsError, setLeadsError] = useState(""),
    [modal, setModal] = useState(false),
    [busy, setBusy] = useState(false),
    [trackingAllowed, setTrackingAllowed] = useState(false),
    [trackingStatus, setTrackingStatus] = useState(""),
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
  useEffect(() => {
    setTrackingAllowed(localStorage.getItem(ROUTE_CONSENT_KEY) === "true");
  }, []);
  useEffect(() => {
    if (day?.status !== "active" || !trackingAllowed) {
      setTrackingStatus(
        day?.status === "active" ? "Route tracking is paused" : "",
      );
      return;
    }
    let cancelled = false,
      timerId: number;
    const scheduleNext = () => {
      timerId = window.setTimeout(async () => {
        setTrackingStatus("Getting the next precise route point…");
        try {
          const location = await locate();
          if (cancelled) return;
          const res = await fetch("/api/day/location", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ location }),
            }),
            json = await res.json();
          if (!res.ok) throw new Error(json.error || "Route point was not saved");
          if (json.recorded)
            setDay((current) =>
              current && current.status === "active"
                ? {
                    ...current,
                    routeSamples: [...(current.routeSamples ?? []), location],
                  }
                : current,
            );
          setTrackingStatus("Route updated · next point in 2 minutes");
        } catch (trackingError) {
          if (!cancelled)
            setTrackingStatus(
              trackingError instanceof Error
                ? trackingError.message
                : "Could not save this route point",
            );
        } finally {
          if (!cancelled) scheduleNext();
        }
      }, ROUTE_SAMPLE_INTERVAL_MS);
    };
    setTrackingStatus("Route tracking on · next point in 2 minutes");
    scheduleNext();
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [day?._id, day?.status, trackingAllowed]);
  function changeTrackingConsent(allowed: boolean) {
    setTrackingAllowed(allowed);
    localStorage.setItem(ROUTE_CONSENT_KEY, String(allowed));
  }
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
    routePoints = day
      ? day.routeSamples?.length
        ? day.routeSamples
        : [
            day.startLocation,
            ...day.activities.map((activity) => activity.location),
            ...(day.endLocation ? [day.endLocation] : []),
          ]
      : [],
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
            text: a.notes,
            proximity:
              a.leadLocationDistanceMeters === undefined
                ? `GPS accuracy ±${a.location.accuracy} m`
                : `${leadDistanceLabel(a.leadLocationDistanceMeters)} from saved lead location · GPS accuracy ±${a.location.accuracy} m`,
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
              {!day ? (
                <button
                  className="btn btn-primary"
                  onClick={start}
                  disabled={busy || !trackingAllowed}
                >
                  <Clock3 size={16} />
                  Start day
                </button>
              ) : day.status === "active" ? (
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
              ) : null}
            </div>
            {(!day || day.status === "active") && (
              <label className="route-consent">
                <input
                  type="checkbox"
                  checked={trackingAllowed}
                  onChange={(event) =>
                    changeTrackingConsent(event.target.checked)
                  }
                />
                <span>
                  Record my route every 2 minutes while this page is active.
                  {day ? " You can pause this at any time." : " Required to start the day."}
                </span>
              </label>
            )}
            {trackingStatus && (
              <div className="route-tracking-status">{trackingStatus}</div>
            )}
          </section>
          {day && (
            <RouteMap
              routePoints={routePoints}
              visits={day.activities}
              active={active}
              tracking={active && trackingAllowed}
            />
          )}
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
                      {"proximity" in e && e.proximity && (
                        <span className="proximity-note">{e.proximity}</span>
                      )}
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
              With route tracking enabled, a location point is saved every two
              minutes while this page remains active. Tracking stops when you
              end the day, pause consent, close, or suspend the page.
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
              Your current location will be captured and compared with the
              lead’s saved location when you save.
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
