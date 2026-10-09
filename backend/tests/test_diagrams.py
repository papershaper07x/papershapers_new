import unittest
from backend.app.diagrams import validate_diagram
from backend.app.schemas import StudyPaperRequest, StudyAttemptRequest
from backend.app.study import _normalise_generated_paper, _fallback_attempt_score, _validated_attempt_score


class DiagramTests(unittest.TestCase):
    def test_supported_and_invalid_specifications(self):
        valid = {"version": 1, "kind": "circuit", "layout": "series", "source_label": "12 V", "components": [{"kind": "capacitor", "label": "2 uF"}], "description": "Series capacitor."}
        validate_diagram(None)
        validate_diagram(valid)
        validate_diagram({"version": 1, "kind": "uniform-field", "direction": "right", "left_label": "+", "right_label": "-", "description": "Field points right."})
        for changes in [{"version": 2}, {"layout": "invalid"}, {"components": []}, {"components": [{"kind": "script", "label": "x"}]}, {"description": "x" * 161}]:
            with self.assertRaises(ValueError):
                validate_diagram({**valid, **changes})
        with self.assertRaises(ValueError):
            validate_diagram({"version": 1, "kind": "flow", "description": "Broken", "nodes": [{"id": "A", "label": "A"}], "edges": [{"from": "A", "to": "missing"}]})

    def test_section_normalization_preserves_diagram(self):
        diagram = {"version": 1, "kind": "uniform-field", "direction": "right", "left_label": "+", "right_label": "-", "description": "Field points right."}
        request = StudyPaperRequest(user_id="test", grade="10", subject="Science", chapters=[], paper_size="half")
        paper = _normalise_generated_paper({"sections": [{"questions": [{"id": "Q1", "text": "Direction?", "marks": 1, "diagram": diagram}]}]}, request)
        self.assertEqual(paper["questions"][0]["diagram"], diagram)

    def test_review_preserves_original_diagram(self):
        diagram = {"version": 1, "kind": "uniform-field", "direction": "right", "left_label": "+", "right_label": "-", "description": "Field points right."}
        paper = {"questions": [{"id": "Q1", "marks": 1, "text": "Direction?", "diagram": diagram, "answer_outline": "Right"}]}
        fallback = _fallback_attempt_score(paper, StudyAttemptRequest(user_id="test", answers=[]))
        review = _validated_attempt_score({"breakdown": [{"question_id": "Q1", "earned_marks": 0, "diagram": {"kind": "wrong"}}]}, fallback, paper, "real")
        self.assertEqual(review["breakdown"][0]["diagram"], diagram)
