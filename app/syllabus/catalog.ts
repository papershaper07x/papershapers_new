import { cache } from "react";
import { backendFetch } from "../../lib/backend";
import type { CurriculumCatalog } from "../papershapers/study-catalog";

export const getSyllabusCatalog = cache((timeoutMs=60_000) => backendFetch<CurriculumCatalog>("/v1/study/catalog",{signal:AbortSignal.timeout(timeoutMs)}));

export function gradeFromSlug(slug: string) {
  return /^class-([1-9]|1[0-2])$/.exec(slug)?.[1] ?? null;
}

export function subjectSlug(subject: string) {
  return subject.toLowerCase().trim().replace(/\s+/g, "-");
}
