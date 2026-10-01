import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { getTestRoom, getTestAttendees } from "../../../../db/service";
import { joinRoomAction } from "./actions";
import { backendFetch } from "../../../../lib/backend";
import { getCurrentUser } from "../../../../lib/auth";
import { SiteHeader, SiteFooter } from "../../../components/SiteChrome";
import { LiveRoomAttempt } from "./live-room-attempt";
import { WaitingRoom } from "./waiting-room";
import type { StudyPaper, StudyPaperRecord } from "../../study-types";

export const metadata: Metadata = {
  title: "Live Room Attempt | Paper Shapers",
  description: "Join and attempt a live paper session.",
};

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const user = await getCurrentUser();
  const { roomId } = await params;
  const room = await getTestRoom(roomId);

  if (!room) {
    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={user} />
        <div className="dashboard-page page-shell" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
          <h1>Room Not Found</h1>
          <p style={{ marginTop: "1rem" }}>The test room with ID &quot;{roomId}&quot; does not exist or has expired.</p>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/papershapers" className="button button--dark">← Back to Paper Shapers</Link>
          </div>
        </div>
        <SiteFooter portal="study" />
      </main>
    );
  }

  const cookieStore = await cookies();
  const attendeeId = cookieStore.get(`attendeeId_${roomId}`)?.value;

  let attendee = null;
  if (attendeeId) {
    const attendees = await getTestAttendees(roomId);
    attendee = attendees.find((a) => a.id === attendeeId);
  }

  if (!attendee) {
    if (room.status === "completed") {
      return (
        <main className="portal-page study-page">
          <SiteHeader portal="study" user={user} />
          <div className="dashboard-page page-shell" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
            <p className="dash-overline">ROOM CONCLUDED</p>
            <h1>Test Session Ended</h1>
            <p style={{ marginTop: "1rem" }}>This test session has already been completed by the teacher. New student entries are closed.</p>
            <div style={{ marginTop: "2rem" }}>
              <Link href="/papershapers" className="button button--dark">← Back to Paper Shapers</Link>
            </div>
          </div>
          <SiteFooter portal="study" />
        </main>
      );
    }

    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={user} />
        <div className="study-route__bar page-shell" style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", borderBottom: "1px solid var(--line)" }}>
          <Link href="/papershapers" style={{ fontWeight: 600 }}>← Back to Paper Shapers</Link>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Room Code: <strong>{roomId}</strong></span>
        </div>

        <div className="dashboard-page page-shell" style={{ maxWidth: "560px", margin: "3.5rem auto 6rem" }}>
          <div style={{ background: "var(--paper-bright, #ffffff)", border: "1px solid var(--line)", borderRadius: "8px", padding: "2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <p className="dash-overline">STUDENT ENROLLMENT</p>
            <h1 style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", margin: "0.5rem 0 1rem" }}>Enter Room Session</h1>
            <p style={{ marginBottom: "2rem", color: "#4b5563", lineHeight: 1.5 }}>
              Enter your full name and assigned roll number to access the questions.
            </p>
            <form
              action={async (formData) => {
                "use server";
                await joinRoomAction(roomId, formData);
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
            >
              <div>
                <label htmlFor="student-name" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700 }}>
                  Your Full Name
                </label>
                <input
                  id="student-name"
                  type="text"
                  name="name"
                  placeholder="e.g. Priya Sharma"
                  required
                  style={{ width: "100%", padding: "0.85rem", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "1rem" }}
                />
              </div>
              <div>
                <label htmlFor="student-roll" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 700 }}>
                  Roll Number / Student ID
                </label>
                <input
                  id="student-roll"
                  type="text"
                  name="rollNumber"
                  placeholder="e.g. 1014"
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
                Join Test Room →
              </button>
            </form>
          </div>
        </div>
        <SiteFooter portal="study" />
      </main>
    );
  }

  if (room.status === "waiting") {
    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={user} />
        <WaitingRoom studentName={attendee.name} roomId={roomId} />
        <SiteFooter portal="study" />
      </main>
    );
  }

  if (attendee.status === "completed") {
    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={user} />
        <div className="dashboard-page page-shell" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
          <p className="dash-overline">SUBMISSION RECORDED</p>
          <h1 style={{ margin: "0.5rem 0" }}>Test Submitted Successfully</h1>
          <p style={{ marginTop: "1rem", lineHeight: "1.6" }}>
            Thank you, <strong>{attendee.name}</strong> (Roll No: {attendee.roll_number}). Your answers have been recorded and delivered to your educator.
          </p>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/papershapers" className="button button--dark">← Back to Paper Shapers</Link>
          </div>
        </div>
        <SiteFooter portal="study" />
      </main>
    );
  }

  let paper: StudyPaper | null = null;
  try {
    const response = (await backendFetch(
      `/v1/study/papers/${encodeURIComponent(room.paper_id)}?user_id=${encodeURIComponent(room.teacher_id)}`
    )) as { paper: (StudyPaperRecord & { paper?: StudyPaper }) | StudyPaper };

    const raw = response.paper;
    if (raw && "paper" in raw && raw.paper && Array.isArray(raw.paper.questions)) {
      paper = raw.paper;
    } else if (raw && "questions" in raw && Array.isArray((raw as StudyPaper).questions)) {
      paper = raw as StudyPaper;
    }
  } catch {
    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={user} />
        <div className="page-shell" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
          <h1>Test Paper Unavailable</h1>
          <p style={{ marginTop: "1rem" }}>The assigned paper could not be loaded from the server.</p>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/papershapers" className="button button--dark">← Back to Paper Shapers</Link>
          </div>
        </div>
        <SiteFooter portal="study" />
      </main>
    );
  }

  if (!paper || !paper.questions) {
    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={user} />
        <div className="page-shell" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
          <h1>Paper Incomplete</h1>
          <p style={{ marginTop: "1rem" }}>The paper questions could not be loaded for this test room.</p>
          <div style={{ marginTop: "2rem" }}>
            <Link href="/papershapers" className="button button--dark">← Back to Paper Shapers</Link>
          </div>
        </div>
        <SiteFooter portal="study" />
      </main>
    );
  }

  return (
    <main className="portal-page study-page">
      <SiteHeader portal="study" user={user} />
      <LiveRoomAttempt roomId={roomId} attendeeId={attendee.id} paper={paper} />
      <SiteFooter portal="study" />
    </main>
  );
}
