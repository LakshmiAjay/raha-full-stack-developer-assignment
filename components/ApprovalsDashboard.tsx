"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Plus, ShieldCheck, Trash2, X } from "lucide-react";

type ApprovalType =
  | "lead_creation"
  | "holiday_work"
  | "session_start"
  | "session_end";
type Approval = {
  _id: string;
  type: ApprovalType;
  status: "pending" | "approved" | "rejected";
  associateName?: string;
  requestedDate?: string;
  requestedTime?: string;
  reason: string;
  payload?: {
    name?: string;
    contact?: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt: string;
  decisionNote?: string;
};
type Policy = {
  timezone: string;
  startTime: string;
  endTime: string;
  holidays: { date: string; name: string }[];
};
const typeLabels: Record<ApprovalType, string> = {
  lead_creation: "New lead",
  holiday_work: "Holiday work",
  session_start: "Session start",
  session_end: "Session end",
};
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ApprovalsDashboard({
  name,
  role,
}: {
  name: string;
  role: "associate" | "head";
}) {
  const [requests, setRequests] = useState<Approval[]>([]),
    [policy, setPolicy] = useState<Policy>({
      timezone: "Asia/Kolkata",
      startTime: "09:00",
      endTime: "18:00",
      holidays: [],
    }),
    [requestType, setRequestType] = useState<Exclude<ApprovalType, "lead_creation">>("holiday_work"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [approvalResponse, policyResponse] = await Promise.all([
        fetch("/api/approvals", { cache: "no-store" }),
        fetch("/api/work-policy", { cache: "no-store" }),
      ]),
      approvalsJson = await approvalResponse.json(),
      policyJson = await policyResponse.json();
    if (!approvalResponse.ok)
      throw new Error(approvalsJson.error || "Could not load approvals");
    if (!policyResponse.ok)
      throw new Error(policyJson.error || "Could not load work policy");
    setRequests(approvalsJson);
    setPolicy(policyJson);
  }, []);
  useEffect(() => {
    load().catch((loadError) =>
      setError(loadError instanceof Error ? loadError.message : "Could not load approvals"),
    );
  }, [load]);
  async function send(body: object, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/approvals", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
        json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not submit request");
      setMessage(success);
      await load();
      return true;
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not submit request");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function submitPreapproval(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      await send(
        {
          type: requestType,
          requestedDate: form.get("requestedDate"),
          requestedTime: form.get("requestedTime") || undefined,
          reason: form.get("reason"),
        },
        "Pre-approval request sent to your manager.",
      )
    ) event.currentTarget.reset();
  }
  async function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      await send(
        {
          type: "lead_creation",
          reason: form.get("reason"),
          payload: {
            name: form.get("name"),
            contact: form.get("contact"),
            latitude: form.get("latitude"),
            longitude: form.get("longitude"),
          },
        },
        "Lead proposal sent. It will appear in the lead list after approval.",
      )
    ) event.currentTarget.reset();
  }
  async function decide(id: string, decision: "approved" | "rejected") {
    const note = window.prompt(
      decision === "approved" ? "Optional note for the associate" : "Reason for rejection",
      "",
    );
    if (note === null) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/approvals/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision, note }),
        }),
        json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not update request");
      await load();
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Could not update request");
    } finally {
      setBusy(false);
    }
  }
  async function savePolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/work-policy", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(policy),
        }),
        json = await response.json();
      if (!response.ok) throw new Error(json.error || "Could not save policy");
      setPolicy(json);
      setMessage("Work policy saved.");
    } catch (policyError) {
      setError(policyError instanceof Error ? policyError.message : "Could not save policy");
    } finally {
      setBusy(false);
    }
  }
  const pending = requests.filter((request) => request.status === "pending"),
    closed = requests.filter((request) => request.status !== "pending");
  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Approvals & pre-approvals</span>
          <h1>{role === "head" ? "Decisions, in one place." : "Ask before you act."}</h1>
          <p className="muted">
            {role === "head"
              ? `${name}, review exceptions and keep branch policy current.`
              : "Track manager decisions and request exceptions in advance."}
          </p>
        </div>
        <div className="date-chip"><ShieldCheck size={15} /> Manager-controlled</div>
      </div>
      {error && <div className="notice">{error}</div>}
      {message && <div className="notice success">{message}</div>}
      {role === "associate" ? (
        <div className="approval-layout">
          <div>
            <section className="card card-pad">
              <span className="eyebrow">Pre-approval</span>
              <h2 className="approval-heading">Plan an exception</h2>
              <p className="muted approval-copy">
                Current work window: {policy.startTime}–{policy.endTime} ({policy.timezone}).
              </p>
              <form onSubmit={submitPreapproval}>
                <div className="field">
                  <label>Request for</label>
                  <select className="input" value={requestType} onChange={(e) => setRequestType(e.target.value as typeof requestType)}>
                    <option value="holiday_work">Working on a holiday</option>
                    <option value="session_start">Start outside the work window</option>
                    <option value="session_end">End outside the work window</option>
                  </select>
                </div>
                <div className="approval-two-col">
                  <div className="field"><label>Date</label><input className="input" name="requestedDate" type="date" min={today()} required /></div>
                  <div className="field"><label>Expected time</label><input className="input" name="requestedTime" type="time" /></div>
                </div>
                <div className="field"><label>Reason</label><textarea className="input" name="reason" required minLength={3} placeholder="Why is this exception needed?" /></div>
                <button className="btn btn-primary" disabled={busy}><Clock3 size={16} /> Request pre-approval</button>
              </form>
            </section>
            <section className="card card-pad" style={{ marginTop: 22 }}>
              <span className="eyebrow">Lead proposal</span>
              <h2 className="approval-heading">Add a new lead</h2>
              <p className="muted approval-copy">The lead becomes available for visits only after your manager approves it.</p>
              <form onSubmit={submitLead}>
                <div className="field"><label>Lead name</label><input className="input" name="name" required minLength={2} /></div>
                <div className="field"><label>Contact</label><input className="input" name="contact" required placeholder="Name · phone number" /></div>
                <div className="approval-two-col">
                  <div className="field"><label>Latitude</label><input className="input" name="latitude" type="number" step="any" min="-90" max="90" required /></div>
                  <div className="field"><label>Longitude</label><input className="input" name="longitude" type="number" step="any" min="-180" max="180" required /></div>
                </div>
                <div className="field"><label>Why add this lead?</label><textarea className="input" name="reason" required minLength={3} /></div>
                <button className="btn btn-red" disabled={busy}><Plus size={16} /> Send lead for approval</button>
              </form>
            </section>
          </div>
          <RequestLists pending={pending} closed={closed} role={role} busy={busy} decide={decide} />
        </div>
      ) : (
        <div className="approval-layout">
          <RequestLists pending={pending} closed={closed} role={role} busy={busy} decide={decide} />
          <section className="card card-pad policy-card">
            <span className="eyebrow">Branch rules</span>
            <h2 className="approval-heading">Work policy</h2>
            <form onSubmit={savePolicy}>
              <div className="field"><label>Timezone</label><input className="input" value={policy.timezone} onChange={(e) => setPolicy({ ...policy, timezone: e.target.value })} required /></div>
              <div className="approval-two-col">
                <div className="field"><label>Start time</label><input className="input" type="time" value={policy.startTime} onChange={(e) => setPolicy({ ...policy, startTime: e.target.value })} required /></div>
                <div className="field"><label>End time</label><input className="input" type="time" value={policy.endTime} onChange={(e) => setPolicy({ ...policy, endTime: e.target.value })} required /></div>
              </div>
              <div className="status-row" style={{ alignItems: "center", marginTop: 22 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Holidays</label>
                <button type="button" className="btn btn-plain" onClick={() => setPolicy({ ...policy, holidays: [...policy.holidays, { date: today(), name: "" }] })}><Plus size={14} /> Add holiday</button>
              </div>
              {policy.holidays.map((holiday, index) => (
                <div className="holiday-row" key={`${holiday.date}-${index}`}>
                  <input className="input" type="date" value={holiday.date} onChange={(e) => setPolicy({ ...policy, holidays: policy.holidays.map((item, i) => i === index ? { ...item, date: e.target.value } : item) })} required />
                  <input className="input" value={holiday.name} placeholder="Holiday name" onChange={(e) => setPolicy({ ...policy, holidays: policy.holidays.map((item, i) => i === index ? { ...item, name: e.target.value } : item) })} required />
                  <button type="button" className="icon-button" aria-label="Remove holiday" onClick={() => setPolicy({ ...policy, holidays: policy.holidays.filter((_, i) => i !== index) })}><Trash2 size={15} /></button>
                </div>
              ))}
              {!policy.holidays.length && <div className="empty compact">No holidays configured.</div>}
              <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={busy}>Save work policy</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function RequestLists({ pending, closed, role, busy, decide }: {
  pending: Approval[];
  closed: Approval[];
  role: "associate" | "head";
  busy: boolean;
  decide: (id: string, decision: "approved" | "rejected") => Promise<void>;
}) {
  return (
    <div>
      <section className="card card-pad">
        <div className="status-row"><div><span className="eyebrow">Pending</span><h2 className="approval-heading">Needs a decision</h2></div><span className="request-count">{pending.length}</span></div>
        {pending.length ? <div className="request-list">{pending.map((request) => <RequestCard key={request._id} request={request} role={role} busy={busy} decide={decide} />)}</div> : <div className="empty compact">Nothing is waiting right now.</div>}
      </section>
      <section className="card card-pad" style={{ marginTop: 22 }}>
        <span className="eyebrow">History</span><h2 className="approval-heading">Recent decisions</h2>
        {closed.length ? <div className="request-list">{closed.map((request) => <RequestCard key={request._id} request={request} role={role} busy={busy} decide={decide} />)}</div> : <div className="empty compact">No decisions yet.</div>}
      </section>
    </div>
  );
}

function RequestCard({ request, role, busy, decide }: {
  request: Approval;
  role: "associate" | "head";
  busy: boolean;
  decide: (id: string, decision: "approved" | "rejected") => Promise<void>;
}) {
  return <article className="request-card">
    <div className="status-row">
      <div><span className={`approval-status ${request.status}`}>{request.status}</span><strong>{typeLabels[request.type]}</strong></div>
      <time>{new Date(request.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</time>
    </div>
    {request.associateName && <div className="request-person">{request.associateName}</div>}
    {request.type === "lead_creation" && <div className="request-detail"><strong>{request.payload?.name}</strong><br />{request.payload?.contact}<br />{request.payload?.latitude}, {request.payload?.longitude}</div>}
    {request.requestedDate && <div className="request-detail">{new Date(`${request.requestedDate}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}{request.requestedTime ? ` · ${request.requestedTime}` : ""}</div>}
    <p>{request.reason}</p>
    {request.decisionNote && <div className="decision-note">Manager note: {request.decisionNote}</div>}
    {role === "head" && request.status === "pending" && <div className="request-actions"><button className="btn btn-primary" disabled={busy} onClick={() => void decide(request._id, "approved")}><Check size={15} /> Approve</button><button className="btn btn-plain" disabled={busy} onClick={() => void decide(request._id, "rejected")}><X size={15} /> Reject</button></div>}
  </article>;
}
