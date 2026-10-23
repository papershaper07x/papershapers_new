"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CurriculumCatalog, CurriculumClass, CurriculumSubject } from "./study-catalog";
import { StudyIcon } from "./study-icon";
import { generationResponse } from "./generation-response";

export function TestPlanner() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CurriculumCatalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const currentClass = useMemo(() => catalog?.classes.find((item) => item.grade === grade) ?? null, [catalog, grade]);
  const [subjectName, setSubjectName] = useState("");
  const subject = useMemo(() => currentClass?.subjects.find((item) => item.subject === subjectName) ?? null, [currentClass, subjectName]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [focus, setFocus] = useState("Exam practice");
  const [paperSize, setPaperSize] = useState<"half" | "full">("half");
  const [mode, setMode] = useState<"practice" | "board-mock">("practice");
  const boardAvailable = (grade === "10" || grade === "12") && /^(mathematics|maths|mathematics standard)$/i.test(subjectName);
  const boardMode = mode === "board-mock" && boardAvailable;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/study/catalog").then(async (response) => { const result = await response.json() as CurriculumCatalog & { error?: string }; if (!response.ok || !result.classes?.length) throw new Error(result.error ?? "The installed curriculum source is unavailable."); const query = new URLSearchParams(window.location.search); const first = result.classes.find((item) => item.grade === query.get("grade")) ?? result.classes.find((item) => item.grade === "10") ?? result.classes[0]; const initialSubject = first.subjects.find((item) => item.subject === query.get("subject")) ?? first.subjects[0]; setCatalog(result); setGrade(first.grade); setSubjectName(initialSubject?.subject ?? ""); setChapters(initialSubject?.chapters.slice(0, 2) ?? []); }).catch((reason: Error) => setCatalogError(reason.message)); }, []);
  function chooseClass(next: CurriculumClass) { setGrade(next.grade); setSubjectName(next.subjects[0]?.subject ?? ""); setChapters(next.subjects[0]?.chapters.slice(0, 2) ?? []); }
  function chooseSubject(next: CurriculumSubject) { setSubjectName(next.subject); setChapters(next.chapters.slice(0, 2)); }
  function toggleChapter(chapter: string) { setChapters((current) => current.includes(chapter) ? current.filter((item) => item !== chapter) : current.length < 12 ? [...current, chapter] : current); }
  async function createTest() {
    if (saving) return;
    if (!currentClass || !subject || (!boardMode && !chapters.length)) { setError("Select a class, subject, and at least one chapter."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/study/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: boardMode ? "board-mock" : "practice", academicSession: "2026-27", paperSize: boardMode ? "full" : paperSize, board: subject.board, grade: currentClass.grade, subject: subject.subject, chapters: boardMode ? [] : chapters, focus }) });
      const result = await generationResponse<{ job?: { id: string }; paper?: { id: string } }>(response);
      // Accept the previous response while frontend/backend deployments overlap.
      if (result.paper?.id) { router.push(`/papershapers/papers/${result.paper.id}`); return; }
      if (!result.job?.id) throw new Error("Could not start this paper. Please try again.");
      for (let attempt = 0; attempt < (boardMode ? 360 : paperSize === "full" ? 240 : 120); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const check = await fetch(`/api/study/generate/${encodeURIComponent(result.job.id)}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) }).catch(() => null);
        if (!check || [502, 503, 504].includes(check.status)) continue;
        const { job } = await generationResponse<{ job: { status: string; paper_id?: string; error?: string } }>(check);
        if (job.status === "failed") throw new Error(job.error || "We couldn’t finish this paper. Please try again.");
        if (job.status === "ready" && job.paper_id) { router.push(`/papershapers/papers/${job.paper_id}`); return; }
      }
      throw new Error("Your paper is taking longer than expected. Check your saved papers shortly before creating another.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Connection failed. Try again."); setSaving(false); }
  }

  if (catalogError) return <main className="study-route page-shell planner-state"><h1>We couldn’t load the chapters.</h1><p className="form-error" role="alert">{catalogError}</p><p>Try reloading this page. If it still fails, <Link href="/papershapers/contact">let us know</Link>.</p><button className="button" onClick={() => window.location.reload()}>Reload chapters</button></main>;
  if (!catalog || !currentClass || !subject) return <main className="study-route page-shell planner-state" aria-busy="true"><p className="route-loading" role="status">Loading classes and chapters…</p><div className="planner-skeleton" aria-hidden="true"><i /><i /><i /></div></main>;
  return <main className="study-route">
    <div className="study-route__bar page-shell"><Link href="/papershapers/dashboard"><StudyIcon name="back" /> Study desk</Link><span>Create a practice paper</span></div>
    <section className="test-planner page-shell">
      <div className="test-planner__intro">
        <p className="kicker">Your next practice session</p>
        <h1>A paper for<br /><em>what you’re learning.</em></h1>
        <p>Pick your chapters and how you want to practise. You can answer online or print the paper.</p>
        <div className="planner-preview"><StudyIcon name="paper" /><div><strong>{currentClass.class_label} · {subject.subject}</strong><p>{boardMode ? "Full syllabus · 38 questions" : `${chapters.length} of ${subject.chapters.length} chapters selected`}</p><span><StudyIcon name="clock" /> {boardMode || paperSize === "full" ? "3 hours · 80 marks" : "90 minutes · 40 marks"}</span></div></div>
        {boardAvailable && <fieldset className="exam-choice" disabled={saving}><legend>Paper mode</legend><button type="button" aria-pressed={!boardMode} onClick={() => setMode("practice")}>Chapter practice</button><button type="button" aria-pressed={boardMode} onClick={() => setMode("board-mock")}>Board mock draft</button></fieldset>}
        <p className="planner-format-note">{boardMode ? "CBSE 2026–27 · Code 041 · 38 questions · 80 marks · 3 hours. Uses the full syllabus. Generated in small batches; educator review is pending." : "Board-style chapter practice with Sections A–E. The 40/80-mark format is adapted, not an official subject blueprint. A full paper uses the same selected chapters."}</p>
        <details className="planner-source"><summary>About these chapters</summary><p>Source: {catalog.source}. Check your school’s syllabus before choosing chapters.</p></details>
      </div>
      <form className="test-planner__controls" aria-busy={saving} onSubmit={(event) => { event.preventDefault(); void createTest(); }}>
        <fieldset disabled={saving}><legend><span>01</span> Class</legend><div className="planner-choice-row">{catalog.classes.map((item) => <button key={item.grade} aria-pressed={currentClass.grade === item.grade} className={currentClass.grade === item.grade ? "is-active" : ""} type="button" onClick={() => chooseClass(item)}>{item.class_label}</button>)}</div></fieldset>
        <fieldset disabled={saving}><legend><span>02</span> Subject</legend><div className="subject-list">{currentClass.subjects.map((item) => <button key={item.subject} aria-pressed={subject.subject === item.subject} className={subject.subject === item.subject ? "is-active" : ""} type="button" onClick={() => chooseSubject(item)}><strong>{item.subject}</strong><span>{item.chapters.length} chapters</span></button>)}</div></fieldset>
        {!boardMode && <fieldset disabled={saving}><legend><span>03</span> Chapters</legend><p className="planner-help" id="chapter-help">Choose up to 12. {chapters.length === 12 ? "Limit reached. Uncheck one to choose another." : "Start with what you’ve covered in class."}</p><div className="chapter-list" aria-describedby="chapter-help">{subject.chapters.map((chapter) => <label className={chapters.includes(chapter) ? "is-selected" : ""} key={chapter}><input type="checkbox" checked={chapters.includes(chapter)} disabled={!chapters.includes(chapter) && chapters.length >= 12} onChange={() => toggleChapter(chapter)} /><span>{chapter}</span></label>)}</div></fieldset>}
        {!boardMode && <fieldset disabled={saving}><legend><span>04</span> Practice goal</legend><div className="subject-list planner-goals">{[["Quick check", "Revisit the basics"], ["Exam practice", "Work through a mix of questions"], ["Weak spots", "Spend time on harder concepts"]].map(([value, description]) => <button key={value} className={focus === value ? "is-active" : ""} aria-pressed={focus === value} type="button" onClick={() => setFocus(value)}><strong>{value}</strong><span>{description}</span></button>)}</div></fieldset>}
        {!boardMode && <fieldset disabled={saving}><legend><span>05</span> Paper length</legend><div className="subject-list">{(["half", "full"] as const).map((size) => <button key={size} className={paperSize === size ? "is-active" : ""} aria-pressed={paperSize === size} type="button" onClick={() => setPaperSize(size)}><strong>{size === "half" ? "Half paper" : "Full paper"}</strong><span>{size === "half" ? "40 marks · 90 minutes" : "80 marks · 3 hours"}</span></button>)}</div></fieldset>}
        <div className="test-planner__summary"><span>{currentClass.class_label} · {subject.subject}</span><strong>{boardMode ? "Full syllabus · 80 marks · 3 hours" : `${chapters.length} chapter${chapters.length === 1 ? "" : "s"} · ${focus}`}</strong><button className="button button--accent" type="submit" disabled={saving || (!boardMode && !chapters.length)}>{saving ? "Creating your paper…" : "Create practice paper"}<StudyIcon name="arrow" /></button>{!boardMode && !chapters.length && <p className="planner-help">Choose at least one chapter to continue.</p>}{saving && <p className="planner-progress" role="status">We’re writing and checking the paper in small batches. This can take several minutes. Your paper will open here when it’s ready.</p>}{error && <p className="form-error" role="alert">{error}</p>}</div>
      </form>
    </section>
  </main>;
}

