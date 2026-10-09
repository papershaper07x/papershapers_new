"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinRoomAction } from "./actions";

export function JoinRoomForm({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return <form action={(data) => startTransition(async () => {
    setError("");
    try {
      const result = await joinRoomAction(roomId, data);
      if (result?.error) setError(result.error);
      else router.refresh();
    } catch { setError("Could not join this room. Please try again shortly."); }
  })} className="room-catalog-form"><fieldset disabled={pending}>
    <label>Your name<input name="name" required maxLength={80} autoComplete="name" /></label>
    <label>Roll number or student ID<input name="rollNumber" required maxLength={40} /></label>
    <p>Use the same browser to return to your session. If your student ID is already in use on another browser, ask your teacher for help.</p>
    <button className="button button--accent" type="submit">{pending ? "Joining…" : "Join test room"}</button>
  </fieldset>{error && <p className="form-error" role="alert">{error}</p>}</form>;
}
