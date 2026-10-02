import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTestRoom, getTestAttendees } from "../../../../../db/service";
import { getCurrentUser } from "../../../../../lib/auth";
import { backendFetch } from "../../../../../lib/backend";
import { SiteHeader, SiteFooter } from "../../../../components/SiteChrome";
import { startRoomAction, closeRoomAction } from "../actions";
import { RoomLiveMonitor } from "./room-live-monitor";
import { RoomNotFound, AccessDenied } from "./room-exceptions";
import { AttendeeCard } from "./attendee-card";
import type { StudyPaper, StudyPaperRecord } from "../../../study-types";

export const metadata: Metadata = {
  title: "Live Room Dashboard & Assessment | Paper Shapers",
  description: "Educator live session dashboard, student response review, and on-demand AI assessment.",
};

export default async function TeacherRoomViewPage({ params }: { params: Promise<{ roomId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Ffor-teachers%2Frooms&mode=login");

  const { roomId } = await params;
  const room = await getTestRoom(roomId);

  if (!room) {
    return <RoomNotFound user={user} />;
  }

  if (room.teacher_id !== user.id) {
    return <AccessDenied user={user} />;
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

      <div className="study-route__bar page-shell flex justify-between items-center py-4 border-b border-gray-200">
        <Link href="/papershapers/for-teachers/rooms" className="font-semibold hover:underline">← Back to Live Rooms</Link>
        <div className="flex gap-6 text-sm text-[#172238]">
          <span>Room Code: <strong className="tracking-wide">{roomId}</strong></span>
          <span>Host: <strong>{user.name || user.email}</strong></span>
        </div>
      </div>

      <section className="study-dash-hero page-shell mt-8">
        <div>
          <p className="dash-overline">
            SESSION STATUS:{" "}
            <span
              className={`font-bold ${
                room.status === "active" ? "text-emerald-500" : room.status === "completed" ? "text-gray-500" : "text-amber-600"
              }`}
            >
              {room.status.toUpperCase()}
            </span>
          </p>
          <h1 className="text-[clamp(2rem,4vw,3rem)] leading-tight my-2 font-serif font-medium">Live Test Room</h1>
          <p className="text-lg font-semibold text-[#172238]">{paperTitle}</p>
          {paperMeta && <p className="text-gray-600 text-sm mt-1">{paperMeta}</p>}

          <div className="mt-6 p-5 bg-[#101d38] text-white rounded-md border border-[#d9b85f] inline-block">
            <div className="text-xs tracking-wide uppercase text-[#d9b85f] font-bold">
              Student Join Code
            </div>
            <div className="text-3xl font-black tracking-widest my-1 text-white">
              {roomId}
            </div>
            <div className="text-sm text-slate-300">
              Share this code with students at: <code className="bg-slate-800 px-1 py-0.5 rounded text-white">/papershapers/room</code>
            </div>
          </div>

          <div className="mt-6">
            <RoomLiveMonitor roomId={roomId} />
          </div>

          <div className="mt-6 flex gap-4 flex-wrap items-center">
            {room.status === "waiting" && (
              <form
                action={async () => {
                  "use server";
                  await startRoomAction(roomId);
                }}
              >
                <button
                  type="submit"
                  className="button button--accent bg-[#c9ff47] text-gray-900 font-black border-2 border-gray-900 shadow-[4px_4px_0_#111827] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#111827] transition-all"
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
              <span className="text-sm font-semibold text-gray-600">
                ✓ Session concluded. Responses preserved for review.
              </span>
            )}
          </div>
        </div>

        <div className="study-score self-start bg-white p-5 rounded-md border border-gray-200 shadow-sm mt-8 md:mt-0">
          <span className="text-xs font-bold tracking-widest uppercase text-gray-500 block mb-1">ENROLLED</span>
          <strong className="text-4xl font-serif text-[#101d38] block leading-none">{attendees.length}</strong>
          <small className="text-xs text-gray-500 mt-2 block font-medium">
            {completedCount} completed · {waitingCount} in progress · {evaluatedCount} AI evaluated
          </small>
        </div>
      </section>

      {/* Formative Evaluation Disclaimer */}
      <section className="page-shell mt-8">
        <div className="px-5 py-4 bg-[#f8f5ed] border border-[#d9b85f] rounded-md text-sm leading-relaxed text-[#4a3c10]">
          <strong>⚠️ Formative Assessment Notice:</strong> AI evaluations are practice estimates designed to aid educators in formative reviews and pinpoint student learning gaps. They do not constitute official CBSE examination scores or replace professional teacher judgment.
        </div>
      </section>

      {/* Student Review & AI Evaluation Deck */}
      <section className="page-shell mt-10 mb-20">
        <div className="dashboard-heading mb-6">
          <div>
            <p className="dash-label">STUDENT RESPONSES &amp; ASSESSMENT</p>
            <h2 className="text-3xl font-serif font-medium mt-1">Enrolled Students &amp; Performance Review</h2>
            <p className="text-gray-600 text-sm mt-1">
              Inspect candidate submissions, view answer sheets, and trigger on-demand AI rubric evaluations with question-level insights.
            </p>
          </div>
        </div>

        <div className="attendee-deck flex flex-col gap-6">
          {attendees.map((student) => (
            <AttendeeCard key={student.id} roomId={roomId} student={student} />
          ))}

          {attendees.length === 0 && (
            <div className="p-12 text-center bg-white border border-dashed border-gray-300 rounded-lg">
              <h3 className="m-0 mb-2 text-xl font-medium">No Students Joined Yet</h3>
              <p className="text-gray-500 m-0">
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
