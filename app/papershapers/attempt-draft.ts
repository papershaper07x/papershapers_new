export type AttemptDraft = { answers: Record<string, string>; deadline: number; savedAt: number };

export function readAttemptDraft(raw: string | null, now: number): AttemptDraft | null {
  try {
    const value = JSON.parse(raw || "null");
    if (!value || typeof value !== "object" || !Number.isFinite(value.deadline) ||
      !Number.isFinite(value.savedAt) || now - value.savedAt > 86_400_000 ||
      !value.answers || typeof value.answers !== "object" || Array.isArray(value.answers) ||
      Object.entries(value.answers).some(([id, answer]) => !id || typeof answer !== "string" || answer.length > 8000)) return null;
    return value as AttemptDraft;
  } catch { return null; }
}

export function remainingSeconds(deadline: number, now: number) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
