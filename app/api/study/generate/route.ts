import { withinRequestLimit, rateLimitResponse } from "../../../../lib/request-limit";
export const maxDuration = 60;

import { addStudyRequest } from "../../../../db/service";
import { userFromRequest } from "../../../../lib/auth";
import { backendFetch, BackendResponseError, BackendUnavailableError } from "../../../../lib/backend";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to generate a paper." }, { status: 401 });
  const body = await request.json().catch(() => null) as { paperSize?: string; board?: string; grade?: string; subject?: string; chapters?: string[]; focus?: string } | null;
  if (!body || (body.paperSize !== "half" && body.paperSize !== "full") || typeof body.grade !== "string" || !/^(?:[1-9]|1[0-2])$/.test(body.grade) || typeof body.subject !== "string" || body.subject.length > 80 || typeof body.focus !== "string" || !body.focus.trim() || body.focus.length > 80 || (body.chapters !== undefined && (!Array.isArray(body.chapters) || body.chapters.length > 12 || body.chapters.some((chapter) => typeof chapter !== "string" || chapter.length > 120)))) {
    return Response.json({ error: "Choose a valid paper size, class, subject, and focus." }, { status: 400 });
  }
  if (!await withinRequestLimit("study-generation", user.id, 6, 600)) return rateLimitResponse(600);
  try {
    const result = await backendFetch<{ paper: Record<string, unknown> }>("/v1/study/papers", { method: "POST", body: JSON.stringify({ user_id: user.id, paper_size: body.paperSize, board: body.board || "CBSE", grade: body.grade, subject: body.subject, chapters: body.chapters || [], focus: body.focus }) });
    const paperId = typeof result.paper.id === "string" ? result.paper.id : undefined;
    const brief = await addStudyRequest(user.id, body.subject, body.grade, body.focus, `${body.paperSize === "full" ? "Full" : "Half"} paper generated`, paperId);
    return Response.json({ ...result, brief }, { status: 201 });
  } catch (error) {
    const message = error instanceof BackendUnavailableError ? "Paper generation is temporarily unavailable. Please try again shortly." : error instanceof Error ? error.message : "Paper generation failed.";
    return Response.json({ error: message }, { status: error instanceof BackendResponseError ? error.status : 503 });
  }
}
