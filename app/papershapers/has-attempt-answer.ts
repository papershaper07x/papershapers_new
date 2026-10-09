export function hasAttemptAnswer(value: string | undefined): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = JSON.parse(value) as { selection?: string; answer?: string; parts?: string[] };
    if (parsed && typeof parsed === "object" && "selection" in parsed) return hasAttemptAnswer(parsed.answer) || (Array.isArray(parsed.parts) && parsed.parts.some(hasAttemptAnswer));
  } catch { /* Ordinary written response. */ }
  return true;
}
