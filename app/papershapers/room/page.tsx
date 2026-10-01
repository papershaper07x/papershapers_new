import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { SiteHeader, SiteFooter } from "../../components/SiteChrome";

export const metadata: Metadata = {
  title: "Join Live Test Room | Paper Shapers",
  description: "Join an active Paper Shapers live test session with your room code.",
};

async function joinRoomByCodeAction(formData: FormData) {
  "use server";
  const code = (formData.get("roomCode") as string)?.trim();
  if (code) {
    redirect(`/papershapers/room/${encodeURIComponent(code)}`);
  }
}

export default async function JoinRoomLandingPage() {
  const user = await getCurrentUser();

  return (
    <main className="portal-page study-page">
      <SiteHeader portal="study" user={user} />

      <div className="study-route__bar page-shell" style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", borderBottom: "1px solid var(--line)" }}>
        <Link href="/papershapers" style={{ fontWeight: 600 }}>← Back to Paper Shapers</Link>
        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Student Live Portal</span>
      </div>

      <div className="dashboard-page page-shell" style={{ maxWidth: "560px", margin: "3.5rem auto 6rem" }}>
        <div style={{ background: "var(--paper-bright, #ffffff)", border: "1px solid var(--line)", borderRadius: "8px", padding: "2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <p className="dash-overline">STUDENT ROOM ACCESS</p>
          <h1 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", margin: "0.5rem 0 1rem" }}>Join a Live Test Room</h1>
          <p style={{ marginTop: "0.5rem", marginBottom: "2rem", color: "#4b5563", lineHeight: 1.5 }}>
            Enter the unique <strong>Room Code</strong> provided by your teacher to access the live test session and submit your paper.
          </p>

          <form action={joinRoomByCodeAction} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label htmlFor="roomCode" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700 }}>
                Room Code / Join Key
              </label>
              <input
                id="roomCode"
                type="text"
                name="roomCode"
                placeholder="Paste code from teacher (e.g. 55e98c28-...)"
                required
                style={{ width: "100%", padding: "0.85rem", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "1rem" }}
              />
            </div>
            <button
              type="submit"
              className="button button--accent"
              style={{
                marginTop: "0.5rem",
                backgroundColor: "#c9ff47",
                color: "#111827",
                fontWeight: 900,
                border: "2px solid #111827",
                boxShadow: "4px 4px 0 #111827",
              }}
            >
              Enter Room →
            </button>
          </form>

          <div style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid var(--line)", fontSize: "0.82rem", color: "#6b7280" }}>
            Are you a teacher looking to create a room? <Link href="/papershapers/for-teachers/rooms" style={{ fontWeight: 700, textDecoration: "underline" }}>Open Teacher Room Dashboard →</Link>
          </div>
        </div>
      </div>

      <SiteFooter portal="study" />
    </main>
  );
}
