const safeDestinations = new Set([
  "/papershapers/dashboard",
  "/papershapers/tests/new",
  "/papershapers/for-teachers",
  "/papershapers/for-teachers/rooms",
  "/papershapers/journal/new",
  "/perspective/dashboard",
  "/noticeboard/dashboard",
]);

export function safeAuthDestination(value: string | null | undefined) {
  return value && safeDestinations.has(value) ? value : "/papershapers/dashboard";
}
