import {readBoundedText,BodyTooLargeError} from '../../../../lib/request-safety';
import { getDb } from '../../../../db';
import { userFromRequest } from '../../../../lib/auth';
import { withinRequestLimit, rateLimitResponse } from '../../../../lib/request-limit';
export async function POST(request: Request) {
 if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Invalid origin.'},{status:403});
 try {
  const user = await userFromRequest(request); if (!user) return Response.json({error:'Sign in to report.'},{status:401});
  const raw = await readBoundedText(request,4000); if (raw.length > 2000) return Response.json({error:'Report is too long.'},{status:413});
  let value; try { value = JSON.parse(raw); } catch {return Response.json({error:'Invalid report.'},{status:400});}
  if (!value || typeof value.id !== 'string' || value.id.length > 100 || typeof value.reason !== 'string' || value.reason.trim().length < 10 || value.reason.length > 1000) return Response.json({error:'Give a reason of 10–1000 characters.'},{status:400});
  if (!await withinRequestLimit('marketplace.report',user.id,10,3600,true)) return rateLimitResponse(3600);
  const notice = await getDb().prepare("SELECT id FROM marketplace_notices WHERE id = ? AND status = 'approved' AND expires_at > CURRENT_TIMESTAMP").bind(value.id).first();
  if (!notice) return Response.json({error:'Notice is no longer public.'},{status:404});
  await getDb().prepare('INSERT INTO marketplace_reports (id,notice_id,reporter_id,reason) VALUES (?,?,?,?) ON CONFLICT (notice_id,reporter_id) DO NOTHING').bind(crypto.randomUUID(),value.id,user.id,value.reason.trim()).run();
  return Response.json({ok:true},{status:201});
 } catch(error) {return Response.json({error:error instanceof BodyTooLargeError ? error.message : 'Could not send report. Please try again later.'},{status:error instanceof BodyTooLargeError ? 413 : 503});}
}

