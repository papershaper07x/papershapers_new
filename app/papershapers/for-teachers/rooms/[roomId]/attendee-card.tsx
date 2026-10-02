"use client";

import { useTransition } from "react";
import { evaluateAttendeeAction } from "../actions";

interface AiBreakdownItem {
  question_id: string;
  earned_marks: number;
  available_marks: number;
  question_text?: string;
  student_answer: string;
  feedback: string;
  answer_outline?: string;
}

interface AiEvaluationData {
  earned_marks: number;
  total_marks: number;
  percentage: number;
  summary: string;
  breakdown: AiBreakdownItem[];
}

export function AttendeeCard({
  roomId,
  student,
}: {
  roomId: string;
  student: any;
}) {
  const [isPending, startTransition] = useTransition();

  let parsedOptions: Record<string, string> = {};
  try {
    if (student.options_filled) {
      parsedOptions = JSON.parse(student.options_filled);
    }
  } catch {}

  const responseEntries = Object.entries(parsedOptions);

  let evalData: AiEvaluationData | null = null;
  if (student.ai_evaluation) {
    try {
      evalData = JSON.parse(student.ai_evaluation);
    } catch {}
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Student Card Top Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <span className="px-2.5 py-1 bg-[#101d38] text-white font-bold text-sm rounded">
            Roll No. {student.roll_number}
          </span>
          <strong className="text-xl text-[#172238]">{student.name}</strong>
          <span
            className={`px-2 py-1 rounded text-xs font-bold ${
              student.status === "completed"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {student.status.toUpperCase()}
          </span>

          {/* AI Score Badge */}
          {evalData ? (
            <span className="px-2.5 py-1 rounded text-sm font-bold bg-sky-100 text-sky-800 border border-sky-300">
              🎯 AI Score: {evalData.earned_marks} / {evalData.total_marks} (
              {evalData.percentage}%)
            </span>
          ) : student.status === "completed" ? (
            <span className="px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600">
              ⏳ AI Assessment Pending
            </span>
          ) : null}
        </div>

        {/* AI Evaluation Trigger Button */}
        {student.status === "completed" && (
          <button
            onClick={() => {
              startTransition(() => {
                evaluateAttendeeAction(roomId, student.id);
              });
            }}
            disabled={isPending}
            className="button button--accent min-h-[40px] px-5 text-sm bg-[#c9ff47] text-gray-900 font-black border-2 border-gray-900 shadow-[3px_3px_0_#111827] hover:translate-y-[-2px] hover:shadow-[5px_5px_0_#111827] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            ✨ {isPending ? "Evaluating..." : evalData ? "Re-evaluate with AI" : "Run AI Assessment"}
          </button>
        )}
      </div>

      {/* Card Content Area */}
      <div className="mt-4">
        {/* State 1: Evaluated by AI */}
        {evalData && (
          <div className="flex flex-col gap-4">
            <div className="p-5 bg-green-50 border border-green-300 rounded-md text-green-900">
              <div className="font-bold text-base mb-1">
                🤖 AI Formative Assessment Summary
              </div>
              <p className="m-0 text-sm leading-relaxed">{evalData.summary}</p>
            </div>

            <details className="bg-[#f3f0e7] p-4 rounded-md border border-gray-300" open>
              <summary className="font-bold cursor-pointer text-base mb-3">
                Detailed Question Breakdown ({evalData.breakdown.length} questions assessed)
              </summary>

              <div className="flex flex-col gap-4 mt-2">
                {evalData.breakdown.map((item, idx) => (
                  <div key={item.question_id || idx} className="bg-white p-4 rounded-md border border-gray-200">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                      <span className="font-bold text-sm">Question {item.question_id}</span>
                      <span className={`font-bold text-sm px-2 py-1 rounded ${
                          item.earned_marks === item.available_marks
                            ? "text-green-700 bg-green-50"
                            : item.earned_marks > 0
                            ? "text-amber-700 bg-amber-50"
                            : "text-red-700 bg-red-50"
                        }`}
                      >
                        {item.earned_marks} / {item.available_marks} Mark{item.available_marks > 1 ? "s" : ""}
                      </span>
                    </div>

                    {item.question_text && (
                      <p className="text-sm font-semibold text-gray-700 my-2">
                        {item.question_text}
                      </p>
                    )}

                    <div className="mt-2 text-sm">
                      <span className="font-bold text-gray-600">Student&apos;s Answer:</span>
                      <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded text-sm font-mono whitespace-pre-wrap">
                        {item.student_answer ? (
                          <span className="text-gray-900">{item.student_answer}</span>
                        ) : (
                          <span className="text-gray-400">(No answer entered)</span>
                        )}
                      </div>
                    </div>

                    {item.answer_outline && (
                      <div className="mt-2 text-sm">
                        <span className="font-bold text-gray-600">Answer Outline / Scheme:</span>
                        <p className="m-0 mt-1 text-gray-600">{item.answer_outline}</p>
                      </div>
                    )}

                    <div className="mt-3 p-3 bg-green-50 rounded text-sm text-green-800">
                      <strong>AI Feedback:</strong> {item.feedback}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* State 2: Completed, not yet evaluated */}
        {!evalData && student.status === "completed" && (
          <div>
            <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900 mb-4">
              Student completed the test. Click <strong>Run AI Assessment</strong> above to grade responses against CBSE criteria and generate question-level feedback.
            </div>

            <details>
              <summary className="font-semibold cursor-pointer text-sm">
                View Raw Student Responses ({responseEntries.length} items)
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {responseEntries.map(([qid, ans]) => (
                  <div key={qid} className="p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                    <strong className="text-gray-900 block mb-1">Q: {qid}</strong>
                    <p className="m-0 whitespace-pre-wrap text-gray-700">
                      {String(ans) || "(No answer)"}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* State 3: Still in progress */}
        {student.status !== "completed" && (
          <p className="text-gray-500 text-sm my-2">
            Student joined session. Currently answering paper questions...
          </p>
        )}
      </div>
    </div>
  );
}
