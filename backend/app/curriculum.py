from __future__ import annotations

import csv
import re
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

csv.field_size_limit(sys.maxsize)


def _normal(value: str) -> str:
    return " ".join(value.casefold().split())


def _grade(class_label: str) -> str | None:
    match = re.search(r"\d+", class_label)
    return match.group(0) if match else None


def _is_learning_chapter(chapter: str) -> bool:
    value = _normal(chapter)
    return bool(value) and "mock paper" not in value and "sample paper" not in value


@lru_cache(maxsize=4)
def _read_rows(path_value: str) -> tuple[dict[str, str], ...]:
    path = Path(path_value)
    if not path.exists():
        raise FileNotFoundError(f"Study curriculum source is unavailable: {path}")
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = [
            {key: (value or "").strip() for key, value in row.items()}
            for row in reader
            if row.get("Class") and row.get("Subject") and row.get("Chapter")
        ]
    if not rows:
        raise ValueError("Study curriculum source has no usable class, subject, and chapter rows")
    return tuple(rows)


def catalog(path: Path) -> dict[str, Any]:
    groups: dict[tuple[str, str, str], list[str]] = {}
    labels: dict[str, str] = {}
    for row in _read_rows(str(path)):
        if not _is_learning_chapter(row["Chapter"]):
            continue
        grade = _grade(row["Class"])
        if grade not in {"9", "10", "11", "12"}:
            continue
        labels[grade] = row["Class"]
        key = (grade, row.get("Board", "CBSE") or "CBSE", row["Subject"])
        groups.setdefault(key, []).append(row["Chapter"])
    classes = []
    for grade in ("9", "10", "11", "12"):
        subjects = []
        for (row_grade, board, subject), chapters in sorted(groups.items(), key=lambda item: (item[0][0], item[0][2])):
            if row_grade != grade:
                continue
            subjects.append({"board": board, "subject": subject, "chapters": sorted(set(chapters), key=str.casefold)})
        if subjects:
            classes.append({"grade": grade, "class_label": labels.get(grade, f"Class {grade}"), "subjects": subjects})
    return {"source": path.name, "classes": classes}


def validate_selection(path: Path, board: str, grade: str, subject: str, chapters: list[str]) -> dict[str, Any]:
    data = catalog(path)
    grade_entry = next((item for item in data["classes"] if item["grade"] == grade), None)
    if grade_entry is None:
        raise ValueError(f"Class {grade} is not available in the installed curriculum source")
    subject_entry = next((item for item in grade_entry["subjects"] if _normal(item["subject"]) == _normal(subject) and _normal(item["board"]) == _normal(board)), None)
    if subject_entry is None:
        raise ValueError(f"{subject} is not available for Class {grade} in the installed curriculum source")
    known = {_normal(chapter): chapter for chapter in subject_entry["chapters"]}
    invalid = [chapter for chapter in chapters if _normal(chapter) not in known]
    if invalid:
        raise ValueError("Selected chapters are not available for this class and subject")
    return {"class_label": grade_entry["class_label"], "subject": subject_entry["subject"], "chapters": [known[_normal(chapter)] for chapter in chapters]}


def context_for_selection(path: Path, board: str, grade: str, subject: str, chapters: list[str], limit_per_chapter: int = 3500, total_limit: int = 14000) -> str:
    selected = {_normal(chapter) for chapter in chapters}
    parts: list[str] = []
    for row in _read_rows(str(path)):
        if not _is_learning_chapter(row["Chapter"]) or _grade(row["Class"]) != grade or _normal(row.get("Board", "CBSE")) != _normal(board) or _normal(row["Subject"]) != _normal(subject) or _normal(row["Chapter"]) not in selected:
            continue
        body = " ".join(row.get("File_Data", "").split())
        if body:
            parts.append(f"Chapter: {row['Chapter']}\nApproved local study context: {body[:limit_per_chapter]}")
        if sum(len(part) for part in parts) >= total_limit:
            break
    return "\n\n".join(parts)[:total_limit]


def paper_guidance_for_selection(path: Path, board: str, grade: str, subject: str, limit: int = 9000) -> str:
    """Return local paper-setting guidance without exposing it as a selectable chapter."""
    for row in _read_rows(str(path)):
        if (
            _grade(row["Class"]) == grade
            and _normal(row.get("Board", "CBSE")) == _normal(board)
            and _normal(row["Subject"]) == _normal(subject)
            and _normal(row["Chapter"]) == "mock paper"
        ):
            return " ".join(row.get("File_Data", "").split())[:limit]
    return ""
