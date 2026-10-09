"use client";

/* eslint-disable react-hooks/set-state-in-effect -- Hydrate client-only browser drafts and report storage failures after server rendering. */

import { useEffect, useState } from "react";
import { readAttemptDraft, remainingSeconds } from "./attempt-draft";

export function useAttemptDraft(key: string, minutes: number | null) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [storageWarning, setStorageWarning] = useState("");
  useEffect(() => {
    if (minutes === null) return;
    const now = Date.now();
    let raw: string | null = null;
    try { raw = localStorage.getItem(key); }
    catch { setStorageWarning("This browser cannot save drafts. Keep this page open until you submit."); }
    const draft = readAttemptDraft(raw, now);
    const nextDeadline = draft?.deadline ?? now + minutes * 60_000;
    setAnswers(draft?.answers ?? {});
    setDeadline(nextDeadline);
    setSecondsLeft(remainingSeconds(nextDeadline, now));
  }, [key, minutes]);
  useEffect(() => {
    if (deadline === null) return;
    const timer = window.setInterval(() => setSecondsLeft(remainingSeconds(deadline, Date.now())), 1000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  useEffect(() => {
    if (deadline === null) return;
    try { localStorage.setItem(key, JSON.stringify({ answers, deadline, savedAt: Date.now() })); }
    catch { setStorageWarning("Draft saving is unavailable. Keep this page open until you submit."); }
  }, [answers, deadline, key]);
  function clearDraft() {
    try { localStorage.removeItem(key); } catch { /* Submission is already saved on the server. */ }
  }
  return { answers, setAnswers, secondsLeft, ready: deadline !== null, storageWarning, clearDraft };
}
