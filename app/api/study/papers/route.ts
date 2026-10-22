import { tracedRoute } from "../../../../lib/observability";
import { userFromRequest } from "../../../../lib/auth";
import { backendFetch, BackendUnavailableError } from "../../../../lib/backend";

async function handleGET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to view your papers." }, { status: 401 });
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 50);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  try {
    const result = await backendFetch<{ items: unknown[]; has_more: boolean }>(`/v1/study/papers?user_id=${encodeURIComponent(user.id)}&limit=${limit}&offset=${offset}`);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof BackendUnavailableError ? "The paper backend is offline." : "Could not load your papers." }, { status: 503 });
  }
}

export const GET = tracedRoute("study.history", handleGET);
