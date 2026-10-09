import { cache } from "react";
import { backendFetch } from "../../lib/backend";
import type { CurriculumCatalog } from "../papershapers/study-catalog";

export const getSyllabusCatalog = cache(() => backendFetch<CurriculumCatalog>("/v1/study/catalog"));

export function gradeFromSlug(slug: string) {
  return /^class-([1-9]|1[0-2])$/.exec(slug)?.[1] ?? null;
}

export function subjectSlug(subject: string) {
  return subject.toLowerCase().trim().replace(/\s+/g, "-");
}
