import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {SiteHeader,SiteFooter} from '../../../components/SiteChrome';
import {publishedNotice} from '../data';
import {marketplaceUrl} from '../../../../lib/marketplace-seo';
import {getCurrentUser} from '../../../../lib/auth';
import {noticeEngagement} from '../../../../lib/marketplace-engagement';
import {displayNoticeArea} from '../../../../lib/marketplace';
import {NoticeActivity} from '../notice-activity';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{const {id}=await params;const notice=await publishedNotice(id);if(!notice)return {title:'Notice unavailable',robots:{index:false,follow:false}};return {title:notice.title,description:notice.description.slice(0,160),alternates:{canonical:marketplaceUrl(`/noticeboard/notices/${id}`)}};}
export default async function NoticePage({params}:{params:Promise<{id:string}>}){const {id}=await params;const notice=await publishedNotice(id);if(!notice)notFound();const user=await getCurrentUser();const activity=await noticeEngagement(id,user?.id);return <main className="local-page"><SiteHeader portal="marketplace" user={user}/><article className="page-shell market-editorial market-reading"><Link href="/noticeboard#board">← Back to the board</Link><p className="kicker">{(notice.categories.length?notice.categories:[notice.category]).join(" · ")} · {displayNoticeArea(notice.area,notice.city,notice.state)}</p><h1>{notice.title}</h1><p>{notice.place}</p>{notice.has_image&&<img className="market-detail-image" src={`/api/marketplace/media/${notice.id}`} alt={`Promotional image for ${notice.title}`} width={1200} height={800}/>}<p className="market-description">{notice.description}</p><p>Expires {new Date(notice.expires_at).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</p>{activity&&<NoticeActivity id={id} authenticated={Boolean(user)} initial={activity}/>}<aside className="dummy-notice">Safety screening is not verification of an organiser or a guarantee of this offer. Paper Shapers does not handle marketplace payments.</aside><Link href={`/noticeboard/report?id=${notice.id}`}>Report this notice →</Link><p><Link href="/noticeboard/safety">Posting and safety policy</Link></p></article><SiteFooter portal="marketplace"/></main>;}
