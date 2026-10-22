export const noticeCategories = ["Food", "Offers", "Events", "Services", "Classes", "Community", "Ideas"] as const;
export function validateNotice(value: unknown, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Enter a notice.");
  const source = value as Record<string, unknown>;
  const fields = ["title", "description", "place", "area", "category", "expiresAt"];
  if (Object.keys(source).some(key => !fields.includes(key))) throw new Error("Images and attachments are not accepted.");
  const result: Record<string, string> = {};
  for (const [key, min, max] of [["title", 5, 100], ["description", 20, 2000], ["place", 2, 100], ["area", 2, 100], ["category", 2, 30], ["expiresAt", 10, 30]] as const) {
    const text = source[key];
    if (typeof text !== "string" || text.trim().length < min || text.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new Error(`Check ${key}: ${min}–${max} characters required.`);
    result[key] = text.trim();
  }
  if (!noticeCategories.includes(result.category as typeof noticeCategories[number])) throw new Error("Choose a supported category.");
  const expiry = Date.parse(result.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now || expiry > now + 30 * 86400000) throw new Error("Expiry must be in the next 30 days.");
  result.expiresAt = new Date(expiry).toISOString();
  return result;
}

export function displayNoticeArea(area:string,city?:string|null,state?:string|null) {
 return [area,...(city&&!area.toLowerCase().includes(city.toLowerCase())?[city]:[]),...(state?[state]:[])].join(', ');
}
