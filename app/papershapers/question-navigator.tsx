import type { StudyQuestion } from "./study-types";

export function QuestionNavigator({ questions, answers }: { questions: StudyQuestion[]; answers: Record<string, string> }) {
  return <nav className="question-navigator" aria-label="Jump to a question"><p>Questions · filled squares have a response</p><div>{questions.map((question, index) => {
    const answered = Boolean(answers[question.id]?.trim());
    return <a key={question.id} className={answered ? "is-answered" : ""} href={`#question-${question.id}`} aria-label={`Question ${index + 1}, ${answered ? "answered" : "unanswered"}`}>{index + 1}</a>;
  })}</div></nav>;
}
