import { backendFetch, BackendUnavailableError } from "../../../../lib/backend";

export async function GET() {
  try {
    return Response.json(await backendFetch("/v1/study/catalog"));
  } catch (error) {
    return Response.json({ error: error instanceof BackendUnavailableError ? "The study backend is offline." : "The installed curriculum source is unavailable." }, { status: 503 });
  }
}

