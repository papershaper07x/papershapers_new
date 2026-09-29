import { userFromRequest } from "../../../../../../lib/auth";
import { backendFetch, BackendResponseError, BackendUnavailableError } from "../../../../../../lib/backend";

export async function POST(request: Request, { params }: { params: Promise<{ paperId: string }> }) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to send paper feedback." }, { status: 401 });
  const { paperId } = await params;
  const body = await request.json() as { category?: string; comment?: string };
  if (!['good-fit', 'difficulty', 'wording', 'coverage', 'other'].includes(body.category ?? "")) return Response.json({ error: "Choose a feedback category." }, { status: 400 });
  try {
    return Response.json(await backendFetch(`/v1/study/papers/${encodeURIComponent(paperId)}/feedback`, { method: "POST", body: JSON.stringify({ user_id: user.id, category: body.category, comment: String(body.comment ?? "").slice(0, 1200) }) }));
  } catch (error) {
    const message = error instanceof BackendUnavailableError ? "The paper backend is offline." : error instanceof Error ? error.message : "Feedback could not be saved.";
    return Response.json({ error: message }, { status: error instanceof BackendResponseError ? error.status : 503 });
  }
}
