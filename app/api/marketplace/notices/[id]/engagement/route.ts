import {getDb} from '../../../../../../db';
import {userFromRequest} from '../../../../../../lib/auth';
import {noticeEngagement} from '../../../../../../lib/marketplace-engagement';
import {rejectCrossOrigin,readBoundedText,BodyTooLargeError} from '../../../../../../lib/request-safety';
import {withinRequestLimit,rateLimitResponse} from '../../../../../../lib/request-limit';

class ActionError extends Error {constructor(message:string,readonly status:number){super(message);}}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const rejected=rejectCrossOrigin(request);if(rejected)return rejected;
 try {
  const user=await userFromRequest(request);if(!user)return Response.json({error:'Sign in to register interest or reserve.'},{status:401});
  const {id}=await params;if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))return Response.json({error:'Invalid notice.'},{status:400});
  let value;try {value=JSON.parse(await readBoundedText(request,1000));}catch(error){if(error instanceof BodyTooLargeError)throw error;return Response.json({error:'Invalid action.'},{status:400});}
  const actions=['view','interest','uninterest','reserve','cancel','confirm','decline'];
  if(!value || typeof value!=='object' || Array.isArray(value) || !actions.includes(value.action) || Object.keys(value).some(key=>!['action','userId','reservationConsent'].includes(key)) ||
     (value.action==='reserve' ? value.reservationConsent!==true : value.reservationConsent!==undefined) ||
     (['confirm','decline'].includes(value.action) ? typeof value.userId!=='string'||! /^[a-zA-Z0-9-]{1,100}$/.test(value.userId) : value.userId!==undefined))return Response.json({error:'Invalid action.'},{status:400});
  if(!await withinRequestLimit('marketplace.engagement',user.id,120,3600,true))return rateLimitResponse(3600);
  if(value.action==='reserve' && !await withinRequestLimit('marketplace.reserve',user.id,20,86400,true))return rateLimitResponse(86400);
  await getDb().transaction(async tx=>{
   // Lock the parent first: admission, host decisions and withdrawal cannot cross.
   const notice=await tx.prepare('SELECT author_id,status,expires_at,reservations_enabled FROM marketplace_notices WHERE id=? FOR UPDATE').bind(id).first<{author_id:string;status:string;expires_at:string;reservations_enabled:boolean}>();
   if(!notice)throw new ActionError('Notice unavailable.',404);
   const active=notice.status==='approved' && new Date(notice.expires_at).getTime()>Date.now() && !await tx.prepare('SELECT user_id FROM marketplace_poster_blocks WHERE user_id=?').bind(notice.author_id).first();
   const action=value.action;
   // Cancellation remains available after a notice closes.
   if(action==='cancel') {
    await tx.prepare("UPDATE marketplace_reservations SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE notice_id=? AND user_id=? AND status IN ('requested','confirmed')").bind(id,user.id).run();return;
   }
   if(!active)throw new ActionError('This notice is closed. No new actions are available.',410);
   if(['confirm','decline'].includes(action)) {
    if(notice.author_id!==user.id)throw new ActionError('Only this organiser can respond.',403);
    const row=await tx.prepare("UPDATE marketplace_reservations SET status=?,updated_at=CURRENT_TIMESTAMP WHERE notice_id=? AND user_id=? AND status='requested' RETURNING user_id").bind(action==='confirm'?'confirmed':'declined',id,value.userId).first();
    if(!row)throw new ActionError('Request already answered or cancelled. Refresh your desk.',409);return;
   }
   if(notice.author_id===user.id)throw new ActionError('Your own visits and interest are not counted.',403);
   if(await tx.prepare('SELECT user_id FROM marketplace_poster_blocks WHERE user_id=?').bind(user.id).first())throw new ActionError('Marketplace actions are restricted for this account.',403);
   if(action==='reserve') {
    if(!notice.reservations_enabled)throw new ActionError('This organiser has not enabled reservations.',409);
    const previous=await tx.prepare('SELECT status FROM marketplace_reservations WHERE notice_id=? AND user_id=?').bind(id,user.id).first<{status:string}>();
    if(previous) {
     if(previous.status==='requested'||previous.status==='confirmed')return;
     throw new ActionError('This request is closed. Contact the organiser about another arrangement.',409);
    }
    const count=await tx.prepare('SELECT COUNT(*)::int AS n FROM marketplace_reservations WHERE notice_id=?').bind(id).first<{n:number}>();
    if((count?.n ?? 0)>=1000)throw new ActionError('Online request capacity reached. This is not a venue seat count.',409);
    await tx.prepare("INSERT INTO marketplace_reservations(notice_id,user_id,status) VALUES(?,?,'requested')").bind(id,user.id).run();return;
   }
   const existing=await tx.prepare('SELECT user_id FROM marketplace_engagement WHERE notice_id=? AND user_id=?').bind(id,user.id).first();
   if(!existing){
    if(action==='uninterest')return;
    const count=await tx.prepare('SELECT COUNT(*)::int AS n FROM marketplace_engagement WHERE notice_id=?').bind(id).first<{n:number}>();
    if((count?.n ?? 0)>=5000)throw new ActionError('Activity counting capacity reached.',409);
   }
   if(action==='view')await tx.prepare('INSERT INTO marketplace_engagement(notice_id,user_id,viewed) VALUES(?,?,TRUE) ON CONFLICT(notice_id,user_id) DO UPDATE SET viewed=TRUE WHERE NOT marketplace_engagement.viewed').bind(id,user.id).run();
   else await tx.prepare('INSERT INTO marketplace_engagement(notice_id,user_id,interested) VALUES(?,?,?) ON CONFLICT(notice_id,user_id) DO UPDATE SET interested=excluded.interested WHERE marketplace_engagement.interested<>excluded.interested').bind(id,user.id,action==='interest').run();
  });
  return Response.json({ok:true,engagement:await noticeEngagement(id,user.id)},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return Response.json({error:error instanceof ActionError||error instanceof BodyTooLargeError ? error.message:'Could not update activity. Please retry.'},{status:error instanceof ActionError?error.status:error instanceof BodyTooLargeError?413:503,headers:{'Cache-Control':'no-store'}});}
}
