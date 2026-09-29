"use client";

import { useState } from "react";

export function StudyContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setState("sending"); setError("");
    const response = await fetch("/api/study/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const result = await response.json() as { error?: string };
    if (!response.ok) { setState("error"); setError(result.error ?? "Your note could not be sent just yet."); return; }
    form.reset(); setState("sent");
  }
  if (state === "sent") return <p className="contact-form__success" role="status">Thank you — your note is with the Paper Shapers team.</p>;
  return <form className="contact-form" onSubmit={submit}><label>Your name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label><label>Email for a reply<input name="email" required type="email" maxLength={180} autoComplete="email" /></label><label>I am a<select name="role" defaultValue="student"><option value="student">Student</option><option value="parent">Parent or guardian</option><option value="teacher">Teacher</option><option value="coaching">Coaching team</option><option value="other">Other</option></select></label><label>This is about<select name="topic" defaultValue="feedback"><option value="feedback">Feedback on Paper Shapers</option><option value="school">A school enquiry</option><option value="coaching">A coaching enquiry</option><option value="partnership">A partnership</option><option value="other">Something else</option></select></label><label className="contact-form__message">Your note<textarea name="message" required minLength={12} maxLength={2000} placeholder="Tell us what worked, what felt confusing, or what would make studying easier." /></label>{state === "error" && <p className="form-error" role="alert">{error}</p>}<button className="button button--accent" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send your note"} →</button><p className="contact-form__note">We use this to reply and improve Paper Shapers. Please do not include answers, marks, or private student records.</p></form>;
}
