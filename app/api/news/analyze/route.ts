export const maxDuration = 60;

import { backendFetch, BackendUnavailableError } from "../../../../lib/backend";

export async function POST(request: Request) {
  const body = await request.json() as { articleId?: string };
  if (!body.articleId) return Response.json({ error: "Article ID is required." }, { status: 400 });
  try {
    return Response.json(await backendFetch("/v1/news/analyze", { method: "POST", body: JSON.stringify({ article_id: body.articleId }) }));
  } catch (error) {
    return Response.json({ error: error instanceof BackendUnavailableError ? "The news inference backend is offline." : error instanceof Error ? error.message : "Analysis failed." }, { status: 503 });
  }
}
