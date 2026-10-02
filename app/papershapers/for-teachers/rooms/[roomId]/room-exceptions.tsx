import Link from "next/link";
import { SiteHeader, SiteFooter } from "../../../../components/SiteChrome";

export function RoomNotFound({ user }: { user: any }) {
  return (
    <main className="portal-page study-page">
      <SiteHeader portal="study" user={user} />
      <div className="dashboard-page page-shell max-w-[600px] mx-auto mt-16 text-center">
        <h1>Room Not Found</h1>
        <p className="mt-4">This test room could not be located or may have expired.</p>
        <Link href="/papershapers/for-teachers/rooms" className="button button--dark mt-6 inline-block">
          ← Back to Rooms
        </Link>
      </div>
      <SiteFooter portal="study" />
    </main>
  );
}

export function AccessDenied({ user }: { user: any }) {
  return (
    <main className="portal-page study-page">
      <SiteHeader portal="study" user={user} />
      <div className="dashboard-page page-shell max-w-[600px] mx-auto mt-16 text-center">
        <h1>Access Denied</h1>
        <p className="mt-4">You are not the designated educator host of this room.</p>
        <Link href="/papershapers/for-teachers/rooms" className="button button--dark mt-6 inline-block">
          ← Back to Your Rooms
        </Link>
      </div>
      <SiteFooter portal="study" />
    </main>
  );
}
