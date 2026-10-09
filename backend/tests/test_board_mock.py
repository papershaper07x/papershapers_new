import copy
import csv
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from backend.app.board_profiles import CHAPTERS, UNITS, profile, slots, chapter_number
from backend.app.board_mock import validate_question, sources, generate_board_mock, selected_response
from backend.app.study import student_paper
from backend.app.schemas import StudyPaperRequest


def fixture_question(slot):
    def body(text, marks):
        return {"text": text, "marks": marks, "answer_outline": "Test fixture solution", "marking_scheme": [{"text": "Test fixture step", "marks": marks}]}
    question = {**slot, **body(f"TEST FIXTURE {slot['id']}", slot["marks"])}
    if slot["type"] in ("mcq", "assertion-reason"):
        question.update(options=["A", "B", "C", "D"], correct_option=0)
    if slot["type"] == "assertion-reason":
        question.update(assertion="Test assertion", reason="Test reason")
    if slot["choice"]:
        question["alternative"] = body(f"Test OR {slot['id']}", slot["marks"])
    if slot["part_marks"]:
        question["parts"] = [body(f"Test part {slot['id']} {i}", marks) for i, marks in enumerate(slot["part_marks"])]
        if slot["part_choice"]:
            question["parts"][2]["alternative"] = body(f"Test subpart OR {slot['id']}", 2)
    if slot.get("diagram_required"):
        question["diagram"] = {"version": 1, "kind": "plot", "description": "Test schematic, not to scale", "points": [{"id": "A", "label": "A", "x": 100, "y": 200}, {"id": "B", "label": "B", "x": 300, "y": 60}], "lines": [{"from": "A", "to": "B"}]}
    return question


class BoardContractTests(unittest.TestCase):
    def test_diagram_examples_follow_their_own_contract(self):
        from backend.app.diagrams import DIAGRAM_GUIDANCE, validate_diagram
        validate_diagram(DIAGRAM_GUIDANCE["plot"])

    def test_profiles_have_exact_totals_coverage_and_different_choices(self):
        for grade in ("10", "12"):
            plan = slots(grade)
            self.assertEqual(len(plan), 38)
            self.assertEqual(sum(s["marks"] for s in plan), 80)
            self.assertEqual({s["chapter"] for s in plan}, set(CHAPTERS[grade]))
            for name, marks, _ in UNITS[grade]:
                self.assertEqual(sum(s["marks"] for s in plan if s["unit"] == name), marks)
            self.assertEqual(sum(s["choice"] for s in plan), 6 if grade == "10" else 7)
            self.assertEqual(sum(s["part_choice"] for s in plan), 3 if grade == "10" else 2)
        with self.assertRaises(ValueError):
            profile("11", "Mathematics", "CBSE", "2026-27")

    def test_rejects_bad_marks_keys_missing_figures_choices_and_duplicate_text(self):
        slot = next(s for s in slots("10") if s.get("diagram_required"))
        good = fixture_question(slot)
        validate_question(good, slot, set())
        for key, value in (("marks", 2), ("correct_option", 4), ("diagram", None), ("options", ["A"] * 4), ("marking_scheme", [{"text": "step", "marks": 2}]), ("alternative", {"text": "unexpected"})):
            bad = copy.deepcopy(good); bad[key] = value
            with self.assertRaises(ValueError, msg=key):
                validate_question(bad, slot, set())
        with self.assertRaises(ValueError):
            validate_question(good, slot, {good["text"].lower()})

    def test_part_two_is_not_confused_with_restarted_file_numbers(self):
        self.assertEqual(chapter_number("Chapter 1: Mathematics Part-II", "INTEGRALS 7.1 Introduction", "12"), 7)
        with self.assertRaises(ValueError):
            chapter_number("Chapter 1: Mathematics Part-II", "missing heading", "12")

    def test_recursive_redaction_and_internal_choice_selection(self):
        q = fixture_question(next(s for s in slots("10") if s["id"] == "Q36"))
        public = json.dumps(student_paper(q))
        for key in ("answer_outline", "marking_scheme", "correct_option"):
            self.assertNotIn(key, public)
        raw = json.dumps({"selection": "primary", "parts": ["1", "2", json.dumps({"selection": "alternative", "answer": "3"})]})
        selected, answer = selected_response(q, raw)
        self.assertNotIn("alternative", selected["parts"][2])
        self.assertIn("Test subpart OR", selected["parts"][2]["text"])
        self.assertIn("3", answer)
        with self.assertRaises(ValueError):
            selected_response(q, json.dumps({"selection": "alternative", "answer": "both"}))


class BoardAssemblyTests(unittest.IsolatedAsyncioTestCase):
    async def test_batch_repair_and_complete_assembly_for_both_grades(self):
        for grade in ("10", "12"):
            with tempfile.TemporaryDirectory() as temp:
                path = Path(temp) / "fixture.csv"
                with path.open("w", encoding="utf-8", newline="") as f:
                    writer = csv.DictWriter(f, fieldnames=["Class", "Board", "Subject", "Chapter", "File_Data"]); writer.writeheader()
                    for i, chapter in enumerate(CHAPTERS[grade], 1):
                        writer.writerow({"Class": grade, "Board": "CBSE", "Subject": "Mathematics", "Chapter": f"Chapter {i}", "File_Data": f"{i}.1 Introduction " + chapter * 100})
                class FixtureRouter:
                    settings = SimpleNamespace(study_curriculum_csv_path=path)
                    calls = 0
                    async def generate_json(self, **args):
                        data = json.loads(args["prompt"])
                        if "source_chunks" in data and "questions" in data:
                            return SimpleNamespace(provider="fixture", value={"checks": [{"id": q["id"], "valid": True} for q in data["questions"]]})
                        self.calls += 1
                        values = [fixture_question(slot) for slot in data["slots"]]
                        if self.calls == 1:
                            values[0]["marks"] = 99
                        return SimpleNamespace(provider="fixture", value={"questions": values})
                router = FixtureRouter()
                with path.open(encoding="utf-8") as source_file:
                    rows = tuple(csv.DictReader(source_file))
                with patch("backend.app.board_mock._read_rows", return_value=rows):
                    paper = await generate_board_mock(router, StudyPaperRequest(user_id="test", grade=grade, subject="Mathematics", mode="board-mock"))
                self.assertEqual(len(paper["questions"]), 38)
                self.assertEqual(router.calls, 11)
                self.assertEqual(paper["exam_profile"]["review_status"], "educator-review-pending")
                path.write_text("Class,Board,Subject,Chapter,File_Data\n", encoding="utf-8")
                # Use a new filename because the source loader caches by path.
                empty = Path(temp) / "empty.csv"; empty.write_text(path.read_text(), encoding="utf-8")
                with patch("backend.app.board_mock._read_rows", return_value=[]), self.assertRaises(ValueError):
                    sources(empty, grade)
