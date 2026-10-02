export const maxDuration = 60;

import { userFromRequest } from "../../../../../../lib/auth";
import { backendFetch, BackendUnavailableError } from "../../../../../../lib/backend";

export async function POST(request: Request, { params }: { params: Promise<{ paperId: string }> }) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to submit an attempt." }, { status: 401 });
  const { paperId } = await params;
  const body = await request.json() as { answers?: Array<{ questionId?: string; answer?: string }> };
  const answers = (body.answers ?? []).map((answer) => ({ question_id: answer.questionId ?? "", answer: answer.answer ?? "" }));
  try {
    return Response.json(await backendFetch(`/v1/study/papers/${encodeURIComponent(paperId)}/attempts`, { method: "POST", body: JSON.stringify({ user_id: user.id, answers }) }), { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof BackendUnavailableError ? "The paper backend is offline." : "Could not review this attempt." }, { status: 503 });
  }
}


