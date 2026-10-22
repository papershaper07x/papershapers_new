import { getDb } from '../../../../db';
import { userFromRequest } from '../../../../lib/auth';
import {validateRegion} from '../../../../lib/india-regions';
import {noticeCategories} from '../../../../lib/marketplace';
import { validateNotice } from '../../../../lib/marketplace';
import { withinRequestLimit, rateLimitResponse } from '../../../../lib/request-limit';
import { readBoundedText, BodyTooLargeError, rejectCrossOrigin } from '../../../../lib/request-safety';
import { compressNoticeImage, ImageProcessingBusyError } from '../../../../lib/marketplace-image';
import { coordinates, coarseLocation } from '../../../../lib/marketplace-location';
import { reviewSubmission, MARKETPLACE_POLICY, type ReviewVerdict } from '../../../../lib/marketplace-review';

export const maxDuration = 60;
class ImageStorageFullError extends Error {}
export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request);
  if (rejected) return rejected;
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ error:'Use the notice form.' },{status:415});
  try {
    const user = await userFromRequest(request);
    if (!user) return Response.json({error:'Sign in to post.'},{status:401});
    const blocked = await getDb().prepare('SELECT user_id FROM marketplace_poster_blocks WHERE user_id=?').bind(user.id).first();
    if (blocked) return Response.json({error:'Posting is restricted for this account. Contact support for review.'},{status:403});
    let raw = await readBoundedText(request,1_450_000);
    let notice: Record<string,string>;
    let image: Awaited<ReturnType<typeof compressNoticeImage>> | undefined;
    let location: ReturnType<typeof coarseLocation> | undefined;
    let imageInput: unknown;
    let reservationsEnabled = false;
    let region:{state:string|null;city:string|null}={state:null,city:null};
    try {
      const value = JSON.parse(raw);
      raw = ''; // Do not retain the large request string while waiting for review.
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Enter a notice.');
      const {imageBase64,latitude,longitude,policyAccepted,reservationsEnabled:enableReservations,state,city,...text} = value;
      if (policyAccepted !== true) throw new Error('Confirm that you are 18 or older, have permission, and accept the posting policy.');
      if (enableReservations !== undefined && typeof enableReservations !== 'boolean') throw new Error('Invalid reservation setting.');
      reservationsEnabled = enableReservations === true;
      region=validateRegion(state,city);
      notice = validateNotice(text);
      if (latitude !== undefined || longitude !== undefined) location = coarseLocation(coordinates(latitude,longitude));
      imageInput = imageBase64;
    } catch(error) {return Response.json({error:error instanceof Error ? error.message : 'Invalid notice.'},{status:400});}
    if (!await withinRequestLimit('marketplace.post',user.id,5,86400,true)) return rateLimitResponse(86400);
    if (imageInput !== undefined) {
      try { image = await compressNoticeImage(imageInput); }
      catch (error) { return Response.json({error:error instanceof Error ? error.message : 'Invalid image.'},{status:error instanceof ImageProcessingBusyError ? 429 : 400,headers:error instanceof ImageProcessingBusyError ? {'Retry-After':'2'} : {}}); }
      imageInput = undefined;
    }
    const id = crypto.randomUUID();
    const db = getDb();
    await db.transaction(async tx => {
      await tx.prepare(`INSERT INTO marketplace_notices (id,author_id,title,description,place,area,category,expires_at,h3_cell,location_lat,location_lng,policy_version,reservations_enabled,state,city,categories) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,ARRAY[?]::TEXT[])`)
        .bind(id,user.id,notice.title,notice.description,notice.place,notice.area,notice.category,notice.expiresAt,location?.cell ?? null,location?.latitude ?? null,location?.longitude ?? null,MARKETPLACE_POLICY,reservationsEnabled,region.state,region.city,notice.category).run();
      if (image) {
        await tx.prepare('SELECT pg_advisory_xact_lock(742091)').first();
        const stored = await tx.prepare('SELECT COALESCE(SUM(octet_length(image_bytes)),0) AS bytes, COUNT(*) AS images FROM marketplace_media').first<{bytes:string;images:string}>();
        const configured = Number(process.env.MARKETPLACE_IMAGE_STORAGE_BYTES ?? 50000000);
        const cap = Number.isSafeInteger(configured) && configured > 0 ? configured : 50000000;
        if (Number(stored?.bytes ?? 0) + image.bytes.length > cap || Number(stored?.images ?? 0) >= 1000) throw new ImageStorageFullError();
        await tx.prepare('INSERT INTO marketplace_media (notice_id,image_bytes,mime,width,height) VALUES (?,?,?,?,?)').bind(id,image.bytes,image.mime,image.width,image.height).run();
      }
    });
    let verdict: ReviewVerdict | undefined;
    const verifiedIdentity = await db.prepare("SELECT id FROM auth_identities WHERE user_id=? AND provider='google' LIMIT 1").bind(user.id).first();
    try { if (verifiedIdentity) verdict = await reviewSubmission(notice,image?.bytes); } catch { /* Fail closed; the stored submission remains pending. */ }
    const decision = verdict?.decision === 'approve' ? 'approved' : verdict?.decision === 'reject' ? 'rejected' : 'pending';
    await db.transaction(async tx => {
      const row = await tx.prepare("UPDATE marketplace_notices SET status=?,categories=?::TEXT[] WHERE id=? AND author_id=? AND status='pending' AND expires_at > CURRENT_TIMESTAMP AND NOT EXISTS(SELECT 1 FROM marketplace_poster_blocks b WHERE b.user_id=marketplace_notices.author_id) RETURNING id").bind(decision,[...new Set([notice.category,...(verdict?.categories ?? [])])].filter(category=>noticeCategories.includes(category as typeof noticeCategories[number])).slice(0,3),id,user.id).first();
      if (!row) return; // Withdrawal or expiry during review must never be reversed.
      await tx.prepare('INSERT INTO marketplace_reviews (id,notice_id,reviewer,decision,reason,provider,policy_version,confidence) VALUES (?,?,?,?,?,?,?,?)')
        .bind(crypto.randomUUID(),id,'automated-review',decision,verdict ? JSON.stringify(verdict.flags) : verifiedIdentity ? 'Review unavailable; operator review required' : 'Verified email identity required; operator review pending',verdict?.provider ?? 'unavailable',MARKETPLACE_POLICY,verdict?.confidence ?? null).run();
    });
    const current = await db.prepare('SELECT status FROM marketplace_notices WHERE id=? AND author_id=?').bind(id,user.id).first<{status:string}>();
    return Response.json({id,status:current?.status ?? 'pending',hasImage:Boolean(image)},{status:201,headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return Response.json({error:error instanceof BodyTooLargeError ? error.message : error instanceof ImageStorageFullError ? 'Image capacity is reached. Please try without an image.' : 'We could not complete the submission. Check your local desk before retrying.'},{status:error instanceof BodyTooLargeError ? 413 : error instanceof ImageStorageFullError ? 507 : 503});
  }
}

