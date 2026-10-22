import type {Metadata} from 'next';
import {SiteFooter,SiteHeader} from '../components/SiteChrome';
import {LocalBoard,type Notice} from './local-board';
import {getCurrentUser} from '../../lib/auth';
import {marketplaceUrl} from '../../lib/marketplace-seo';
import {getDb} from '../../db';
export const metadata:Metadata={title:'Local events, offers and community notices',description:'Find local events, classes, services and offers by area. Browse freely or sign in to share a notice after safety review.',alternates:{canonical:marketplaceUrl('/noticeboard')}};
export default async function NoticeboardPage(){
 const user=await getCurrentUser();
 let posts:Notice[]=[];let catalogueAvailable=true;
 try {
  const {results}=await getDb().prepare("SELECT n.id,title,description,place,area,category,expires_at,n.state,n.city,n.categories,n.reservations_enabled,(SELECT COUNT(*)::int FROM marketplace_engagement e WHERE e.notice_id=n.id AND e.interested) AS interested_count,(SELECT COUNT(*)::int FROM marketplace_engagement e WHERE e.notice_id=n.id AND e.viewed) AS view_count,(SELECT COUNT(*)::int FROM marketplace_reservations r WHERE r.notice_id=n.id AND r.status IN ('requested','confirmed')) AS request_count,EXISTS(SELECT 1 FROM marketplace_media m WHERE m.notice_id=n.id) AS has_image,NULL AS distance_km FROM marketplace_notices n WHERE status='approved' AND expires_at > CURRENT_TIMESTAMP AND NOT EXISTS(SELECT 1 FROM marketplace_poster_blocks b WHERE b.user_id=n.author_id) ORDER BY created_at DESC,id LIMIT 12").all<Notice>();
  posts=results.map(row=>({...row,expires_at:new Date(row.expires_at).toISOString()}));
 }catch{catalogueAvailable=false;/* Public guide/navigation stays usable while the catalogue is unavailable. */}
 return <main className="portal-page local-page"><SiteHeader portal="marketplace" user={user}/><LocalBoard authenticated={Boolean(user)} initialPosts={posts} initialDemo={catalogueAvailable&&posts.length===0}/><SiteFooter portal="marketplace"/></main>;
}
