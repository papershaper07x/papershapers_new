"use server";
import { getTestRoom, getTestAttendees, joinTestRoom, submitTestAttempt } from "../../../../db/service";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function joinRoomAction(roomId: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const rollNumber = (formData.get("rollNumber") as string)?.trim();
  if (!name || !rollNumber) return;

  const room = await getTestRoom(roomId);
  if (!room) throw new Error("Test room not found");
  if (room.status === "completed") throw new Error("This test session has already concluded");

  // Check if student with same roll number already joined this room
  const attendees = await getTestAttendees(roomId);
  const existing = attendees.find((a) => a.roll_number.toLowerCase() === rollNumber.toLowerCase());

  const attendee = existing ?? (await joinTestRoom(roomId, name, rollNumber));
  const cookieStore = await cookies();
  cookieStore.set(`attendeeId_${roomId}`, attendee.id, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
  });
  revalidatePath(`/papershapers/room/${roomId}`);
  revalidatePath(`/papershapers/for-teachers/rooms/${roomId}`);
}

export async function submitTestAction(roomId: string, attendeeId: string, answers: Record<string, string>) {
  const cookieStore = await cookies();
  const sessionAttendeeId = cookieStore.get(`attendeeId_${roomId}`)?.value;
  if (!sessionAttendeeId || sessionAttendeeId !== attendeeId) {
    throw new Error("Unauthorized submission session");
  }

  const room = await getTestRoom(roomId);
  if (!room) throw new Error("Test room not found");

  await submitTestAttempt(attendeeId, answers, null);
  revalidatePath(`/papershapers/for-teachers/rooms/${roomId}`);
  revalidatePath(`/papershapers/room/${roomId}`);
  return { success: true };
}
