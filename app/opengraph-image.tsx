import { ImageResponse } from "next/og";

export const alt = "Paper Shapers — Learning and local discovery";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function SocialImage() {
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 80, background: "#f4f0e7", color: "#101d38", fontFamily: "sans-serif" }}><div style={{ fontSize: 28 }}>PAPER SHAPERS</div><div style={{ display: "flex", flexDirection: "column", fontSize: 76, marginTop: 40 }}><span>Two ideas.</span><span>One useful internet.</span></div><div style={{ fontSize: 30, marginTop: 40 }}>Study · Noticeboard</div></div>, size);
}
