"use client";

import { useState } from "react";

const subjects = ["Mathematics", "Science", "English", "Social Science"];
const focusOptions = ["Quick check", "Exam practice", "Weak spots"];

export function StudyBuilder() {
  const [subject, setSubject] = useState("Mathematics");
  const [grade, setGrade] = useState("10");
  const [focus, setFocus] = useState("Exam practice");
  const [ready, setReady] = useState(false);

  return (
    <section className="builder-wrap" id="builder">
      <div className="page-shell builder-grid">
        <div className="builder-intro"><p className="kicker">Try the front-end flow</p><h2>Shape your next practice set.</h2><p>This prototype shows the choices a future generator will send to the backend. Pick what matters; we’ll keep everything else out of the way.</p></div>
        <div className="builder-panel">
          <fieldset><legend>1 · Pick a subject</legend><div className="choice-row">{subjects.map((item) => <button className={subject === item ? "choice is-active" : "choice"} onClick={() => { setSubject(item); setReady(false); }} type="button" key={item}>{item}</button>)}</div></fieldset>
          <fieldset><legend>2 · Choose a class</legend><div className="class-row">{["8", "9", "10", "11", "12"].map((item) => <button className={grade === item ? "class-choice is-active" : "class-choice"} onClick={() => { setGrade(item); setReady(false); }} type="button" key={item}>{item}</button>)}</div></fieldset>
          <fieldset><legend>3 · Set the intent</legend><div className="choice-row">{focusOptions.map((item) => <button className={focus === item ? "choice is-active" : "choice"} onClick={() => { setFocus(item); setReady(false); }} type="button" key={item}>{item}</button>)}</div></fieldset>
          <button className="button button--accent builder-button" type="button" onClick={() => setReady(true)}>Preview my brief <span>→</span></button>
          <div className={ready ? "brief-result is-visible" : "brief-result"} aria-live="polite">
            <span>READY FOR THE GENERATOR</span><strong>Class {grade} · {subject}</strong><p>{focus} with a balanced mix of short answers, applied questions, and one challenge problem.</p><small>Front-end demo — generation will connect to the backend in the next phase.</small>
          </div>
        </div>
      </div>
    </section>
  );
}
