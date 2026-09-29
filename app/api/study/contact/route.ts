import { createContactSubmission } from "../../../../db/service";

const roles = new Set(["student", "parent", "teacher", "coaching", "other"]);
const topics = new Set(["feedback", "school", "coaching", "partnership", "other"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: unknown; email?: unknown; role?: unknown; topic?: unknown; message?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 180) : "";
  const role = typeof body?.role === "string" ? body.role : "";
  const topic = typeof body?.topic === "string" ? body.topic : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !roles.has(role) || !topics.has(topic) || message.length < 12) {
    return Response.json({ error: "Please add your name, a valid email, a topic, and a short message." }, { status: 400 });
  }
  await createContactSubmission({ name, email, role, topic, message });
  return Response.json({ ok: true });
}
