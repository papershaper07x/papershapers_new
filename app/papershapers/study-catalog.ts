export type CurriculumSubject = { board: string; subject: string; chapters: string[] };
export type CurriculumClass = { grade: string; class_label: string; subjects: CurriculumSubject[] };
export type CurriculumCatalog = { source: string; classes: CurriculumClass[] };
