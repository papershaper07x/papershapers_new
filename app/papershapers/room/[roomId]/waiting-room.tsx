"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function WaitingRoom({ studentName, roomId }: { studentName: string; roomId: string }) {
  const router = useRouter();
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 600);
    const poll = setInterval(() => {
      router.refresh();
    }, 3500);
    return () => {
      clearInterval(interval);
      clearInterval(poll);
    };
  }, [router]);

  return (
    <main className="dashboard-page page-shell" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
      <p className="dash-overline">LIVE SESSION · ROOM {roomId}</p>
      <h1>Waiting for teacher to start{dots}</h1>
      <p style={{ marginTop: "1rem", lineHeight: "1.6" }}>
        Welcome, <strong>{studentName}</strong>! Please keep this page open. As soon as your teacher starts the test, the questions will appear automatically.
      </p>
      <div style={{ marginTop: "2rem" }}>
        <button type="button" onClick={() => router.refresh()} className="button button--dark">
          Check Status Now
        </button>
      </div>
    </main>
  );
}
