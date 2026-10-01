import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTeacherRooms, getUserRole } from "../../../../db/service";
import { getCurrentUser } from "../../../../lib/auth";
import { backendFetch } from "../../../../lib/backend";
import { SiteHeader, SiteFooter } from "../../../components/SiteChrome";
import { createRoomAction, verifyTeacherRoleAction } from "./actions";
import type { StudyPaperRecord } from "../../study-types";

export const metadata: Metadata = {
  title: "Teacher Live Rooms",
  description: "Create and moderate live CBSE test sessions for your classroom.",
};

export default async function TeacherRoomsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Ffor-teachers%2Frooms&mode=login");

  const userRole = await getUserRole(user.id);
  const rooms = await getTeacherRooms(user.id);

  let papers: StudyPaperRecord[] = [];
  try {
    const result = await backendFetch<{ items: StudyPaperRecord[] }>(
      `/v1/study/papers?user_id=${encodeURIComponent(user.id)}`
    );
    papers = result.items || [];
  } catch {
    papers = [];
  }

  return (
    <main className="dashboard-page">
      <SiteHeader portal="study" user={user} />

      <div className="study-route__bar page-shell" style={{ borderBottom: "1px solid #d4cbb8", padding: "0.75rem 0" }}>
        <Link href="/papershapers/for-teachers">← Back to For Teachers</Link>
        <span>
          Live Testing ·{" "}
          <span style={{ fontWeight: 700, color: userRole.role === "teacher" ? "#065f46" : "#854d0e" }}>
            {userRole.role === "teacher" ? "Verified Educator" : "Student Account"}
          </span>
        </span>
      </div>

      <section className="study-dash-hero page-shell">
        <div>
          <p className="dash-overline">EDUCATOR WORKBENCH</p>
          <h1>Host a live test room.</h1>
          <p>
            Conduct real-time mock exams with any CBSE syllabus. Share your room code with students, monitor attempts live, and run AI-assisted evaluations on completed responses.
          </p>
        </div>
      </section>

      <section className="study-dash-grid page-shell" style={{ gridTemplateColumns: userRole.role === "teacher" ? "1.2fr 0.8fr" : "1fr", gap: "2rem", paddingBottom: "2rem" }}>
        {userRole.role !== "teacher" ? (
          <article
            className="dash-primary"
            style={{
              background: "#101d38",
              border: "2px solid #efbd55",
              borderRadius: "8px",
              padding: "2.5rem",
              boxShadow: "6px 6px 0 #efbd55",
            }}
          >
            <span className="dash-label" style={{ color: "#efbd55", fontFamily: "monospace", letterSpacing: "0.1em" }}>
              EDUCATOR VERIFICATION
            </span>
            <h2 style={{ color: "#ffffff", fontSize: "2.2rem", margin: "0.75rem 0 0.5rem", fontFamily: "Georgia, serif" }}>
              Teacher verification required.
            </h2>
            <p style={{ color: "rgba(248, 245, 237, 0.9)", fontSize: "1.05rem", lineHeight: "1.6", maxWidth: "680px", margin: "0 0 1.5rem" }}>
              Live Rooms is an educator-only capability designed for teachers and coaching leaders to host and assess classroom mock tests. To prevent student interference, please confirm your educator status.
            </p>
            <form action={verifyTeacherRoleAction} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "520px" }}>
              <div>
                <label htmlFor="instName" style={{ display: "block", marginBottom: "0.35rem", color: "#f8f5ed", fontSize: "0.85rem", fontWeight: 600 }}>
                  School, Coaching, or Institution Name (Optional)
                </label>
                <input
                  id="instName"
                  type="text"
                  name="institution"
                  placeholder="e.g. Kendriya Vidyalaya / Private Coaching"
                  style={{ width: "100%", padding: "0.8rem", borderRadius: "4px", border: "1px solid #ccc", background: "#ffffff", color: "#101d38", fontSize: "1rem" }}
                />
              </div>
              <button
                type="submit"
                className="button button--accent"
                style={{
                  alignSelf: "flex-start",
                  marginTop: "0.5rem",
                  backgroundColor: "#16a34a",
                  color: "#ffffff",
                  fontWeight: 800,
                  border: "2px solid #064e3b",
                  boxShadow: "4px 4px 0 #064e3b",
                }}
              >
                I am a Teacher / Educator — Unlock Live Rooms →
              </button>
            </form>
          </article>
        ) : (
          <>
            {/* Create Room via Curriculum Catalog */}
            <article
              className="dash-primary"
              style={{
                background: "#101d38",
                border: "2px solid #d9b85f",
                borderRadius: "8px",
                padding: "2rem",
                color: "#f8f5ed",
              }}
            >
              <span className="dash-label" style={{ color: "#efbd55", fontFamily: "monospace" }}>
                OPTION 1 · INSTANT SYLLABUS ROOM
              </span>
              <h2 style={{ color: "#ffffff", fontSize: "1.8rem", margin: "0.5rem 0 1rem", fontFamily: "Georgia, serif" }}>
                Launch by Class &amp; Subject
              </h2>
              <p style={{ color: "rgba(248, 245, 237, 0.85)", fontSize: "0.95rem", marginBottom: "1.25rem", lineHeight: "1.5" }}>
                Select from all CBSE Classes 9–12 subjects to launch a live room immediately:
              </p>

              <form action={createRoomAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label htmlFor="classSelect" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 600, color: "#f8f5ed" }}>
                      Class:
                    </label>
                    <select
                      id="classSelect"
                      name="grade"
                      defaultValue="10"
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", background: "#ffffff", color: "#101d38", border: "1px solid #ccc", fontSize: "0.95rem" }}
                    >
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="formatSelect" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 600, color: "#f8f5ed" }}>
                      Paper Format:
                    </label>
                    <select
                      id="formatSelect"
                      name="paperSize"
                      defaultValue="half"
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", background: "#ffffff", color: "#101d38", border: "1px solid #ccc", fontSize: "0.95rem" }}
                    >
                      <option value="half">Half · 40 Marks (90 min)</option>
                      <option value="full">Full · 80 Marks (180 min)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subjectSelect" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 600, color: "#f8f5ed" }}>
                    Subject:
                  </label>
                  <select
                    id="subjectSelect"
                    name="subject"
                    defaultValue="Science"
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", background: "#ffffff", color: "#101d38", border: "1px solid #ccc", fontSize: "0.95rem" }}
                  >
                    <option value="Science">Science (Physics, Chemistry, Biology)</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Social Science">Social Science (History, Civics, Geography)</option>
                    <option value="English">English</option>
                    <option value="Physics">Physics (Classes 11–12)</option>
                    <option value="Chemistry">Chemistry (Classes 11–12)</option>
                    <option value="Biology">Biology (Classes 11–12)</option>
                    <option value="Economics">Economics (Classes 11–12)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="button button--accent"
                  style={{
                    marginTop: "0.5rem",
                    alignSelf: "flex-start",
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    fontWeight: 800,
                    border: "2px solid #064e3b",
                    boxShadow: "4px 4px 0 #064e3b",
                  }}
                >
                  ⚡ Launch Live Room for This Syllabus →
                </button>
              </form>
            </article>

            {/* Create Room via Library or Custom ID */}
            <article
              style={{
                background: "#ffffff",
                border: "2px solid #101d38",
                borderRadius: "8px",
                padding: "2rem",
                color: "#101d38",
              }}
            >
              <span className="dash-label" style={{ color: "#9a6610", fontFamily: "monospace" }}>
                OPTION 2 · SAVED PAPERS &amp; CUSTOM
              </span>
              <h2 style={{ fontSize: "1.8rem", margin: "0.5rem 0 1rem", fontFamily: "Georgia, serif", color: "#101d38" }}>
                Pick from Your Papers
              </h2>

              <form action={createRoomAction} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {papers.length > 0 ? (
                  <div>
                    <label htmlFor="paperSelect" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 600 }}>
                      Select previously generated paper:
                    </label>
                    <select
                      id="paperSelect"
                      name="paperId"
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                    >
                      <option value="">-- Choose from your library --</option>
                      {papers.map((p) => (
                        <option key={p.id} value={p.id}>
                          Class {p.grade} {p.subject} ({p.paper.total_marks} marks) — {p.paper.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p style={{ fontSize: "0.9rem", color: "#65635c", margin: 0 }}>
                    No custom papers generated yet. You can create one from <Link href="/papershapers/tests/new" style={{ textDecoration: "underline" }}>Test Planner</Link> or use Option 1 above.
                  </p>
                )}

                <div>
                  <label htmlFor="customId" style={{ display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", fontWeight: 600 }}>
                    Or enter any custom Paper ID:
                  </label>
                  <input
                    id="customId"
                    type="text"
                    name="paperId"
                    placeholder="e.g. 7daa6ba7-979d-442b..."
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.9rem" }}
                  />
                </div>

                <button
                  type="submit"
                  className="button button--dark"
                  style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
                >
                  Create Room from Paper ID →
                </button>
              </form>
            </article>
          </>
        )}
      </section>

      {/* Recent Sessions Table */}
      <section className="history-section page-shell" style={{ marginTop: "1rem" }}>
        <div className="dashboard-heading">
          <div>
            <p className="dash-label">SESSION HISTORY</p>
            <h2>Your Live Test Rooms</h2>
          </div>
        </div>

        <div className="history-table">
          <div className="history-row history-head">
            <span>Room Code</span>
            <span>Paper ID</span>
            <span>Status</span>
            <span>Created</span>
            <span>Action</span>
          </div>
          {rooms.map((room) => (
            <div className="history-row" key={room.id} style={{ alignItems: "center" }}>
              <strong style={{ fontFamily: "monospace", fontSize: "0.95rem" }}>{room.id}</strong>
              <span style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>{room.paper_id.slice(0, 18)}...</span>
              <span>
                <span
                  style={{
                    display: "inline-block",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    background:
                      room.status === "active"
                        ? "rgba(16, 185, 129, 0.15)"
                        : room.status === "completed"
                        ? "rgba(107, 114, 128, 0.15)"
                        : "rgba(234, 179, 8, 0.15)",
                    color:
                      room.status === "active"
                        ? "#065f46"
                        : room.status === "completed"
                        ? "#374151"
                        : "#854d0e",
                  }}
                >
                  {room.status.toUpperCase()}
                </span>
              </span>
              <span>{new Date(room.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              <span>
                <Link href={`/papershapers/for-teachers/rooms/${room.id}`} className="button button--dark">
                  Open Room Monitor →
                </Link>
              </span>
            </div>
          ))}
          {rooms.length === 0 && (
            <p style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
              No test rooms created yet. Use the options above to host your first live session.
            </p>
          )}
        </div>
      </section>

      <SiteFooter portal="study" />
    </main>
  );
}
