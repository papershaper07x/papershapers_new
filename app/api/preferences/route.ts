import { updatePreferences } from "../../../db/service";
import { userFromRequest } from "../../../lib/auth";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to save preferences." }, { status: 401 });
  const body = await request.json() as { portal?: string; values?: unknown; area?: string };
  if (body.portal !== "news" && body.portal !== "marketplace") return Response.json({ error: "Unknown portal." }, { status: 400 });
  if (!Array.isArray(body.values) || !body.values.every((value) => typeof value === "string") || body.values.length > 12) {
    return Response.json({ error: "Invalid preference selection." }, { status: 400 });
  }
  await updatePreferences(user.id, body.portal, body.values.map((value) => value.slice(0, 50)), body.area);
  return Response.json({ ok: true });
}
