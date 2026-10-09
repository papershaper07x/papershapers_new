"""Versioned CBSE Maths paper contracts; question correctness needs educator review."""
import re

SESSION = "2026-27"
TOPICS = {
    "Real Numbers": ["prime factorisation", "irrationality"], "Polynomials": ["zeros and coefficients of quadratic polynomials"],
    "Pair of Linear Equations in Two Variables": ["consistency and solutions of two linear equations"], "Quadratic Equations": ["real roots and discriminant"], "Arithmetic Progressions": ["nth term and finite sum"],
    "Triangles": ["similarity and proportionality"], "Coordinate Geometry": ["distance and internal section formula"], "Introduction to Trigonometry": ["ratios and identities"], "Some Applications of Trigonometry": ["heights and distances"],
    "Circles": ["tangents and radius"], "Areas Related to Circles": ["sector and segment areas"], "Surface Areas and Volumes": ["combined solids"], "Statistics": ["grouped mean median and mode"],
    "Probability": ["probability"], "Relations and Functions": ["equivalence relations and one-one onto functions"], "Inverse Trigonometric Functions": ["domain range and principal values"],
    "Matrices": ["matrix operations and inverse"], "Determinants": ["determinants and linear systems"], "Continuity and Differentiability": ["continuity chain rule and implicit differentiation"],
    "Applications of Derivatives": ["rate of change increasing decreasing and extrema"], "Integrals": ["substitution parts and definite integrals"], "Applications of Integrals": ["area under standard curves"],
    "Differential Equations": ["order degree and first order solutions"], "Vector Algebra": ["dot and cross products"], "Three Dimensional Geometry": ["lines angles and shortest distance"], "Linear Programming": ["graphical feasible region and optimisation"],
}
CHAPTERS = {
    "10": ["Real Numbers", "Polynomials", "Pair of Linear Equations in Two Variables", "Quadratic Equations", "Arithmetic Progressions", "Triangles", "Coordinate Geometry", "Introduction to Trigonometry", "Some Applications of Trigonometry", "Circles", "Areas Related to Circles", "Surface Areas and Volumes", "Statistics", "Probability"],
    "12": ["Relations and Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants", "Continuity and Differentiability", "Applications of Derivatives", "Integrals", "Applications of Integrals", "Differential Equations", "Vector Algebra", "Three Dimensional Geometry", "Linear Programming", "Probability"],
}
# Unit marks are from the current curriculum; chapter allocation is our template.
UNITS = {
    "10": [("Number Systems", 6, [1]), ("Algebra", 20, [2, 3, 4, 5]), ("Coordinate Geometry", 6, [7]), ("Geometry", 15, [6, 10]), ("Trigonometry", 12, [8, 9]), ("Mensuration", 10, [11, 12]), ("Statistics and Probability", 11, [13, 14])],
    "12": [("Relations and Functions", 8, [1, 2]), ("Algebra", 10, [3, 4]), ("Calculus", 35, [5, 6, 7, 8, 9]), ("Vectors and Three-dimensional Geometry", 14, [10, 11]), ("Linear Programming", 5, [12]), ("Probability", 8, [13])],
}


def profile(grade: str, subject: str, board: str, session: str) -> dict:
    if grade not in CHAPTERS or subject.casefold() not in ("mathematics", "maths", "mathematics standard") or board.upper() != "CBSE" or session != SESSION:
        raise ValueError("Board mock supports CBSE 2026-27 Class 10 Mathematics Standard and Class 12 Mathematics (041) only")
    return {"id": f"cbse-{SESSION}-{grade}-041-v1", "session": SESSION, "subject_code": "041", "label": "Mathematics Standard" if grade == "10" else "Mathematics", "grade": grade, "total_marks": 80, "time_minutes": 180,
            "sample_url": f"https://cbseacademic.nic.in/web_material/SQP/Class{'X' if grade == '10' else 'XII'}_2026_27/{'MathsStandard' if grade == '10' else 'Maths'}-SQP.pdf",
            "curriculum_url": f"https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart{'1/Maths_SecP1X' if grade == '10' else '2/Maths_SecP2'}_2026-27.pdf",
            "review_status": "educator-review-pending"}


def slots(grade: str) -> list[dict]:
    result = []
    choices = {21, 22, 26, 27, 32, 33} | ({28} if grade == "12" else set())
    for n in range(1, 39):
        section, marks, kind = ("A", 1, "mcq" if n <= 18 else "assertion-reason") if n <= 20 else ("B", 2, "very-short-answer") if n <= 25 else ("C", 3, "short-answer") if n <= 31 else ("D", 5, "long-answer") if n <= 35 else ("E", 4, "case-study")
        result.append({"id": f"Q{n}", "section": section, "marks": marks, "type": kind, "choice": n in choices, "part_marks": [1, 1, 2] if section == "E" else [], "part_choice": section == "E" and (grade == "10" or n < 38)})
    remaining = [unit[1] for unit in UNITS[grade]]
    used = [0] * len(remaining)
    chapter_unit = {n: index for index, unit in enumerate(UNITS[grade]) for n in unit[2]}
    # Reserve one objective slot per chapter, then fill the exact unit budgets.
    for n, slot in enumerate(result[:len(CHAPTERS[grade])], 1):
        unit = chapter_unit[n]
        slot.update(chapter=CHAPTERS[grade][n - 1], unit=UNITS[grade][unit][0])
        remaining[unit] -= 1
        used[unit] += 1
    for slot in sorted((item for item in result if "chapter" not in item), key=lambda item: -item["marks"]):
        unit = max((i for i, budget in enumerate(remaining) if budget >= slot["marks"]), key=lambda i: remaining[i])
        chapter = UNITS[grade][unit][2][used[unit] % len(UNITS[grade][unit][2])]
        slot.update(chapter=CHAPTERS[grade][chapter - 1], unit=UNITS[grade][unit][0])
        remaining[unit] -= slot["marks"]
        used[unit] += 1
    assert sum(remaining) == 0
    for item in result:
        item["topic"] = TOPICS[item["chapter"]][int(item["id"][1:]) % len(TOPICS[item["chapter"]])]
    next(item for item in result if item["chapter"] == ("Triangles" if grade == "10" else "Linear Programming"))["diagram_required"] = True
    return result


def chapter_number(title: str, text: str, grade: str) -> int:
    match = re.search(r"\b(\d{1,2})\.1\s+Introduction", text[:2500], re.I)
    if not match and grade == "10":
        match = re.search(r"Chapter\s+(\d+)", title, re.I)
    if not match:
        raise ValueError(f"Cannot resolve NCERT chapter identity: {title}")
    return int(match[1])
