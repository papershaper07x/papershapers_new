"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CurriculumCatalog, CurriculumClass, CurriculumSubject } from "./study-catalog";

export function TestPlanner() {
  const [catalog, setCatalog] = useState<CurriculumCatalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const currentClass = useMemo(() => catalog?.classes.find((item) => item.grade === grade) ?? null, [catalog, grade]);
  const [subjectName, setSubjectName] = useState("");
  const subject = useMemo(() => currentClass?.subjects.find((item) => item.subject === subjectName) ?? null, [currentClass, subjectName]);
  const [chapters, setChapters] = useState<string[]>([]);
  const [focus, setFocus] = useState("Exam practice");
  const [paperSize, setPaperSize] = useState<"half" | "full">("half");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/study/catalog").then(async (response) => { const result = await response.json() as CurriculumCatalog & { error?: string }; if (!response.ok || !result.classes?.length) throw new Error(result.error ?? "The installed curriculum source is unavailable."); const first = result.classes[0]; setCatalog(result); setGrade(first.grade); setSubjectName(first.subjects[0]?.subject ?? ""); setChapters(first.subjects[0]?.chapters.slice(0, 2) ?? []); }).catch((reason: Error) => setCatalogError(reason.message)); }, []);
  function chooseClass(next: CurriculumClass) { setGrade(next.grade); setSubjectName(next.subjects[0]?.subject ?? ""); setChapters(next.subjects[0]?.chapters.slice(0, 2) ?? []); }
  function chooseSubject(next: CurriculumSubject) { setSubjectName(next.subject); setChapters(next.chapters.slice(0, 2)); }
  function toggleChapter(chapter: string) { setChapters((current) => current.includes(chapter) ? current.filter((item) => item !== chapter) : [...current, chapter]); }
  async function createTest() { if (!currentClass || !subject || !chapters.length) { setError("Select a class, subject, and at least one chapter."); return; } setSaving(true); setError(""); const response = await fetch("/api/study/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paperSize, board: subject.board, grade: currentClass.grade, subject: subject.subject, chapters, focus }) }); const result = await response.json() as { paper?: { id: string }; error?: string }; if (!response.ok || !result.paper?.id) { setError(result.error ?? "Could not generate this paper."); setSaving(false); return; } window.location.assign(`/papershapers/papers/${result.paper.id}`); }
  if (catalogError) return <main className="study-route page-shell"><p className="form-error">{catalogError}</p><p>Restore the local Paper Shapers curriculum files and restart the backend. This planner does not substitute invented subjects or chapters.</p></main>;
  if (!catalog || !currentClass || !subject) return <main className="study-route page-shell"><p className="route-loading">Loading your installed curriculum map…</p></main>;
  return <main className="study-route">
    {saving && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(244, 240, 231, 0.9)", zIndex: 100, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <h2 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Shaping your paper...</h2>
          <p>Please wait while we generate curriculum-grounded questions.</p>
        </div>
      </div>
    )}
    <div className="study-route__bar page-shell"><Link href="/papershapers/dashboard">← Study desk</Link><span>Test planner</span></div><section className="test-planner page-shell"><div className="test-planner__intro"><p className="kicker">Build by your source data</p><h1>Set a test that<br /><em>uses your syllabus.</em></h1><p>These choices come directly from your local Paper Shapers curriculum data, not from a reconstructed subject list.</p><small>Source: {catalog.source}. Select only chapters currently assigned by your school.</small></div><div className="test-planner__controls"><fieldset><legend>1 · Class</legend><div className="planner-choice-row">{catalog.classes.map((item) => <button key={item.grade} className={currentClass.grade === item.grade ? "is-active" : ""} type="button" onClick={() => chooseClass(item)}>{item.class_label}</button>)}</div></fieldset><fieldset><legend>2 · Subject</legend><div className="subject-list">{currentClass.subjects.map((item) => <button key={item.subject} className={subject.subject === item.subject ? "is-active" : ""} type="button" onClick={() => chooseSubject(item)}><strong>{item.subject}</strong><span>{item.chapters.length} mapped chapters</span></button>)}</div></fieldset><fieldset><legend>3 · Chapters</legend><div className="chapter-list">{subject.chapters.map((chapter) => <label key={chapter}><input type="checkbox" checked={chapters.includes(chapter)} onChange={() => toggleChapter(chapter)} />{chapter}</label>)}</div></fieldset><fieldset><legend>4 · Test format</legend><div className="subject-list">
      <button className={focus === "Quick check" ? "is-active" : ""} type="button" onClick={() => setFocus("Quick check")}><strong>Quick check</strong><span>For a quick revision and knowledge test</span></button>
      <button className={focus === "Exam practice" ? "is-active" : ""} type="button" onClick={() => setFocus("Exam practice")}><strong>Exam practice</strong><span>Comprehensive test with mixed difficulty</span></button>
      <button className={focus === "Weak spots" ? "is-active" : ""} type="button" onClick={() => setFocus("Weak spots")}><strong>Weak spots</strong><span>Targeted practice for complex concepts</span></button>
    </div><legend style={{ marginTop: "1rem" }}>5 · Test duration</legend><div className="subject-list"><button className={paperSize === "half" ? "is-active" : ""} type="button" onClick={() => setPaperSize("half")}><strong>Half paper</strong><span>40 marks · 90 min</span></button><button className={paperSize === "full" ? "is-active" : ""} type="button" onClick={() => setPaperSize("full")}><strong>Full paper</strong><span>80 marks · 180 min</span></button></div></fieldset><div className="test-planner__summary"><span>{currentClass.class_label} · {subject.subject}</span><strong>{chapters.length} chapter{chapters.length === 1 ? "" : "s"} · {paperSize === "half" ? "40 marks / 90 min" : "80 marks / 180 min"}</strong><button className="button button--accent" type="button" disabled={saving} onClick={createTest}>{saving ? "Generating with your configured model…" : "Generate test and open paper →"}</button>{error && <p className="form-error">{error}</p>}</div></div></section></main>;
}

