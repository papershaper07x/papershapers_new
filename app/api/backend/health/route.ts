import { backendFetch, BackendUnavailableError } from "../../../../lib/backend";

export async function GET() {
  try {
    return Response.json(await backendFetch<Record<string, unknown>>("/health"));
  } catch (error) {
    return Response.json({ status: "offline", error: error instanceof BackendUnavailableError ? "Start the local backend with .\\backend.ps1 run." : "Backend health check failed." }, { status: 503 });
  }
}
