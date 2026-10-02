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

      <div className="study-route__bar page-shell flex justify-between items-center py-3 border-b border-[#d4cbb8]">
        <Link href="/papershapers/for-teachers" className="font-semibold hover:underline">← Back to For Teachers</Link>
        <span className="text-sm">
          Live Testing ·{" "}
          <span className={`font-bold ${userRole.role === "teacher" ? "text-emerald-800" : "text-amber-800"}`}>
            {userRole.role === "teacher" ? "Verified Educator" : "Student Account"}
          </span>
        </span>
      </div>

      <section className="study-dash-hero page-shell mt-8">
        <div>
          <p className="dash-overline">EDUCATOR WORKBENCH</p>
          <h1 className="text-4xl font-serif font-medium mt-2">Host a live test room.</h1>
          <p className="mt-2 text-lg text-gray-700 max-w-2xl">
            Conduct real-time mock exams with any CBSE syllabus. Share your room code with students, monitor attempts live, and run AI-assisted evaluations on completed responses.
          </p>
        </div>
      </section>

      <section className={`study-dash-grid page-shell grid gap-8 pb-8 mt-10 ${userRole.role === "teacher" ? "md:grid-cols-[1.2fr_0.8fr]" : "grid-cols-1"}`}>
        {userRole.role !== "teacher" ? (
          <article className="dash-primary bg-[#101d38] border-2 border-[#efbd55] rounded-lg p-10 shadow-[6px_6px_0_#efbd55]">
            <span className="dash-label text-[#efbd55] font-mono tracking-widest text-sm font-bold">
              EDUCATOR VERIFICATION
            </span>
            <h2 className="text-white text-4xl mt-3 mb-2 font-serif font-medium">
              Teacher verification required.
            </h2>
            <p className="text-[#f8f5ed]/90 text-base leading-relaxed max-w-[680px] mb-6">
              Live Rooms is an educator-only capability designed for teachers and coaching leaders to host and assess classroom mock tests. To prevent student interference, please confirm your educator status.
            </p>
            <form action={verifyTeacherRoleAction} className="flex flex-col gap-4 max-w-[520px]">
              <div>
                <label htmlFor="instName" className="block mb-1.5 text-[#f8f5ed] text-sm font-semibold">
                  School, Coaching, or Institution Name (Optional)
                </label>
                <input
                  id="instName"
                  type="text"
                  name="institution"
                  placeholder="e.g. Kendriya Vidyalaya / Private Coaching"
                  className="w-full p-3 rounded-md border border-gray-300 bg-white text-[#101d38] text-base focus:ring-2 focus:ring-[#efbd55] outline-none"
                />
              </div>
              <button
                type="submit"
                className="button button--accent self-start mt-2 bg-green-600 text-white font-black border-2 border-green-900 shadow-[4px_4px_0_#064e3b] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#064e3b] transition-all"
              >
                I am a Teacher / Educator — Unlock Live Rooms →
              </button>
            </form>
          </article>
        ) : (
          <>
            {/* Create Room via Curriculum Catalog */}
            <article className="dash-primary bg-[#101d38] border-2 border-[#d9b85f] rounded-lg p-8 text-[#f8f5ed]">
              <span className="dash-label text-[#efbd55] font-mono text-sm font-bold">
                OPTION 1 · INSTANT SYLLABUS ROOM
              </span>
              <h2 className="text-white text-3xl mt-2 mb-4 font-serif font-medium">
                Launch by Class &amp; Subject
              </h2>
              <p className="text-[#f8f5ed]/85 text-sm mb-5 leading-relaxed">
                Select from all CBSE Classes 1–12 subjects to launch a live room immediately:
              </p>

              <form action={createRoomAction} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="classSelect" className="block mb-1 text-sm font-semibold text-[#f8f5ed]">Class:</label>
                    <select
                      id="classSelect"
                      name="grade"
                      defaultValue="10"
                      className="w-full p-3 rounded-md bg-white text-[#101d38] border border-gray-300 text-sm"
                    >
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="formatSelect" className="block mb-1 text-sm font-semibold text-[#f8f5ed]">Paper Format:</label>
                    <select
                      id="formatSelect"
                      name="paperSize"
                      defaultValue="half"
                      className="w-full p-3 rounded-md bg-white text-[#101d38] border border-gray-300 text-sm"
                    >
                      <option value="half">Half · 40 Marks (90 min)</option>
                      <option value="full">Full · 80 Marks (180 min)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subjectSelect" className="block mb-1 text-sm font-semibold text-[#f8f5ed]">Subject:</label>
                  <select
                    id="subjectSelect"
                    name="subject"
                    defaultValue="Science"
                    className="w-full p-3 rounded-md bg-white text-[#101d38] border border-gray-300 text-sm"
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
                  className="button button--accent self-start mt-2 bg-green-600 text-white font-black border-2 border-green-900 shadow-[4px_4px_0_#064e3b] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#064e3b] transition-all"
                >
                  ⚡ Launch Live Room for This Syllabus →
                </button>
              </form>
            </article>

            {/* Create Room via Library or Custom ID */}
            <article className="bg-white border-2 border-[#101d38] rounded-lg p-8 text-[#101d38]">
              <span className="dash-label text-[#9a6610] font-mono text-sm font-bold">
                OPTION 2 · SAVED PAPERS &amp; CUSTOM
              </span>
              <h2 className="text-3xl mt-2 mb-4 font-serif font-medium text-[#101d38]">
                Pick from Your Papers
              </h2>

              <form action={createRoomAction} className="flex flex-col gap-4">
                {papers.length > 0 ? (
                  <div>
                    <label htmlFor="paperSelect" className="block mb-1 text-sm font-semibold">
                      Select previously generated paper:
                    </label>
                    <select
                      id="paperSelect"
                      name="paperId"
                      className="w-full p-3 rounded-md border border-gray-300 text-sm"
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
                  <p className="text-sm text-gray-600 m-0">
                    No custom papers generated yet. You can create one from <Link href="/papershapers/tests/new" className="underline">Test Planner</Link> or use Option 1 above.
                  </p>
                )}

                <div>
                  <label htmlFor="customId" className="block mb-1 text-sm font-semibold">
                    Or enter any custom Paper ID:
                  </label>
                  <input
                    id="customId"
                    type="text"
                    name="paperId"
                    placeholder="e.g. 7daa6ba7-979d-442b..."
                    className="w-full p-3 rounded-md border border-gray-300 text-sm"
                  />
                </div>

                <button type="submit" className="button button--dark self-start mt-2">
                  Create Room from Paper ID →
                </button>
              </form>
            </article>
          </>
        )}
      </section>

      {/* Recent Sessions Table */}
      <section className="history-section page-shell mt-4 mb-20">
        <div className="dashboard-heading mb-6">
          <div>
            <p className="dash-label">SESSION HISTORY</p>
            <h2 className="text-3xl font-serif font-medium mt-1">Your Live Test Rooms</h2>
          </div>
        </div>

        <div className="history-table bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="history-row history-head bg-gray-50 border-b border-gray-200 text-sm font-bold text-gray-600 px-6 py-4 grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] gap-4">
            <span>Room Code</span>
            <span>Paper ID</span>
            <span>Status</span>
            <span>Created</span>
            <span>Action</span>
          </div>
          <div className="flex flex-col">
            {rooms.map((room) => (
              <div className="history-row flex items-center px-6 py-4 border-b border-gray-100 last:border-0 grid grid-cols-[1.5fr_2fr_1fr_1fr_1fr] gap-4" key={room.id}>
                <strong className="font-mono text-[0.95rem]">{room.id}</strong>
                <span className="text-sm font-mono text-gray-500">{room.paper_id.slice(0, 18)}...</span>
                <span>
                  <span
                    className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                      room.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : room.status === "completed"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {room.status.toUpperCase()}
                  </span>
                </span>
                <span className="text-sm text-gray-600">{new Date(room.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                <span>
                  <Link href={`/papershapers/for-teachers/rooms/${room.id}`} className="button button--dark py-1.5 px-3 text-xs">
                    Open Room Monitor →
                  </Link>
                </span>
              </div>
            ))}
            {rooms.length === 0 && (
              <p className="p-10 text-center text-gray-500 m-0">
                No test rooms created yet. Use the options above to host your first live session.
              </p>
            )}
          </div>
        </div>
      </section>

      <SiteFooter portal="study" />
    </main>
  );
}
