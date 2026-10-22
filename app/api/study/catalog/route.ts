import { backendFetch, BackendUnavailableError } from "../../../../lib/backend";

export async function GET() {
  try {
    // This endpoint contains only public curriculum metadata, never account data.
    const catalog = await backendFetch("/v1/study/catalog", { cache: "force-cache", next: { revalidate: 3600 } });
    return Response.json(catalog, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof BackendUnavailableError ? "The study backend is offline." : "The installed curriculum source is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

