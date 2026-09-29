import { backendFetch, BackendUnavailableError } from "../../../../lib/backend";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 10), 1), 30);
  try {
    return Response.json(await backendFetch(`/v1/news/articles?limit=${limit}`));
  } catch (error) {
    return Response.json({ items: [], offline: error instanceof BackendUnavailableError }, { status: 503 });
  }
}
