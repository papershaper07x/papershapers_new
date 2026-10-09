import type { SVGProps } from "react";

// Small, consistent action icons. Labels carry the meaning for assistive tools.
export function StudyIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: "back" | "arrow" | "clock" | "paper" | "print" | "check" }) {
  const paths = {
    back: "M19 12H5m6-6-6 6 6 6",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    clock: "M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    paper: "M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h6",
    print: "M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7v-7Zm10-3h.01",
    check: "m5 12 4 4L19 6",
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}><path d={paths[name]} /></svg>;
}
