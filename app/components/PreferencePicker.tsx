"use client";

import { useState } from "react";

export function PreferencePicker({ portal, options, initial, area }: { portal: "news" | "marketplace"; options: string[]; initial: string[]; area?: string }) {
  const [selected, setSelected] = useState(initial);
  const [localArea, setLocalArea] = useState(area ?? "");
  const [status, setStatus] = useState("");

  function toggle(value: string) {
    setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    setStatus("");
  }

  async function save() {
    setStatus("Saving…");
    const response = await fetch("/api/preferences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portal, values: selected, area: localArea }) });
    setStatus(response.ok ? "Saved to your profile." : "Could not save. Try again.");
  }

  return <div className="preference-picker">
    {portal === "marketplace" && <label className="area-field">My neighbourhood<input value={localArea} onChange={(event) => setLocalArea(event.target.value)} maxLength={80} /></label>}
    <div className="preference-options">{options.map((option) => <button className={selected.includes(option) ? "is-active" : ""} key={option} onClick={() => toggle(option)} type="button">{selected.includes(option) ? "✓ " : "+ "}{option}</button>)}</div>
    <div className="preference-save"><button type="button" onClick={save}>Save my interests</button><span role="status">{status}</span></div>
  </div>;
}
