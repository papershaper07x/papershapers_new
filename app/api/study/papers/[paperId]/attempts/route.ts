import { rejectCrossOrigin } from "../../../../../../lib/request-safety";
import { tracedRoute } from "../../../../../../lib/observability";
import { withinRequestLimit, rateLimitResponse } from "../../../../../../lib/request-limit";
export const maxDuration = 60;

import { userFromRequest } from "../../../../../../lib/auth";
import { backendFetch, BackendResponseError, BackendUnavailableError } from "../../../../../../lib/backend";

async function handlePOST(request: Request, { params }: { params: Promise<{ paperId: string }> }) {
  const rejected = rejectCrossOrigin(request); if (rejected) return rejected;
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to submit an attempt." }, { status: 401 });
  const { paperId } = await params;
  const body = await request.json().catch(() => null) as { answers?: Array<{ questionId?: string; answer?: string }> } | null;
  if (!body || !Array.isArray(body.answers) || body.answers.length > 80 || body.answers.some((answer) => !answer || typeof answer.questionId !== "string" || !answer.questionId || typeof answer.answer !== "string" || answer.answer.length > 8000)) return Response.json({ error: "Provide valid responses for this paper (up to 8000 characters each)." }, { status: 400 });
  const answers = (body.answers ?? []).map((answer) => ({ question_id: answer.questionId ?? "", answer: answer.answer ?? "" }));
  if (!await withinRequestLimit("study-assessment", user.id, 60, 600)) return rateLimitResponse(600);
  try {
    return Response.json(await backendFetch(`/v1/study/papers/${encodeURIComponent(paperId)}/attempts`, { method: "POST", body: JSON.stringify({ user_id: user.id, answers }) }), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof BackendUnavailableError ? "The paper backend is offline." : error instanceof BackendResponseError && error.status < 500 ? error.message : "Assessment is temporarily unavailable. Your draft is saved; try again shortly." }, { status: error instanceof BackendResponseError ? error.status : 503, headers: error instanceof BackendResponseError && error.retryAfter ? { "Retry-After": error.retryAfter } : undefined });
  }
}



export const POST = tracedRoute("study.assessment", handlePOST);
