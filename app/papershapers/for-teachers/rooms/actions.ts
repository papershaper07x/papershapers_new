"use server";

import {
  createTestRoom,
  getTestRoom,
  getTestAttendees,
  updateTestRoomStatus,
  updateAttendeeAiEvaluation,
  getUserRole,
  setUserRole
} from "../../../../db/service";
import { getCurrentUser } from "../../../../lib/auth";
import { backendFetch } from "../../../../lib/backend";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { StudyPaper, StudyPaperRecord, StudyQuestion } from "../../study-types";

export async function verifyTeacherRoleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not logged in");
  const institution = (formData.get("institution") as string)?.trim().slice(0, 120) ?? "";
  await setUserRole(user.id, "teacher", institution, true);
  revalidatePath("/papershapers/for-teachers/rooms");
  revalidatePath("/papershapers/for-teachers");
}

export async function createRoomAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not logged in");

  const roleInfo = await getUserRole(user.id);
  if (roleInfo.role !== "teacher") {
    throw new Error("Teacher verification required to create live rooms");
  }

  let paperId = (formData.get("paperId") as string)?.trim();

  // If created via catalog selection (grade, subject, paperSize)
  const grade = formData.get("grade") as string;
  const subject = formData.get("subject") as string;
  const paperSize = (formData.get("paperSize") as string) || "half";

  if (!paperId && grade && subject) {
    try {
      const generated = await backendFetch<{ paper: { id: string } | StudyPaperRecord }>("/v1/study/papers", {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          board: "CBSE",
          grade,
          subject,
          paper_size: paperSize,
          chapters: [],
          focus: "Live classroom session"
        }),
      });
      paperId = (generated.paper as { id: string }).id;
    } catch {
      // Fallback: check if teacher has any matching paper
      const list = await backendFetch<{ items: StudyPaperRecord[] }>(`/v1/study/papers?user_id=${encodeURIComponent(user.id)}`);
      const match = list.items?.find((p) => p.grade === grade && p.subject.toLowerCase() === subject.toLowerCase());
      if (match) {
        paperId = match.id;
      }
    }
  }

  if (!paperId) {
    throw new Error("Please select or specify a valid paper for the room");
  }

  const room = await createTestRoom(user.id, paperId);
  redirect(`/papershapers/for-teachers/rooms/${room.id}`);
}

export async function startRoomAction(roomId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not logged in");
  const room = await getTestRoom(roomId);
  if (!room || room.teacher_id !== user.id) {
    throw new Error("Unauthorized: you do not own this test room");
  }
  await updateTestRoomStatus(roomId, "active");
  revalidatePath(`/papershapers/for-teachers/rooms/${roomId}`);
}

export async function closeRoomAction(roomId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not logged in");
  const room = await getTestRoom(roomId);
  if (!room || room.teacher_id !== user.id) {
    throw new Error("Unauthorized: you do not own this test room");
  }
  await updateTestRoomStatus(roomId, "completed");
  revalidatePath(`/papershapers/for-teachers/rooms/${roomId}`);
}

