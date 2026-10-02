import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTestRoom, getTestAttendees } from "../../../../../db/service";
import { getCurrentUser } from "../../../../../lib/auth";
import { backendFetch } from "../../../../../lib/backend";
import { SiteHeader, SiteFooter } from "../../../../components/SiteChrome";
import { startRoomAction, closeRoomAction, evaluateAttendeeAction } from "../actions";
import { RoomLiveMonitor } from "./room-live-monitor";
import type { StudyPaper, StudyPaperRecord } from "../../../study-types";

export const metadata: Metadata = {
  title: "Live Room Dashboard & Assessment | Paper Shapers",
  description: "Educator live session dashboard, student response review, and on-demand AI assessment.",
};

interface AiBreakdownItem {
  question_id: string;
  earned_marks: number;
  available_marks: number;
  question_text?: string;
  student_answer: string;
  feedback: string;
  answer_outline?: string;
}

interface AiEvaluationData {
  earned_marks: number;
  total_marks: number;
  percentage: number;
  summary: string;
  breakdown: AiBreakdownItem[];
}

export default async function TeacherRoomViewPage({ params }: { params: Promise<{ roomId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Ffor-teachers%2Frooms&mode=login");

  const { roomId } = await params;
  const room = await getTestRoom(roomId);

  if (!room) {
    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={user} />
        <div className="dashboard-page page-shell" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
          <h1>Room Not Found</h1>
          <p style={{ marginTop: "1rem" }}>This test room could not be located or may have expired.</p>
          <Link href="/papershapers/for-teachers/rooms" className="button button--dark" style={{ marginTop: "1.5rem", display: "inline-block" }}>
            ← Back to Rooms
          </Link>
        </div>
        <SiteFooter portal="study" />
      </main>
    );
  }

  if (room.teacher_id !== user.id) {
    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={user} />
        <div className="dashboard-page page-shell" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
          <h1>Access Denied</h1>
          <p style={{ marginTop: "1rem" }}>You are not the designated educator host of this room.</p>
          <Link href="/papershapers/for-teachers/rooms" className="button button--dark" style={{ marginTop: "1.5rem", display: "inline-block" }}>
            ← Back to Your Rooms
          </Link>
        </div>
        <SiteFooter portal="study" />
      </main>
    );
  }

  let paperTitle = `Paper ${room.paper_id.slice(0, 8)}...`;
  let paperMeta = "";
  try {
    const paperResp = await backendFetch<{ paper: (StudyPaperRecord & { paper?: StudyPaper }) | StudyPaper }>(
      `/v1/study/papers/${encodeURIComponent(room.paper_id)}?user_id=${encodeURIComponent(user.id)}`
    );
    const raw = paperResp.paper;
    const paper = (raw && "paper" in raw && raw.paper?.questions ? raw.paper : raw) as StudyPaper;
    if (paper) {
      paperTitle = `${paper.subject || "Subject"} · Class ${paper.grade || "9"}`;
      paperMeta = `${paper.total_marks || 40} Marks · ${paper.time_minutes || 90} Minutes · ${paper.questions?.length || 0} Questions`;
    }
  } catch {
    paperMeta = `Custom ID: ${room.paper_id}`;
  }

  const attendees = await getTestAttendees(roomId);
  const completedCount = attendees.filter((a) => a.status === "completed").length;
  const waitingCount = attendees.filter((a) => a.status !== "completed").length;
  const evaluatedCount = attendees.filter((a) => Boolean(a.ai_evaluation)).length;

  return (
    <main className="portal-page study-page">
      <SiteHeader portal="study" user={user} />

      <div className="study-route__bar page-shell" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 0", borderBottom: "1px solid var(--line)" }}>
        <Link href="/papershapers/for-teachers/rooms" style={{ fontWeight: 600 }}>← Back to Live Rooms</Link>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.85rem", color: "var(--ink)" }}>
          <span>Room Code: <strong style={{ letterSpacing: "1px" }}>{roomId}</strong></span>
          <span>Host: <strong>{user.name || user.email}</strong></span>
        </div>
      </div>

      <section className="study-dash-hero page-shell" style={{ marginTop: "2rem" }}>
        <div>
          <p className="dash-overline">
            SESSION STATUS:{" "}
            <span
              style={{
                fontWeight: 700,
                color: room.status === "active" ? "#10b981" : room.status === "completed" ? "#6b7280" : "#d97706",
              }}
            >
              {room.status.toUpperCase()}
            </span>
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1, margin: "0.5rem 0" }}>Live Test Room</h1>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)" }}>{paperTitle}</p>
          {paperMeta && <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.25rem" }}>{paperMeta}</p>}

          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem 1.25rem",
              background: "#101d38",
              color: "#ffffff",
              borderRadius: "6px",
              border: "1px solid #d9b85f",
              display: "inline-block",
            }}
          >
            <div style={{ fontSize: "0.75rem", letterSpacing: "1px", textTransform: "uppercase", color: "#d9b85f", fontWeight: 700 }}>
              Student Join Code
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, letterSpacing: "2px", margin: "0.25rem 0", color: "#ffffff" }}>
              {roomId}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
              Share this code with students at: <code>/papershapers/room</code>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <RoomLiveMonitor roomId={roomId} />
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            {room.status === "waiting" && (
              <form
                action={async () => {
                  "use server";
                  await startRoomAction(roomId);
                }}
              >
                <button
                  type="submit"
                  className="button button--accent"
                  style={{
                    backgroundColor: "#c9ff47",
                    color: "#111827",
                    fontWeight: 900,
                    border: "2px solid #111827",
                    boxShadow: "4px 4px 0 #111827",
                  }}
                >
                  ▶ Start Test for All Students
                </button>
              </form>
            )}

            {room.status === "active" && (
              <form
                action={async () => {
                  "use server";
                  await closeRoomAction(roomId);
                }}
              >
                <button type="submit" className="button button--dark">
                  ⏹ Conclude Test Session
                </button>
              </form>
            )}

            {room.status === "completed" && (
              <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#4b5563" }}>
                ✓ Session concluded. Responses preserved for review.
              </span>
            )}
          </div>
        </div>

        <div className="study-score" style={{ alignSelf: "flex-start" }}>
          <span>ENROLLED</span>
          <strong>{attendees.length}</strong>
          <small>{completedCount} completed · {waitingCount} in progress · {evaluatedCount} AI evaluated</small>
        </div>
      </section>

      {/* Formative Evaluation Disclaimer */}
      <section className="page-shell" style={{ marginTop: "2rem" }}>
        <div
          style={{
            padding: "0.9rem 1.2rem",
            background: "rgba(217, 184, 95, 0.12)",
            border: "1px solid #d9b85f",
            borderRadius: "6px",
            fontSize: "0.85rem",
            lineHeight: 1.5,
            color: "#4a3c10",
          }}
        >
          <strong>⚠️ Formative Assessment Notice:</strong> AI evaluations are practice estimates designed to aid educators in formative reviews and pinpoint student learning gaps. They do not constitute official CBSE examination scores or replace professional teacher judgment.
        </div>
      </section>

      {/* Student Review & AI Evaluation Deck */}
      <section className="page-shell" style={{ margin: "2.5rem auto 5rem" }}>
        <div className="dashboard-heading" style={{ marginBottom: "1.5rem" }}>
          <div>
            <p className="dash-label">STUDENT RESPONSES &amp; ASSESSMENT</p>
            <h2>Enrolled Students &amp; Performance Review</h2>
            <p style={{ color: "#666", fontSize: "0.9rem", marginTop: "0.3rem" }}>
              Inspect candidate submissions, view answer sheets, and trigger on-demand AI rubric evaluations with question-level insights.
            </p>
          </div>
        </div>

        <div className="attendee-deck" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {attendees.map((student) => {
            let parsedOptions: Record<string, string> = {};
            try {
              if (student.options_filled) {
                parsedOptions = JSON.parse(student.options_filled) as Record<string, string>;
              }
            } catch {}

            const responseEntries = Object.entries(parsedOptions);

            let evalData: AiEvaluationData | null = null;
            if (student.ai_evaluation) {
              try {
                evalData = JSON.parse(student.ai_evaluation) as AiEvaluationData;
              } catch {}
            }

            return (
              <div
                key={student.id}
                style={{
                  background: "var(--paper-bright, #ffffff)",
                  border: "1px solid var(--line, rgba(23, 23, 20, 0.22))",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                }}
              >
                {/* Student Card Top Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.6rem",
                        background: "#101d38",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        borderRadius: "4px",
                      }}
                    >
                      Roll No. {student.roll_number}
                    </span>
                    <strong style={{ fontSize: "1.2rem", color: "var(--ink)" }}>{student.name}</strong>
                    <span
                      style={{
                        padding: "0.2rem 0.55rem",
                        borderRadius: "4px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        background: student.status === "completed" ? "rgba(16, 185, 129, 0.15)" : "rgba(234, 179, 8, 0.15)",
                        color: student.status === "completed" ? "#065f46" : "#854d0e",
                      }}
                    >
                      {student.status.toUpperCase()}
                    </span>

                    {/* AI Score Badge */}
                    {evalData ? (
                      <span
                        style={{
                          padding: "0.25rem 0.65rem",
                          borderRadius: "4px",
                          fontSize: "0.82rem",
                          fontWeight: 800,
                          background: "#e0f2fe",
                          color: "#0369a1",
                          border: "1px solid #7dd3fc",
                        }}
                      >
                        🎯 AI Score: {evalData.earned_marks} / {evalData.total_marks} ({evalData.percentage}%)
                      </span>
                    ) : student.status === "completed" ? (
                      <span
                        style={{
                          padding: "0.25rem 0.6rem",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          background: "#f3f4f6",
                          color: "#4b5563",
                        }}
                      >
                        ⏳ AI Assessment Pending
                      </span>
                    ) : null}
                  </div>

                  {/* AI Evaluation Trigger Button */}
                  {student.status === "completed" && (
                    <form
                      action={async () => {
                        "use server";
                        await evaluateAttendeeAction(roomId, student.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="button button--accent"
                        style={{
                          minHeight: "40px",
                          padding: "0 1.25rem",
                          fontSize: "0.85rem",
                          backgroundColor: "#c9ff47",
                          color: "#111827",
                          fontWeight: 900,
                          border: "2px solid #111827",
                          boxShadow: "3px 3px 0 #111827",
                        }}
                      >
                        ✨ {evalData ? "Re-evaluate with AI" : "Run AI Assessment"}
                      </button>
                    </form>
                  )}
                </div>

                {/* Card Content Area */}
                <div style={{ marginTop: "1rem" }}>
                  {/* State 1: Evaluated by AI */}
                  {evalData && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div
                        style={{
                          padding: "1rem 1.2rem",
                          background: "#f0fdf4",
                          border: "1px solid #86efac",
                          borderRadius: "6px",
                          color: "#14532d",
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.3rem" }}>
                          🤖 AI Formative Assessment Summary
                        </div>
                        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5 }}>{evalData.summary}</p>
                      </div>

                      <details
                        open
                        style={{
                          background: "var(--paper, #f3f0e7)",
                          padding: "1rem",
                          borderRadius: "6px",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <summary
                          style={{
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.95rem",
                            marginBottom: "0.75rem",
                          }}
                        >
                          Detailed Question Breakdown ({evalData.breakdown.length} questions assessed)
                        </summary>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                          {evalData.breakdown.map((item, idx) => (
                            <div
                              key={item.question_id || idx}
                              style={{
                                background: "#ffffff",
                                padding: "1rem",
                                borderRadius: "6px",
                                border: "1px solid #e5e7eb",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "0.5rem",
                                  borderBottom: "1px solid #f3f4f6",
                                  paddingBottom: "0.3rem",
                                }}
                              >
                                <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>
                                  Question {item.question_id}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "0.85rem",
                                    color: item.earned_marks === item.available_marks ? "#15803d" : item.earned_marks > 0 ? "#b45309" : "#b91c1c",
                                    background: "#f9fafb",
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "4px",
                                  }}
                                >
                                  {item.earned_marks} / {item.available_marks} Mark{item.available_marks > 1 ? "s" : ""}
                                </span>
                              </div>

                              {item.question_text && (
                                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#374151", margin: "0.3rem 0" }}>
                                  {item.question_text}
                                </p>
                              )}

                              <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                                <span style={{ fontWeight: 700, color: "#4b5563" }}>Student&apos;s Answer:</span>
                                <div
                                  style={{
                                    marginTop: "0.2rem",
                                    padding: "0.5rem 0.75rem",
                                    background: "#f9fafb",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "4px",
                                    fontFamily: "monospace",
                                    whiteSpace: "pre-wrap",
                                    color: item.student_answer ? "#111827" : "#9ca3af",
                                  }}
                                >
                                  {item.student_answer || "(No answer entered)"}
                                </div>
                              </div>

                              {item.answer_outline && (
                                <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
                                  <span style={{ fontWeight: 700, color: "#4b5563" }}>Answer Outline / Scheme:</span>
                                  <p style={{ margin: "0.2rem 0 0", color: "#4b5563" }}>{item.answer_outline}</p>
                                </div>
                              )}

                              <div
                                style={{
                                  marginTop: "0.6rem",
                                  padding: "0.5rem 0.75rem",
                                  background: "#f0fdf4",
                                  borderRadius: "4px",
                                  fontSize: "0.85rem",
                                  color: "#166534",
                                }}
                              >
                                <strong>AI Feedback:</strong> {item.feedback}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* State 2: Completed, not yet evaluated */}
                  {!evalData && student.status === "completed" && (
                    <div>
                      <div
                        style={{
                          padding: "0.75rem 1rem",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "4px",
                          fontSize: "0.85rem",
                          color: "#92400e",
                          marginBottom: "1rem",
                        }}
                      >
                        Student completed the test. Click <strong>Run AI Assessment</strong> above to grade responses against CBSE criteria and generate question-level feedback.
                      </div>

                      <details>
                        <summary style={{ fontWeight: 600, cursor: "pointer", fontSize: "0.88rem" }}>
                          View Raw Student Responses ({responseEntries.length} items)
                        </summary>
                        <div
                          style={{
                            marginTop: "0.75rem",
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "0.75rem",
                          }}
                        >
                          {responseEntries.map(([qid, ans]) => (
                            <div
                              key={qid}
                              style={{
                                padding: "0.75rem",
                                background: "#f9fafb",
                                border: "1px solid #e5e7eb",
                                borderRadius: "4px",
                                fontSize: "0.85rem",
                              }}
                            >
                              <strong style={{ color: "var(--ink)", display: "block", marginBottom: "0.25rem" }}>
                                Q: {qid}
                              </strong>
                              <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "#374151" }}>
                                {String(ans) || "(No answer)"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* State 3: Still in progress */}
                  {student.status !== "completed" && (
                    <p style={{ color: "#6b7280", fontSize: "0.88rem", margin: "0.5rem 0" }}>
                      Student joined session. Currently answering paper questions...
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {attendees.length === 0 && (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                background: "var(--paper-bright)",
                border: "1px dashed var(--line)",
                borderRadius: "8px",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem" }}>No Students Joined Yet</h3>
              <p style={{ color: "var(--muted)", margin: 0 }}>
                Share the Room Code <strong>{roomId}</strong> with your students to begin collecting responses.
              </p>
            </div>
          )}
        </div>
      </section>

      <SiteFooter portal="study" />
    </main>
  );
}
