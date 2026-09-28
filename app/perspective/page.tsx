import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { PerspectiveReader } from "./perspective-reader";

export const metadata: Metadata = { title: "Perspective — News without the tunnel vision", description: "Compare how different viewpoints frame the same story." };

export default function PerspectivePage() {
  return <main className="portal-page news-page"><SiteHeader portal="Perspective" /><PerspectiveReader /><SiteFooter /></main>;
}
