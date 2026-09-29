import { addStudyRequest } from "../../../../db/service";
import { userFromRequest } from "../../../../lib/auth";

const allowedSubjects = new Set(["Mathematics", "Science", "English", "Social Science"]);
const allowedGrades = new Set(["8", "9", "10", "11", "12"]);
const allowedFocus = new Set(["Quick check", "Exam practice", "Weak spots"]);

export async function POST(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in is required to create a study brief." }, { status: 401 });
  const body = await request.json() as { subject?: string; grade?: string; focus?: string };
  if (!body.subject || !allowedSubjects.has(body.subject) || !body.grade || !allowedGrades.has(body.grade) || !body.focus || !allowedFocus.has(body.focus)) {
    return Response.json({ error: "Choose a valid subject, class, and study intent." }, { status: 400 });
  }
  return Response.json({ request: await addStudyRequest(user.id, body.subject, body.grade, body.focus) }, { status: 201 });
}
