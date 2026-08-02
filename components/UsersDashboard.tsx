"use client";

import { Check, Copy, RotateCcw, UserPlus, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { readJson } from "@/lib/client-http";

type Associate = {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
  passwordChangedAt?: string;
};

export default function UsersDashboard() {
  const [users, setUsers] = useState<Associate[]>([]),
    [loading, setLoading] = useState(true),
    [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [resettingId, setResettingId] = useState<string | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [initialPassword, setInitialPassword] = useState(""),
    [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/users", { cache: "no-store" }),
        result = await readJson<{ users?: Associate[]; error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not load associates");
      setUsers(result.users || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load associates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function close() {
    if (saving) return;
    setOpen(false);
    setInitialPassword("");
    setError("");
    setCopied(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = event.currentTarget,
      data = new FormData(form);
    try {
      const response = await fetch("/api/users", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: data.get("name"), email: data.get("email") }),
        }),
        result = await readJson<{
          user?: Associate;
          initialPassword?: string;
          error?: string;
        }>(response);
      if (!response.ok || !result.user || !result.initialPassword)
        throw new Error(result.error || "Could not add associate");
      setUsers((current) =>
        [...current, result.user as Associate].sort((a, b) => a.name.localeCompare(b.name)),
      );
      form.reset();
      setInitialPassword(result.initialPassword);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add associate");
    } finally {
      setSaving(false);
    }
  }

  async function copyPassword() {
    await navigator.clipboard.writeText(initialPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function resetPassword(user: Associate) {
    if (
      !window.confirm(
        `Reset ${user.name}'s password to the branch default, Raha@123?`,
      )
    )
      return;
    setResettingId(user._id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/users/${user._id}/reset-password`, {
          method: "POST",
        }),
        result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not reset password");
      setUsers((current) =>
        current.map((item) =>
          item._id === user._id
            ? { ...item, passwordChangedAt: undefined }
            : item,
        ),
      );
      setMessage(`${user.name}'s password was reset to Raha@123.`);
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Could not reset password",
      );
    } finally {
      setResettingId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Branch access</span>
          <h1>Manage associates.</h1>
          <p className="muted">Create sign-in access for people in your branch.</p>
        </div>
        <button className="btn btn-red" onClick={() => setOpen(true)}>
          <UserPlus size={16} /> Add associate
        </button>
      </div>
      {message && <div className="notice notice-success">{message}</div>}
      {error && !open && <div className="notice">{error}</div>}
      <section className="card">
        <div className="card-pad user-list-head">
          <div>
            <span className="eyebrow">Associates</span>
            <h2 className="section-title">{users.length} branch users</h2>
            <p className="muted default-password-note">
              New associate default password: <strong>Raha@123</strong>
            </p>
          </div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="empty">Loading associates…</div>
          ) : users.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Work email</th>
                  <th>Password status</th>
                  <th>Added</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="person">{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className="pill">
                        {user.passwordChangedAt ? "Changed by user" : "Default password"}
                      </span>
                    </td>
                    <td>
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-plain btn-compact"
                        disabled={resettingId === user._id}
                        onClick={() => void resetPassword(user)}
                      >
                        <RotateCcw size={14} />
                        {resettingId === user._id ? "Resetting…" : "Reset password"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty">
              <Users size={28} style={{ margin: "0 auto 10px" }} />
              No associates have been added yet.
            </div>
          )}
        </div>
      </section>
      {open && (
        <div className="modal-back" role="presentation" onMouseDown={close}>
          <section
            className="modal account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-associate-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="status-row">
              <div>
                <span className="eyebrow">New branch user</span>
                <h2 id="add-associate-title">Add an associate</h2>
              </div>
              <button className="btn btn-plain" onClick={close} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            {initialPassword ? (
              <div>
                <div className="notice notice-success">
                  Account created. Share the default password with the associate.
                </div>
                <div className="password-reveal">
                  <code>{initialPassword}</code>
                  <button className="btn btn-plain" onClick={() => void copyPassword()}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="muted account-copy">
                  This default remains available on the Associates page. The associate
                  can replace it using “Change password” in the top bar.
                </p>
                <div className="modal-actions">
                  <button className="btn btn-red" onClick={close}>Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                {error && <div className="notice">{error}</div>}
                <div className="field">
                  <label htmlFor="associate-name">Full name</label>
                  <input id="associate-name" className="input" name="name" required />
                </div>
                <div className="field">
                  <label htmlFor="associate-email">Work email</label>
                  <input
                    id="associate-email"
                    className="input"
                    name="email"
                    type="email"
                    autoComplete="off"
                    required
                  />
                </div>
                <p className="muted account-copy">
                  The account will start with the branch default password,
                  <strong> Raha@123</strong>.
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-plain" onClick={close}>Cancel</button>
                  <button className="btn btn-red" disabled={saving}>
                    {saving ? "Creating…" : "Create account"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
