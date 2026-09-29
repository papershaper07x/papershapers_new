export type CurriculumSubject = { board: string; subject: string; chapters: string[] };
export type CurriculumClass = { grade: "9" | "10" | "11" | "12"; class_label: string; subjects: CurriculumSubject[] };
export type CurriculumCatalog = { source: string; classes: CurriculumClass[] };