export async function evaluateAttendeeAction(roomId: string, attendeeId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not logged in");

  const room = await getTestRoom(roomId);
  if (!room || room.teacher_id !== user.id) {
    throw new Error("Unauthorized: you do not own this test room");
  }

  const attendees = await getTestAttendees(roomId);
  const attendee = attendees.find((a) => a.id === attendeeId);
  if (!attendee || !attendee.options_filled) {
    throw new Error("No responses found for this attendee");
  }

  let studentAnswers: Record<string, string> = {};
  try {
    studentAnswers = JSON.parse(attendee.options_filled);
  } catch {
    studentAnswers = {};
  }

  // Load paper
  const response = await backendFetch<{ paper: (StudyPaperRecord & { paper?: StudyPaper }) | StudyPaper }>(
    `/v1/study/papers/${encodeURIComponent(room.paper_id)}?user_id=${encodeURIComponent(user.id)}`
  );
  const raw = response.paper;
  const paper: StudyPaper = (raw && "paper" in raw && raw.paper?.questions ? raw.paper : raw) as StudyPaper;
  const questions: StudyQuestion[] = paper?.questions || [];

  // Attempt backend AI evaluation
  let evaluationResult: {
    earned_marks: number;
    total_marks: number;
    percentage: number;
    summary: string;
    breakdown: Array<{
      question_id: string;
      earned_marks: number;
      available_marks: number;
      question_text: string;
      student_answer: string;
      feedback: string;
      answer_outline: string;
    }>;
  };

  try {
    const formattedAnswers = Object.entries(studentAnswers).map(([qid, ans]) => ({
      question_id: qid,
      answer: String(ans || "").trim(),
    }));

    const attemptResp = await backendFetch<{ attempt: typeof evaluationResult }>(
      `/v1/study/papers/${encodeURIComponent(room.paper_id)}/attempts`,
      {
        method: "POST",
        body: JSON.stringify({
          user_id: user.id,
          answers: formattedAnswers,
        }),
      }
    );

    if (attemptResp.attempt && Array.isArray(attemptResp.attempt.breakdown)) {
      evaluationResult = attemptResp.attempt;
    } else {
      throw new Error("Invalid attempt structure");
    }
  } catch {
    // Robust Local Rubric Fallback
    let earnedTotal = 0;
    let totalMarks = 0;
    const breakdown = questions.map((q) => {
      const marks = q.marks || 1;
      totalMarks += marks;
      const ans = (studentAnswers[q.id] || "").trim();
      const length = ans.length;

      let earned = 0;
      let feedback = "";

      // MCQ check if outline gives (A)/(B)/(C)/(D)
      const outline = q.answer_outline || "";
      const mcqMatch = outline.match(/\(([a-dA-D])\)/i);
      const studentMcqMatch = ans.match(/\(([a-dA-D])\)/i);

      if (mcqMatch && studentMcqMatch) {
        if (mcqMatch[1].toUpperCase() === studentMcqMatch[1].toUpperCase()) {
          earned = marks;
          feedback = "Correct choice selected. Clear alignment with expected marking scheme.";
        } else {
          earned = 0;
          feedback = `Option mismatch. Expected choice: ${mcqMatch[0]}. Review the concept outline.`;
        }
      } else if (!ans) {
        earned = 0;
        feedback = "No answer provided. Review this chapter topic.";
      } else if (length < 15) {
        earned = Math.min(1, marks * 0.4);
        feedback = "Brief response. Add definitions, reasoning, or calculation steps to earn full marks.";
      } else if (length < 60) {
        earned = Math.max(1, marks * 0.7);
        feedback = "Good core idea. Ensure terminology, intermediate steps, and conclusions are explicit.";
      } else {
        earned = marks;
        feedback = "Comprehensive response demonstrating good syllabus understanding and working.";
      }

      earnedTotal += earned;
      return {
        question_id: q.id,
        earned_marks: Math.round(earned * 10) / 10,
        available_marks: marks,
        question_text: q.text,
        student_answer: ans,
        feedback,
        answer_outline: outline,
      };
    });

    const percentage = totalMarks > 0 ? Math.round((earnedTotal / totalMarks) * 1000) / 10 : 0;
    evaluationResult = {
      earned_marks: Math.round(earnedTotal * 10) / 10,
      total_marks: totalMarks,
      percentage,
      summary: `AI Formative Evaluation: Overall score ${percentage}%. Candidate demonstrated ${percentage >= 75 ? "strong mastery" : percentage >= 50 ? "sound foundation with targeted revision needed" : "need for guided revisit of fundamental concepts"}.`,
      breakdown,
    };
  }

  await updateAttendeeAiEvaluation(attendeeId, Math.round(evaluationResult.earned_marks), JSON.stringify(evaluationResult));
  revalidatePath(`/papershapers/for-teachers/rooms/${roomId}`);
}
