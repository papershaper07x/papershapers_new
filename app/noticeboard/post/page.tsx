export const metadata = { title: 'Post a local notice', robots: { index: false, follow: false } };
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../../lib/auth';
import { SiteHeader, SiteFooter } from '../../components/SiteChrome';
import { NoticeForm } from './notice-form';
export default async function PostPage() {
 const user = await getCurrentUser();
 if (!user) redirect('/auth?next=%2Fnoticeboard%2Fpost&mode=login');
 return <main className="portal-page local-page"><SiteHeader portal="marketplace" user={user}/><section className="page-shell market-compose"><a href="/noticeboard">← Back to the board</a><h1>Post a local notice.</h1><p>Your notice stays private until it passes safety review. AI can publish clearly safe submissions; uncertain results need further review. Promotional images are checked too. Automated publication requires a Google-verified email identity; password-only accounts need further review. No illegal goods, sexual content, hate, scams, or private personal information.</p><NoticeForm/><a href="/noticeboard/dashboard">My local desk →</a></section><SiteFooter portal="marketplace"/></main>;
}
