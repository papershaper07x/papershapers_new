"use client";

export function SignOutButton() {
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }
  return <button className="signout-button" type="button" onClick={signOut}>Sign out</button>;
}
