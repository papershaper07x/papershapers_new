export const metadata = { title: 'Report a notice', robots: { index: false, follow: false } };
import { SiteHeader, SiteFooter } from '../../components/SiteChrome';
import { ReportForm } from './report-form';
export default async function ReportPage({searchParams}:{searchParams:Promise<{id?:string}>}) {
 const {id} = await searchParams;
 return <main className="local-page"><SiteHeader portal="marketplace"/><section className="page-shell market-compose"><a href="/noticeboard">← Back to the board</a><h1>Report a notice.</h1><p>Report scams, sexual content, harassment, prohibited goods, or misleading offers. Reports go to the review team; they do not automatically remove a post. Sign in to submit.</p><ReportForm id={id ?? ''}/><p>You can also send the notice ID to <a href="mailto:hello@papershapers.in">hello@papershapers.in</a>.</p></section><SiteFooter portal="marketplace"/></main>;
}
