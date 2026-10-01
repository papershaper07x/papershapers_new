"use client";

import { FormEvent, useState } from "react";

export function CommunityPostForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/community/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), summary: form.get("summary"), body: form.get("body") }) });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "We could not save that note. Please try again.");
      setStatus("idle");
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") return <div className="contact-form__success" role="status">Your note is with the editorial queue. It will only appear in the Journal if it is approved.</div>;
  return <form className="contact-form journal-form" onSubmit={submit}>
    <label className="journal-form__wide">A clear title<input name="title" required minLength={8} maxLength={120} placeholder="A 20-minute plan before a science test" /></label>
    <label className="journal-form__wide">One-sentence summary<textarea name="summary" required minLength={24} maxLength={240} placeholder="Tell readers what they will get from this note." /></label>
    <label className="contact-form__message">Your note<textarea name="body" required minLength={80} maxLength={3000} placeholder="Write in your own words. Keep it practical, kind, and free of personal details." /></label>
    <p className="contact-form__note">Submitted notes are stored for moderation, not published automatically. By sending one, you confirm it is your original writing and suitable for a public student-learning space.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button--accent" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending for review…" : "Send for review →"}</button>
  </form>;
}
