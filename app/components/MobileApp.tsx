"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

function subscribeInstalled(callback: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", callback);
  window.addEventListener("appinstalled", callback);
  return () => { media.removeEventListener("change", callback); window.removeEventListener("appinstalled", callback); };
}

export default function MobileApp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const installed = useSyncExternalStore(subscribeInstalled, () => window.matchMedia("(display-mode: standalone)").matches, () => false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    const done = () => { setPrompt(null); };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", ready); window.removeEventListener("appinstalled", done); };
  }, []);
  return <div className="mobile-install">{installed ? <p>You are using the installed app.</p> : prompt ? <button className="nav-pill" onClick={async () => { try { await prompt.prompt(); const choice = await prompt.userChoice; setMessage(choice.outcome === "accepted" ? "Installation requested." : "You can install later from your browser menu."); } catch { setMessage("Use your browser menu to install."); } setPrompt(null); }}>Install Study app</button> : <p>On Android, open your browser menu and choose <strong>Install app</strong> or <strong>Add to home screen</strong>. On iPhone, open this site in Safari, tap Share, then <strong>Add to Home Screen</strong>. Browser support varies.</p>}<p role="status">{message}</p></div>;
}
