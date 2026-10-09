import { saveItem } from "../../../db/service";
import { userFromRequest } from "../../../lib/auth";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to save this item." }, { status: 401 });
  const body = await request.json() as { portal?: string; itemKey?: string; title?: string; metadata?: Record<string, unknown> };
  if (body.portal !== "marketplace" || !body.itemKey || body.itemKey === "__preferences__" || !body.title) {
    return Response.json({ error: "Invalid saved item." }, { status: 400 });
  }
  await saveItem(user.id, body.portal, body.itemKey, body.title, body.metadata ?? {});
  return Response.json({ ok: true }, { status: 201 });
}
