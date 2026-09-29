import { userFromRequest } from "../../../../lib/auth";
import { backendFetch, BackendUnavailableError } from "../../../../lib/backend";

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to view your papers." }, { status: 401 });
  try {
    const result = await backendFetch<{ items: unknown[] }>(`/v1/study/papers?user_id=${encodeURIComponent(user.id)}`);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error instanceof BackendUnavailableError ? "The paper backend is offline." : "Could not load your papers." }, { status: 503 });
  }
}

