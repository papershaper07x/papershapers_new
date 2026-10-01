"use client";

import { useId, useMemo, useState } from "react";
import type { StudyQuestion } from "./study-types";

export function parseQuestionOptions(question: StudyQuestion): { promptText: string; options: string[] } {
  if (question.options && question.options.length > 0) {
    return { promptText: question.text, options: question.options };
  }

  const text = question.text;
  // Match standard option patterns: (a) ... (b) ... (c) ... (d) ... or A) ... B) ...
  const optionRegex = /(?:\r?\n|^|\s)(?:\(([a-dA-D1-4])\)|([a-dA-D1-4])\))\s+/g;
  const matches = Array.from(text.matchAll(optionRegex));

  if (matches.length >= 2) {
    const firstMatchIndex = matches[0].index!;
    const promptText = text.slice(0, firstMatchIndex).trim();
    const options: string[] = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index! + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
      const label = (matches[i][1] || matches[i][2]).toUpperCase();
      const optText = text.slice(start, end).trim();
      options.push(`(${label}) ${optText}`);
    }
    return { promptText: promptText || text, options };
  }

  return { promptText: text, options: [] };
}

export function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: StudyQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const { promptText, options } = useMemo(() => parseQuestionOptions(question), [question]);
  const isMcq = options.length > 0 || question.type.toLowerCase().includes("mcq") || question.type.toLowerCase().includes("multiple");
  const isFillOrShort = !isMcq && (question.marks <= 2 || question.type.toLowerCase().includes("fill") || question.type.toLowerCase().includes("short"));
  const [showNotes, setShowNotes] = useState(false);

  return (
    <article className="attempt-question" style={{ border: "1px solid #d4cbb8", borderRadius: "8px", padding: "1.5rem", background: "#ffffff", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
        <span style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, color: "#9a6610" }}>
          {question.id} {question.chapter ? `· ${question.chapter}` : ""}
          <span style={{ marginLeft: "0.5rem", padding: "0.15rem 0.4rem", borderRadius: "3px", background: "#f0ece1", fontSize: "0.75rem" }}>
            {isMcq ? "MULTIPLE CHOICE" : isFillOrShort ? "SHORT ANSWER" : "DESCRIPTIVE"}
          </span>
        </span>
        <b style={{ background: "#101d38", color: "#f8f5ed", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.85rem" }}>
          {question.marks} mark{question.marks === 1 ? "" : "s"}
        </b>
      </div>

      <h2 style={{ fontSize: "1.15rem", lineHeight: "1.5", margin: "0 0 1.25rem", color: "#101d38", fontFamily: "Georgia, serif" }}>
        {promptText}
      </h2>

      {isMcq && options.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", color: "#65635c", textTransform: "uppercase" }}>
            Select one option:
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.6rem" }}>
            {options.map((opt, idx) => {
              const optLabel = opt.slice(0, 4); // e.g. "(A)"
              const isSelected = value.startsWith(optLabel) || value.trim() === opt.trim();
              return (
                <label
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.85rem 1rem",
                    borderRadius: "6px",
                    border: isSelected ? "2px solid #101d38" : "1px solid #d4cbb8",
                    background: isSelected ? "rgba(217, 184, 95, 0.15)" : "#fdfcf9",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    fontWeight: isSelected ? 700 : 500,
                  }}
                >
                  <input
                    type="radio"
                    name={`mcq-${question.id}-${inputId}`}
                    value={opt}
                    checked={isSelected}
                    onChange={() => onChange(opt)}
                    style={{ width: "18px", height: "18px", accentColor: "#101d38", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.95rem", color: "#101d38" }}>{opt}</span>
                  {isSelected && <span style={{ marginLeft: "auto", color: "#065f46", fontWeight: 800 }}>✓ Selected</span>}
                </label>
              );
            })}
          </div>

          <div style={{ marginTop: "0.5rem" }}>
            {!showNotes ? (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                style={{ background: "none", border: "none", padding: 0, color: "#9a6610", fontSize: "0.8rem", textDecoration: "underline", cursor: "pointer" }}
              >
                + Add explanation or working notes (optional)
              </button>
            ) : (
              <div style={{ marginTop: "0.5rem" }}>
                <label htmlFor={`notes-${question.id}`} style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}>
                  Optional explanation/working:
                </label>
                <textarea
                  id={`notes-${question.id}`}
                  value={value.includes("\nNotes: ") ? value.split("\nNotes: ")[1] : ""}
                  onChange={(e) => {
                    const base = value.split("\nNotes: ")[0];
                    onChange(e.target.value.trim() ? `${base}\nNotes: ${e.target.value}` : base);
                  }}
                  rows={2}
                  placeholder="Show your reasoning or calculation steps if required..."
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontSize: "0.85rem" }}
                />
              </div>
            )}
          </div>
        </div>
      ) : isFillOrShort ? (
        <div>
          <label htmlFor={`input-${question.id}`} style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "#101d38" }}>
            Your answer (word, phrase, or value):
          </label>
          <input
            id={`input-${question.id}`}
            type="text"
            value={value}
            placeholder="Type your final answer..."
            onChange={(e) => onChange(e.target.value)}
            style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #d4cbb8", borderRadius: "5px", fontSize: "1rem", background: "#ffffff" }}
          />
        </div>
      ) : (
        <div>
          <label htmlFor={`answer-${question.id}`} style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", fontWeight: 600, color: "#101d38" }}>
            Your detailed response:
          </label>
          <textarea
            id={`answer-${question.id}`}
            value={value}
            placeholder="State key concepts, definitions, steps, calculations, and conclusions clearly."
            onChange={(e) => onChange(e.target.value)}
            rows={question.marks >= 4 ? 7 : 4}
            style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #d4cbb8", borderRadius: "5px", fontSize: "0.95rem", lineHeight: "1.5", background: "#ffffff" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem", fontSize: "0.75rem", color: "#65635c" }}>
            <span>Include clear formula / diagram references if relevant</span>
            <span>{value.trim().length > 0 ? `${value.trim().split(/\s+/).length} words` : "Empty"}</span>
          </div>
        </div>
      )}
    </article>
  );
}
