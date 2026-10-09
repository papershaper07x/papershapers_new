"use server";
import { getTestRoom, getTestAttendees, joinTestRoom, submitTestAttempt } from "../../../../db/service";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { backendFetch } from "../../../../lib/backend";
import type { StudyPaperRecord } from "../../study-types";

export async function joinRoomAction(roomId: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const rollNumber = (formData.get("rollNumber") as string)?.trim();
  if (!name || !rollNumber || name.length > 80 || rollNumber.length > 40) return { error: "Enter a name and student ID within the displayed limits." };

  const room = await getTestRoom(roomId);
  if (!room) return { error: "Test room not found." };
  if (room.status === "completed") return { error: "This test session has already concluded." };

  // Check if student with same roll number already joined this room
  const attendees = await getTestAttendees(roomId);
  const existing = attendees.find((a) => a.roll_number.toLowerCase() === rollNumber.toLowerCase());

  const cookieStore = await cookies();
  if (existing && cookieStore.get(`attendeeId_${roomId}`)?.value !== existing.id) {
    return { error: "This student ID has already joined. Use the original browser or ask your teacher for a different ID." };
  }
  const attendee = existing ?? (await joinTestRoom(roomId, name, rollNumber));
  cookieStore.set(`attendeeId_${roomId}`, attendee.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
  });
  revalidatePath(`/papershapers/room/${roomId}`);
  revalidatePath(`/papershapers/for-teachers/rooms/${roomId}`);
  return { success: true };
}

export async function submitTestAction(roomId: string, attendeeId: string, answers: Record<string, string>) {
  const cookieStore = await cookies();
  const sessionAttendeeId = cookieStore.get(`attendeeId_${roomId}`)?.value;
  if (!sessionAttendeeId || sessionAttendeeId !== attendeeId) {
    throw new Error("Unauthorized submission session");
  }

  const room = await getTestRoom(roomId);
  if (!room) throw new Error("Test room not found");
  if (room.status !== "active") throw new Error("This room is not accepting submissions. Your draft remains on this device.");
  const attendee = (await getTestAttendees(roomId)).find((item) => item.id === attendeeId);
  if (!attendee) throw new Error("Student session not found in this room.");
  if (attendee.status === "completed") return { success: true };
  const { paper } = await backendFetch<{ paper: StudyPaperRecord }>(`/v1/study/papers/${encodeURIComponent(room.paper_id)}?user_id=${encodeURIComponent(room.teacher_id)}`);
  const knownIds = new Set(paper.paper.questions.map((question) => question.id));
  if (!answers || typeof answers !== "object" || Array.isArray(answers) || Object.keys(answers).length > 80 || Object.entries(answers).some(([id, answer]) => !knownIds.has(id) || typeof answer !== "string" || answer.length > 8000)) {
    throw new Error("The responses do not match this paper or exceed its answer limits.");
  }

  const recorded = await submitTestAttempt(attendeeId, roomId, answers, null);
  if (!recorded && !(await getTestAttendees(roomId)).some((item) => item.id === attendeeId && item.status === "completed")) throw new Error("The room closed before submission. Your draft remains on this device.");
  revalidatePath(`/papershapers/for-teachers/rooms/${roomId}`);
  revalidatePath(`/papershapers/room/${roomId}`);
  return { success: true };
}
