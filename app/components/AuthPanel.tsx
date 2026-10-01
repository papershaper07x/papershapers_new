"use client";

import { FormEvent, useState } from "react";

export function AuthPanel({ next, initialMode = "signup", googleEnabled = false }: { next: string; initialMode?: "login" | "signup"; googleEnabled?: boolean }) {
  const [mode, setMode] = useState(initialMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password"),
        role: data.get("role"),
        institution: data.get("institution"),
      }),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    window.location.assign(next);
  }

  return <div className="auth-card">
    <div className="auth-tabs" role="tablist" aria-label="Account action">
      <button className={mode === "signup" ? "is-active" : ""} onClick={() => { setMode("signup"); setError(""); }} type="button">Create account</button>
      <button className={mode === "login" ? "is-active" : ""} onClick={() => { setMode("login"); setError(""); }} type="button">Sign in</button>
    </div>
    <form onSubmit={submit}>
      {mode === "signup" && <>
        <label>Full name<input name="name" autoComplete="name" minLength={2} required /></label>
        <label>
          I am registering as:
          <select name="role" defaultValue="student" style={{ width: "100%", minHeight: "45px", padding: "0 10px", background: "white", border: "1px solid #ccc", borderRadius: "3px" }}>
            <option value="student">Student / Self-learner</option>
            <option value="teacher">Teacher / Educator</option>
          </select>
        </label>
      </>}
      <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={busy} type="submit">{busy ? "Working…" : mode === "signup" ? "Create my workspace →" : "Open my dashboard →"}</button>
    </form>
    {googleEnabled && <><div className="auth-divider" aria-hidden="true">or</div><a className="auth-google" href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}>Continue with Google</a></>}
    <p className="auth-fineprint">One account works across Study, Perspective, and Marketplace. Passwords are salted and hashed; session cookies are HTTP-only.</p>
  </div>;
}
