import unittest
from pathlib import Path
from unittest.mock import patch

from backend.app.curriculum import catalog, context_for_selection, validate_selection
from backend.app.curriculum_titles import chapter_label


class CurriculumTitleTests(unittest.TestCase):
    def test_numbered_heading_excludes_page_headers_and_figure_captions(self):
        self.assertEqual(chapter_label("Chapter 4: Science — Carbon and its", "Science\n58\nCarbon and its\nCompounds\n4\nCHAPTER\nBody", "Science", 4), "Chapter 4: Carbon and its Compounds")
        self.assertEqual(chapter_label("Chapter 8: Science — Figure 8.1", "Science\n128\nFigure 8.1\nA figure caption ends here.\nHeredity\n8\nCHAPTER\nBody", "Science", 8), "Chapter 8: Heredity")
        self.assertEqual(chapter_label("Chapter 13: Science — Activity 13.1", "Science\n208\nActivity 13.1\nOur Environment\n13\nCHAPTER\nBody", "Science", 13), "Chapter 13: Our Environment")

    def test_unrelated_numbers_do_not_create_invented_titles(self):
        self.assertEqual(chapter_label("Chapter 8: Science — Figure 8.1", "An unrelated heading\n7\nCHAPTER", "Science", 8), "Chapter 8 (title pending review)")
        self.assertEqual(chapter_label("Quadratic Equations", "Some body text"), "Quadratic Equations")

    def test_unreviewed_book_layouts_do_not_infer_labels_from_nearby_body_text(self):
        for original, text, book, number in [
            ("Chapter 6: Math-Mela", "Measuring Length\n6\nChapter", "Math-Mela", 6),
            ("Chapter 12: Mathematics", "two seconds\n12\nChapter\nLIMITS AND DERIVATIVES", "Mathematics", 12),
            ("Chapter 1: Biotechnology", "Herbert Boyer\n1\nChapter", "Biotechnology", 1),
        ]:
            self.assertEqual(chapter_label(original, text, book, number), original)

    @patch("backend.app.curriculum._read_rows")
    def test_natural_order_and_legacy_selection_keep_matching_source_context(self, read_rows):
        read_rows.return_value = tuple({"Class": "Class 10", "Board": "CBSE", "Subject": "Science", "Chapter": old, "Chapter_Label": label, "File_Data": body} for old, label, body in [
            ("Chapter 10: Eye", "Chapter 10: Eye", "Light and vision"),
            ("Chapter 2: Acids", "Chapter 2: Acids", "Acids react"),
            ("Chapter 1: Science — Reactions", "Chapter 1: Reactions", "Reaction context retained"),
        ])
        path = Path("synthetic.csv")
        chapters = catalog(path)["classes"][0]["subjects"][0]["chapters"]
        self.assertEqual(chapters, ["Chapter 1: Reactions", "Chapter 2: Acids", "Chapter 10: Eye"])
        selected = validate_selection(path, "CBSE", "10", "Science", ["Chapter 1: Science — Reactions"])
        self.assertEqual(selected["chapters"], ["Chapter 1: Reactions"])
        for names in [selected["chapters"], ["Chapter 1: Science — Reactions"]]:
            context = context_for_selection(path, "CBSE", "10", "Science", names)
            self.assertIn("Reaction context retained", context)
            self.assertNotIn("Acids react", context)
