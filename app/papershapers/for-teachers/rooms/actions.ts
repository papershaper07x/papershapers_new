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
import { withinRequestLimit } from "../../../../lib/request-limit";
import { backendFetch } from "../../../../lib/backend";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { StudyPaperRecord } from "../../study-types";

export async function declareTeacherRoleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not logged in");
  const institution = (formData.get("institution") as string)?.trim().slice(0, 120) ?? "";
  await setUserRole(user.id, "teacher", institution, false);
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

  let paperId = String(formData.get("paperId") || formData.get("customPaperId") || "").trim();

  // If created via catalog selection (grade, subject, paperSize)
  const grade = formData.get("grade") as string;
  const subject = formData.get("subject") as string;
  const paperSize = (formData.get("paperSize") as string) || "half";

  if (!paperId && grade && subject) {
    if (!await withinRequestLimit("study-generation", user.id, 6, 600)) throw new Error("Please wait before generating another paper.");
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
      throw new Error("The paper could not be generated. Try again or explicitly choose a saved paper.");
    }
  }

  if (!paperId) {
    throw new Error("Please select or specify a valid paper for the room");
  }

  await backendFetch(`/v1/study/papers/${encodeURIComponent(paperId)}?user_id=${encodeURIComponent(user.id)}`);
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
  if (room.status !== "waiting") throw new Error("Only a waiting room can be started.");
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
  if (!await withinRequestLimit("study-assessment", user.id, 60, 600)) throw new Error("Please wait before requesting another assessment.");

  let studentAnswers: Record<string, string> = {};
  try {
    studentAnswers = JSON.parse(attendee.options_filled);
  } catch {
    studentAnswers = {};
  }

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
    throw new Error("Assessment is unavailable. Responses are saved; try again later or review them yourself. No estimated marks have been assigned.");
  }

  await updateAttendeeAiEvaluation(attendeeId, Math.round(evaluationResult.earned_marks), JSON.stringify(evaluationResult));
  revalidatePath(`/papershapers/for-teachers/rooms/${roomId}`);
}
