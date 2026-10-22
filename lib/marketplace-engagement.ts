import {getDb} from '../db';

export type Engagement = {interested:number;views:number;requests:number;confirmed:number;mineInterested:boolean;mineStatus:string|null;enabled:boolean;isOwner:boolean};
// Public counts contain no attendee identity. One account contributes once per notice.
export async function noticeEngagement(id:string,userId?:string):Promise<Engagement|null> {
 const row=await getDb().prepare(`SELECT n.reservations_enabled AS enabled,n.author_id=? AS is_owner,
 (SELECT COUNT(*)::int FROM marketplace_engagement e WHERE e.notice_id=n.id AND e.interested) AS interested,
 (SELECT COUNT(*)::int FROM marketplace_engagement e WHERE e.notice_id=n.id AND e.viewed) AS views,
 (SELECT COUNT(*)::int FROM marketplace_reservations r WHERE r.notice_id=n.id AND r.status IN ('requested','confirmed')) AS requests,
 (SELECT COUNT(*)::int FROM marketplace_reservations r WHERE r.notice_id=n.id AND r.status='confirmed') AS confirmed,
 COALESCE((SELECT e.interested FROM marketplace_engagement e WHERE e.notice_id=n.id AND e.user_id=?),FALSE) AS mine_interested,
 (SELECT r.status FROM marketplace_reservations r WHERE r.notice_id=n.id AND r.user_id=?) AS mine_status
 FROM marketplace_notices n WHERE n.id=? AND n.status='approved' AND n.expires_at>CURRENT_TIMESTAMP
 AND NOT EXISTS(SELECT 1 FROM marketplace_poster_blocks b WHERE b.user_id=n.author_id)`)
 .bind(userId ?? '',userId ?? '',userId ?? '',id).first<{enabled:boolean;is_owner:boolean;interested:number;views:number;requests:number;confirmed:number;mine_interested:boolean;mine_status:string|null}>();
 return row ? {enabled:row.enabled,isOwner:row.is_owner,interested:row.interested,views:row.views,requests:row.requests,confirmed:row.confirmed,mineInterested:row.mine_interested,mineStatus:row.mine_status} : null;
}
