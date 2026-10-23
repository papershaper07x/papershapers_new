import { PracticeContent } from "./practice-content";
import type { StudyQuestion, StudyQuestionPart } from "./study-types";

export function BoardQuestionContent({ question }: { question: StudyQuestion | StudyQuestionPart }) {
  const options = "options" in question ? question.options : undefined;
  return <div className="board-question-content"><PracticeContent text={question.text} diagram={question.diagram} />
    {options?.length ? <ol className="exam-options" type="A">{options.map((option, i) => <li key={i}><PracticeContent text={option.replace(new RegExp(`^\\s*\\(?${String.fromCharCode(65 + i)}[).:]\\s+`, "i"), "")} /></li>)}</ol> : null}
    {"parts" in question && question.parts?.map((part, i) => <div className="exam-part" key={i}><span>({String.fromCharCode(97 + i)}) · {part.marks} mark{part.marks === 1 ? "" : "s"}</span><BoardQuestionContent question={part} /></div>)}
    {question.alternative && <div className="exam-alternative"><p className="exam-or">OR</p><BoardQuestionContent question={question.alternative} /></div>}
  </div>;
}
