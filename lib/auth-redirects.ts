const safeDestinations = new Set([
  "/papershapers/dashboard",
  "/papershapers/tests/new",
  "/papershapers/for-teachers",
  "/papershapers/for-teachers/rooms",
  "/papershapers/journal/new",
  "/noticeboard/dashboard",
  "/noticeboard",
  "/noticeboard/post",
]);

export function safeAuthDestination(value: string | null | undefined) {
  if (value && /^\/noticeboard\/notices\/[a-zA-Z0-9-]{1,100}$/.test(value)) return value;
  if (value && /^\/noticeboard\/report\?id=[a-zA-Z0-9-]{1,100}$/.test(value)) return value;
  return value && safeDestinations.has(value) ? value : "/papershapers/dashboard";
}
