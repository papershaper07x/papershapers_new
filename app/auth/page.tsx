import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPanel } from "../components/AuthPanel";
import { getCurrentUser } from "../../lib/auth";
import { safeAuthDestination } from "../../lib/auth-redirects";
import { googleOAuthIsConfigured } from "../../lib/google-oauth";

export const metadata: Metadata = { title: "Sign in", description: "Create or open your Paper Shapers workspace." };

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const params = await searchParams;
  const next = safeAuthDestination(params.next);
  if (await getCurrentUser()) redirect(next);
  return <main className="auth-page">
    <div className="auth-brand"><Link href="/"><span className="brand-mark">P/S</span> Paper Shapers</Link><span>One account · Three workspaces</span></div>
    <section className="auth-layout">
      <div className="auth-story"><p className="kicker">Your useful internet</p><h1>Keep the things<br />worth coming<br /><em>back to.</em></h1><p>Generate study briefs, follow the stories that matter, and tune your neighbourhood board—without three separate accounts.</p><div className="auth-benefits"><span>01 · Study history</span><span>02 · Saved briefings</span><span>03 · Local interests</span></div></div>
      <AuthPanel next={next} initialMode={params.mode === "login" ? "login" : "signup"} googleEnabled={googleOAuthIsConfigured()} />
    </section>
  </main>;
}
