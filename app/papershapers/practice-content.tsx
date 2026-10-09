import "katex/contrib/mhchem";
import { QuestionDiagram } from "./question-diagram";
import type { StudyDiagram } from "./study-types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export function PracticeContent({ text, diagram }: { text: string; diagram?: StudyDiagram | null }) {
  return <div className="practice-content"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown><QuestionDiagram diagram={diagram} /></div>;
}
