"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RoomLiveMonitor({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, router]);

  const copyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/papershapers/room/${roomId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "1rem" }}>
      <button type="button" onClick={() => router.refresh()} className="button button--dark">
        Refresh Now
      </button>
      <button
        type="button"
        onClick={() => setAutoRefresh((prev) => !prev)}
        className="button"
        style={{
          border: "1px solid currentColor",
          background: autoRefresh ? "rgba(0, 180, 50, 0.1)" : "transparent",
        }}
      >
        {autoRefresh ? "🟢 Live Updates: ON (5s)" : "⚪ Live Updates: PAUSED"}
      </button>
      <button type="button" onClick={copyLink} className="button">
        {copied ? "✓ Link Copied!" : "📋 Copy Student Link"}
      </button>
    </div>
  );
}
