"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { readJson } from "@/lib/client-http";

export default function ChangePasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");

  function close() {
    if (loading) return;
    setError("");
    setSuccess("");
    onClose();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const form = event.currentTarget,
      data = new FormData(form),
      newPassword = String(data.get("newPassword") || ""),
      confirmPassword = String(data.get("confirmPassword") || "");
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            currentPassword: data.get("currentPassword"),
            newPassword,
          }),
        }),
        result = await readJson<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error || "Could not change password");
      form.reset();
      setSuccess("Password changed successfully.");
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Could not change password",
      );
    } finally {
      setLoading(false);
    }
  }

  return open ? (
        <div className="modal-back" role="presentation" onMouseDown={close}>
          <section
            className="modal account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-password-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="status-row">
              <div>
                <span className="eyebrow">Account security</span>
                <h2 id="change-password-title">Change password</h2>
              </div>
              <button className="btn btn-plain" onClick={close} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <p className="muted account-copy">
              Use at least 8 characters with upper and lowercase letters, a number,
              and a special character.
            </p>
            {error && <div className="notice">{error}</div>}
            {success && <div className="notice notice-success">{success}</div>}
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="current-password">Current password</label>
                <input
                  id="current-password"
                  className="input"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  className="input"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  className="input"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-plain" onClick={close}>
                  Cancel
                </button>
                <button className="btn btn-red" disabled={loading}>
                  {loading ? "Changing…" : "Change password"}
                </button>
              </div>
            </form>
          </section>
        </div>
  ) : null;
}
