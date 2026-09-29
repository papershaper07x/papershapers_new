import { backendFetch, BackendUnavailableError } from "../../../../lib/backend";

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const params = new URLSearchParams();
  if (incoming.searchParams.get("area")) params.set("area", incoming.searchParams.get("area")!);
  for (const interest of incoming.searchParams.getAll("interests")) params.append("interests", interest);
  try {
    return Response.json(await backendFetch(`/v1/marketplace/listings?${params}`));
  } catch (error) {
    return Response.json({ items: [], offline: error instanceof BackendUnavailableError }, { status: 503 });
  }
}
