import { addStudyRequest } from "../../../../db/service";
import { userFromRequest } from "../../../../lib/auth";
import { backendFetch, BackendResponseError, BackendUnavailableError } from "../../../../lib/backend";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to generate a paper." }, { status: 401 });
  const body = await request.json() as { paperSize?: string; board?: string; grade?: string; subject?: string; chapters?: string[]; focus?: string };
  if ((body.paperSize !== "half" && body.paperSize !== "full") || !body.grade || !body.subject || !body.focus) {
    return Response.json({ error: "Choose a valid paper size, class, subject, and focus." }, { status: 400 });
  }
  try {
    const result = await backendFetch<{ paper: Record<string, unknown> }>("/v1/study/papers", { method: "POST", body: JSON.stringify({ user_id: user.id, paper_size: body.paperSize, board: body.board || "CBSE", grade: body.grade, subject: body.subject, chapters: body.chapters || [], focus: body.focus }) });
    const brief = await addStudyRequest(user.id, body.subject, body.grade, body.focus, `${body.paperSize === "full" ? "Full" : "Half"} paper generated`);
    return Response.json({ ...result, brief }, { status: 201 });
  } catch (error) {
    const message = error instanceof BackendUnavailableError ? "The paper backend is offline. Start it with .\\backend.ps1 run." : error instanceof Error ? error.message : "Paper generation failed.";
    return Response.json({ error: message }, { status: error instanceof BackendResponseError ? error.status : 503 });
  }
}
