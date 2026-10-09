"use client";

import { useEffect, useState, useTransition } from "react";
import { createRoomAction } from "./actions";
import type { CurriculumCatalog } from "../../study-catalog";

export function CatalogRoomForm() {
  const [catalog, setCatalog] = useState<CurriculumCatalog | null>(null);
  const [grade, setGrade] = useState("10");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    fetch("/api/study/catalog").then(async (response) => {
      const result = await response.json() as CurriculumCatalog;
      if (!response.ok || !result.classes?.length) throw new Error("Curriculum unavailable. Try again shortly or use a saved paper.");
      setCatalog(result);
      setGrade(result.classes.find((entry) => entry.grade === "10")?.grade ?? result.classes[0].grade);
    }).catch((reason) => setError(reason.message));
  }, []);
  const entry = catalog?.classes.find((item) => item.grade === grade);
  return <form action={(data) => startTransition(async () => {
    setError("");
    try { await createRoomAction(data); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Room creation failed. Try again."); }
  })} className="room-catalog-form">
    <fieldset disabled={pending || !entry}>
      <label>Class<select name="grade" value={grade} onChange={(event) => setGrade(event.target.value)}>{catalog?.classes.map((item) => <option key={item.grade} value={item.grade}>Class {item.grade}</option>)}</select></label>
      <label>Subject<select name="subject" key={grade}>{entry?.subjects.filter((item) => item.board === "CBSE").map((item) => <option key={item.subject} value={item.subject}>{item.subject}</option>)}</select></label>
      <label>Paper format<select name="paperSize"><option value="half">40 marks · 90 minutes</option><option value="full">80 marks · 180 minutes</option></select></label>
      <button className="button button--accent" type="submit">{pending ? "Preparing room…" : "Generate paper and create room"}</button>
    </fieldset>
    {!catalog && !error && <p role="status">Loading available classes and subjects…</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </form>;
}
