export type StudyQuestion = {
  id: string;
  section: string;
  chapter: string;
  marks: number;
  type: string;
  text: string;
  answer_outline?: string;
};

export type StudyPaper = {
  id: string;
  title: string;
  board: string;
  grade: string;
  subject: string;
  paper_size: "half" | "full";
  total_marks: number;
  time_minutes: number;
  instructions: string[];
  questions: StudyQuestion[];
  provider: string;
  generation_source?: "fresh" | "cached-recovery";
  cached_from_provider?: string;
  is_demo: boolean;
  created_at: string;
};

export type StudyPaperRecord = {
  id: string;
  paper_size: "half" | "full";
  board: string;
  grade: string;
  subject: string;
  provider: string;
  status: string;
  generation_source?: "fresh" | "cached-recovery";
  created_at: string;
  paper: StudyPaper;
};

export type StudyAttempt = {
  id: string;
  paper_id: string;
  provider: string;
  earned_marks: number;
  total_marks: number;
  percentage: number;
  summary: string;
  submitted_at: string;
  verification?: { status: string; provider: string; detail: string };
  breakdown: Array<{ question_id: string; earned_marks: number; available_marks: number; question_text: string; student_answer: string; feedback: string; answer_outline: string }>;
};
