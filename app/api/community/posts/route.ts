import { userFromRequest } from "../../../../lib/auth";
import { createCommunityPost } from "../../../../db/service";
import {rejectCrossOrigin,readBoundedText,BodyTooLargeError} from '../../../../lib/request-safety';
import {withinRequestLimit,rateLimitResponse} from '../../../../lib/request-limit';

export async function POST(request: Request) {
  const rejected=rejectCrossOrigin(request);if(rejected)return rejected;
  try {
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Please sign in before sending a note for review." }, { status: 401 });
  let body:{title?:unknown;summary?:unknown;body?:unknown}|null;
  try{body=JSON.parse(await readBoundedText(request,16000));}catch(error){if(error instanceof BodyTooLargeError)throw error;return Response.json({error:'Enter a valid note.'},{status:400});}
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['title','summary','body'].includes(key)))return Response.json({error:'Enter a valid note.'},{status:400});
  const title = typeof body?.title === "string" ? body.title.trim().replace(/\s+/g, " ").slice(0, 120) : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim().replace(/\s+/g, " ").slice(0, 240) : "";
  const content = typeof body?.body === "string" ? body.body.trim().slice(0, 3000) : "";
  if (title.length < 8 || summary.length < 24 || content.length < 80) {
    return Response.json({ error: "Please add a clear title, a useful one-sentence summary, and at least a short paragraph." }, { status: 400 });
  }
  if(!await withinRequestLimit('journal.post',user.id,5,86400,true))return rateLimitResponse(86400);
  await createCommunityPost({ authorId: user.id, authorLabel: user.name.split(" ")[0].slice(0, 40) || "Paper Shapers learner", title, summary, body: content });
  return Response.json({ ok: true }, { status: 201 });
  }catch(error){return Response.json({error:error instanceof BodyTooLargeError?error.message:'Could not save your note. Please retry.'},{status:error instanceof BodyTooLargeError?413:503});}
}
