import { userFromRequest } from "../../../../lib/auth";
import { createCommunityPost } from "../../../../db/service";

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Please sign in before sending a note for review." }, { status: 401 });
  const body = await request.json().catch(() => null) as { title?: unknown; summary?: unknown; body?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().replace(/\s+/g, " ").slice(0, 120) : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim().replace(/\s+/g, " ").slice(0, 240) : "";
  const content = typeof body?.body === "string" ? body.body.trim().slice(0, 3000) : "";
  if (title.length < 8 || summary.length < 24 || content.length < 80) {
    return Response.json({ error: "Please add a clear title, a useful one-sentence summary, and at least a short paragraph." }, { status: 400 });
  }
  await createCommunityPost({ authorId: user.id, authorLabel: user.name.split(" ")[0].slice(0, 40) || "Paper Shapers learner", title, summary, body: content });
  return Response.json({ ok: true }, { status: 201 });
}
