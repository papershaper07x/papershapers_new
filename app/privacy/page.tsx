import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";

export const metadata: Metadata = { title: "Privacy", description: "How Paper Shapers handles account, study, and contact information." };

export default function PrivacyPage() {
  return <main className="study-information"><SiteHeader /><article className="legal-page page-shell"><p className="kicker">Privacy</p><h1>Keep the useful data.<br /><em>Leave the rest alone.</em></h1><p>Last updated: 29 September 2026</p><h2>What we collect</h2><p>Paper Shapers stores the account details needed to provide your study desk, the papers and attempts you create, and messages you voluntarily send through our contact form.</p><h2>Why we use it</h2><p>We use this information to provide the service, keep your study history available to you, respond to enquiries, maintain safety, and improve the product. We do not sell personal student information.</p><h2>Study content</h2><p>Your generated papers and attempts belong to your private study workflow. They are not displayed publicly. Do not include sensitive personal information in answers or contact messages.</p><h2>Advertising</h2><p>Paper Shapers does not currently show third-party advertising. If contextual advertising is introduced, this page will explain the provider and the choices available before it is switched on. Student answers will not be used to target ads.</p><h2>Contact</h2><p>For privacy questions, email <a href="mailto:hello@papershapers.in">hello@papershapers.in</a>.</p></article><SiteFooter /></main>;
}
