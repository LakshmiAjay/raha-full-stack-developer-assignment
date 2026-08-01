"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJson } from "@/lib/client-http";
export default function LoginForm() {
  const router = useRouter(),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = new FormData(e.currentTarget),
        res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: data.get("email"),
            password: data.get("password"),
          }),
        }),
        json = await readJson<{ role: string; error?: string }>(res);
      if (!res.ok) return setError(json.error || "Sign in failed");
      router.push(json.role === "head" ? "/team" : "/today");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="login-box">
      <span className="eyebrow">Welcome back</span>
      <h2>Sign in to your desk</h2>
      <p className="muted">Use the account assigned by your branch.</p>
      {error && <div className="notice">{error}</div>}
      <form onSubmit={submit}>
        <div className="field">
          <label>Work email</label>
          <input
            className="input"
            name="email"
            type="email"
            required
            placeholder="you@raha.in"
            defaultValue="arjun@raha.in"
          />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            className="input"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            defaultValue="Raha@123"
          />
        </div>
        <button
          className="btn btn-red"
          disabled={loading}
          style={{ width: "100%", marginTop: 8 }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="muted" style={{ fontSize: 12, marginTop: 22 }}>
        Demo accounts: <strong>arjun@raha.in</strong> or{" "}
        <strong>meera@raha.in</strong>
        <br />
        Password: <strong>Raha@123</strong>
      </p>
    </div>
  );
}
