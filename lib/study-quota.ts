import { withinRequestLimit } from "./request-limit";

export const DAILY_AI_ALLOWANCE = 5;
export const AI_DAY_SECONDS = 86400;

// Shared by generation and assessment. Browser storage is never authority.
export async function dailyStudyQuota(userId: string, limiter = withinRequestLimit): Promise<Response | null> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const retryAfter = AI_DAY_SECONDS - nowSeconds % AI_DAY_SECONDS;
  try {
    if (await limiter("study-ai-daily", userId, DAILY_AI_ALLOWANCE, AI_DAY_SECONDS, true)) return null;
    return Response.json({ error: `Your ${DAILY_AI_ALLOWANCE} daily AI requests have been used. Paper generation and AI feedback share this allowance, including failed requests. It resets at 00:00 UTC (05:30 India time). Your saved papers and results remain available.`, resetsAt: new Date((nowSeconds + retryAfter) * 1000).toISOString() }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  } catch {
    return Response.json({ error: "AI usage protection is temporarily unavailable. Please try again later. Your saved work remains available." }, { status: 503 });
  }
}
