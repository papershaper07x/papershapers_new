import { tracedRoute } from "../../../../../lib/observability";
import { userFromRequest } from "../../../../../lib/auth";
import { backendFetch, BackendResponseError } from "../../../../../lib/backend";

async function handleGET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to check your paper." }, { status: 401 });
  const { jobId } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(jobId)) return Response.json({ error: "Invalid generation job." }, { status: 400 });
  try {
    const result = await backendFetch(`/v1/study/generation-jobs/${jobId}?user_id=${encodeURIComponent(user.id)}`, { signal: AbortSignal.timeout(15_000) });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: "We couldn’t check your paper yet. Please try again shortly." }, { status: error instanceof BackendResponseError ? error.status : 503 });
  }
}

export const GET = tracedRoute("study.poll", handleGET);
