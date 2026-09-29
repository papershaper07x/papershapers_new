import { userFromRequest } from "../../../../../../../lib/auth";
import { backendFetch, BackendUnavailableError } from "../../../../../../../lib/backend";

export async function GET(request: Request, { params }: { params: Promise<{ paperId: string; attemptId: string }> }) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to view this result." }, { status: 401 });
  const { paperId, attemptId } = await params;
  try {
    return Response.json(await backendFetch(`/v1/study/papers/${encodeURIComponent(paperId)}/attempts/${encodeURIComponent(attemptId)}?user_id=${encodeURIComponent(user.id)}`));
  } catch (error) {
    return Response.json({ error: error instanceof BackendUnavailableError ? "The paper backend is offline." : "Attempt not found." }, { status: 404 });
  }
}

