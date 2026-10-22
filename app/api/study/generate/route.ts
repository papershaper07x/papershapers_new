import { rejectCrossOrigin } from "../../../../lib/request-safety";
import { tracedRoute } from "../../../../lib/observability";
import { withinRequestLimit } from "../../../../lib/request-limit";
export const maxDuration = 60;

import { userFromRequest } from "../../../../lib/auth";
import { membership } from "../../../../lib/billing";
import { generationAllowance, STUDY_PLANS } from "../../../../lib/study-plans";
import { backendFetch, BackendResponseError, BackendUnavailableError } from "../../../../lib/backend";

async function handlePOST(request: Request) {
  const rejected = rejectCrossOrigin(request); if (rejected) return rejected;
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to generate a paper." }, { status: 401 });
  const body = await request.json().catch(() => null) as { mode?: string; academicSession?: string; paperSize?: string; board?: string; grade?: string; subject?: string; chapters?: string[]; focus?: string } | null;
  if (body?.mode && body.mode !== "practice" && body.mode !== "board-mock") return Response.json({ error: "Choose a supported paper mode." }, { status: 400 });
  if (!body || (body.paperSize !== "half" && body.paperSize !== "full") || typeof body.grade !== "string" || !/^(?:[1-9]|1[0-2])$/.test(body.grade) || typeof body.subject !== "string" || body.subject.length > 80 || typeof body.focus !== "string" || !body.focus.trim() || body.focus.length > 80 || (body.chapters !== undefined && (!Array.isArray(body.chapters) || body.chapters.length > 12 || body.chapters.some((chapter) => typeof chapter !== "string" || chapter.length > 120)))) {
    return Response.json({ error: "Choose a valid paper size, class, subject, and focus." }, { status: 400 });
  }
  const paid = Boolean(await membership(user.id));
  if (!await withinRequestLimit("study-generation", user.id, generationAllowance(paid), STUDY_PLANS.windowSeconds)) {
    return Response.json({ error: "Generation requests are arriving too quickly. Wait for the next 10-minute window." }, { status: 429, headers: { "Retry-After": String(STUDY_PLANS.windowSeconds) } });
  }
  try {
    const result = await backendFetch<{ job: { id: string; status: string } }>("/v1/study/generation-jobs", { method: "POST", signal: AbortSignal.timeout(15_000), body: JSON.stringify({ user_id: user.id, mode: body.mode || "practice", academic_session: body.academicSession || "2026-27", paper_size: body.paperSize, board: body.board || "CBSE", grade: body.grade, subject: body.subject, chapters: body.chapters || [], focus: body.focus }) });
    return Response.json(result, { status: 202 });
  } catch (error) {
    const message = error instanceof BackendUnavailableError ? "Paper generation is temporarily unavailable. Please try again shortly." : error instanceof Error ? error.message : "Paper generation failed.";
    return Response.json({ error: message }, { status: error instanceof BackendResponseError ? error.status : 503, headers: error instanceof BackendResponseError && error.retryAfter ? { "Retry-After": error.retryAfter } : undefined });
  }
}

export const POST = tracedRoute("study.generation", handlePOST);
