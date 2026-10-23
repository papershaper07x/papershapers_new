import { pageMetadata } from "../../../lib/seo";
import type {Metadata} from 'next';
import Link from 'next/link';
import {SiteHeader,SiteFooter} from '../../components/SiteChrome';
import {localGuides} from '../guides-content';
export const metadata: Metadata = pageMetadata('/noticeboard/guides', 'Neighbourhood guides', 'Practical guides to posting local notices and browsing offers safely, with clearly labelled examples.');
export default function GuidesPage(){return <main className="local-page"><SiteHeader portal="marketplace"/><section className="page-shell market-editorial"><Link href="/noticeboard">← Back to the board</Link><p className="kicker">The neighbourhood notebook</p><h1>A little local knowledge.</h1><p className="hero-lede">Practical notes for people making plans, sharing ideas, and keeping a local board useful.</p><div className="guide-list">{localGuides.map((guide,index)=><article key={guide.slug}><span>{String(index+1).padStart(2,'0')} · {guide.dummy?'Dummy article':'Practical guide'}</span><h2><Link href={`/noticeboard/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.summary}</p><Link href={`/noticeboard/guides/${guide.slug}`}>Read the guide →</Link></article>)}</div></section><SiteFooter portal="marketplace"/></main>;}
