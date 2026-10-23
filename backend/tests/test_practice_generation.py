import asyncio
import json
import unittest
from dataclasses import replace
from unittest.mock import AsyncMock, patch

from backend.app.config import Settings
from backend.app.llm_router import GenerationResult, GenerationUnavailableError, GenerationConfigurationError, LLMRouter
from backend.app.schemas import StudyPaperRequest
from backend.app.study import _blueprint, _fallback_paper, _generate_practice_batches, _validate_practice_content


class PracticeGenerationTests(unittest.IsolatedAsyncioTestCase):
    async def test_complete_papers_have_exact_marks_and_no_oversized_response(self):
        for size in ('half', 'full'):
            request = StudyPaperRequest(user_id='test', grade='11', subject='Computer Science', chapters=['Computer systems'], paper_size=size)
            router = LLMRouter(replace(Settings.from_env(), allow_mock_fallback=False))
            prompts = []
            async def generate(**kwargs):
                prompt = json.loads(kwargs['prompt'])
                prompts.append(prompt)
                for slot, shape in zip(prompt['slots'], prompt['required_shape']['questions']):
                    if slot['type'] == 'case-study':
                        self.assertEqual([part['marks'] for part in shape['parts']], [1, 1, 2])
                rows = []
                for slot in prompt['slots']:
                    row = {'id': slot['id'], 'text': f"{slot['id']}: Explain the role of a computer's processor.", 'answer_outline': 'It executes instructions and coordinates operations.'}
                    if slot['type'] == 'mcq':
                        row['options'] = ['CPU', 'Keyboard', 'Monitor', 'Mouse']
                    if slot['type'] == 'case-study':
                        row['parts'] = [{'text': f'Explain processing, part {i}.', 'marks': mark, 'answer_outline': 'The CPU executes instructions.'} for i, mark in enumerate((1, 1, 2))]
                    rows.append(row)
                return GenerationResult(kwargs['transform']({'questions': rows}), 'gemini', [])
            router.generate_json = AsyncMock(side_effect=generate)
            blueprint = _blueprint(size)
            paper, provider = await _generate_practice_batches(router, request, blueprint, _fallback_paper(request, blueprint), 'Local curriculum', 'School instructions')
            self.assertEqual(sum(q['marks'] for q in paper['questions']), blueprint['total_marks'])
            self.assertEqual(len(paper['questions']), sum(s['count'] for s in blueprint['sections']))
            self.assertTrue(all(len(p['slots']) <= 7 for p in prompts))
            self.assertEqual(len({q['id'] for q in paper['questions']}), len(paper['questions']))
            self.assertFalse(paper['is_demo'])
            self.assertEqual(provider, 'gemini')

    async def test_incomplete_batch_is_rejected_before_publication(self):
        request = StudyPaperRequest(user_id='test', grade='11', subject='Computer Science', chapters=['Computer systems'])
        router = LLMRouter(Settings.from_env())
        async def missing(**kwargs):
            return GenerationResult(kwargs['transform']({'questions': []}), 'gemini', [])
        router.generate_json = AsyncMock(side_effect=missing)
        blueprint = _blueprint('half')
        with self.assertRaises(ValueError):
            await _generate_practice_batches(router, request, blueprint, _fallback_paper(request, blueprint), 'Local curriculum', '')

    async def test_retry_budget_reaches_second_vendor_despite_multiple_first_vendor_keys(self):
        router = LLMRouter(replace(Settings.from_env(), allow_mock_fallback=False, provider_order=('gemini', 'groq'), gemini_api_keys=('one', 'two', 'three'), groq_api_keys=('four',), llm_max_attempts=2))
        router._request_provider = AsyncMock(side_effect=[ValueError('invalid response'), '{"valid":true}'])
        result = await router.generate_json(system='s', prompt='p', fallback={})
        self.assertEqual(result.provider, 'groq')
        self.assertEqual([c.args[0] for c in router._request_provider.await_args_list], ['gemini', 'groq'])

    def test_subpart_and_choice_marks_and_diagrams_are_validated(self):
        question = {'text': 'Read the case.', 'marks': 4, 'answer_outline': 'Solution', 'parts': [{'text': 'Part a', 'marks': 1, 'answer_outline': 'A'}, {'text': 'Part b', 'marks': 3, 'answer_outline': 'B'}]}
        _validate_practice_content(question)
        question['parts'][1]['marks'] = 2
        with self.assertRaises(ValueError):
            _validate_practice_content(question)
        for extra in ({'diagram': {'version': 1, 'kind': 'html'}}, {'alternative': {'text': 'OR', 'marks': 2, 'answer_outline': 'Solution'}}):
            with self.assertRaises(ValueError):
                _validate_practice_content({'text': 'Question', 'marks': 4, 'answer_outline': 'Answer', **extra})

    async def test_missing_budget_schema_is_not_retried_as_provider_failure(self):
        class MissingTable(Exception):
            sqlstate = "42P01"
        router = LLMRouter(replace(Settings.from_env(), allow_mock_fallback=False, provider_order=("gemini", "groq"), gemini_api_keys=("test",), groq_api_keys=("test",)))
        with patch("backend.app.llm_router.reserve_provider_call", side_effect=MissingTable()) as reserve:
            with self.assertRaises(GenerationConfigurationError):
                await router.generate_json(system="s", prompt="p", fallback={})
            self.assertEqual(reserve.call_count, 1)

    def test_context_reserves_space_for_every_chapter_and_samples_later_content(self):
        from pathlib import Path
        from backend.app.curriculum import context_for_selection
        chapters = [f"Chapter {i}" for i in range(12)]
        rows = [{"Class": "Class 11", "Board": "CBSE", "Subject": "Computer Science", "Chapter": chapter, "File_Data": "Introduction " * 800 + f"Advanced example {i}"} for i, chapter in enumerate(chapters)]
        with patch("backend.app.curriculum._read_rows", return_value=rows):
            context = context_for_selection(Path("unused.csv"), "CBSE", "11", "Computer Science", chapters)
        for i, chapter in enumerate(chapters):
            self.assertIn(f"Chapter: {chapter}\n", context)
            self.assertIn(f"Advanced example {i}", context)
        self.assertLessEqual(len(context), 14000)

    async def test_groq_batches_share_a_paced_window_across_key_rotation(self):
        router = LLMRouter(replace(Settings.from_env(), groq_min_interval_seconds=60))
        now = [100.0]
        def advance(delay):
            now[0] += delay
        with patch("backend.app.llm_router.time.monotonic", side_effect=lambda: now[0]), patch("backend.app.llm_router.asyncio.sleep", new=AsyncMock(side_effect=advance)) as wait:
            await router._wait_for_groq_window()
            await router._wait_for_groq_window()
            await router._wait_for_groq_window()
            self.assertEqual([call.args[0] for call in wait.await_args_list], [60, 60])
            self.assertEqual(router._groq_last_started, 220)

    async def test_duplicate_question_text_is_rejected_even_with_distinct_ids(self):
        request = StudyPaperRequest(user_id="test", grade="11", subject="Computer Science", chapters=["Computer systems"])
        router = LLMRouter(Settings.from_env())
        async def duplicate(**kwargs):
            slots = json.loads(kwargs["prompt"])["slots"]
            self.assertIn("EXCLUSION LIST", json.loads(kwargs["prompt"])["task"])
            questions = [{"id": slot["id"], "text": "Which component executes instructions?", "answer_outline": "The CPU", "options": ["CPU", "Keyboard", "Printer", "Monitor"]} for slot in slots]
            return GenerationResult(kwargs["transform"]({"questions": questions}), "groq", [])
        router.generate_json = AsyncMock(side_effect=duplicate)
        blueprint = _blueprint("half")
        with self.assertRaisesRegex(ValueError, "Repeated question"):
            await _generate_practice_batches(router, request, blueprint, _fallback_paper(request, blueprint), "Local curriculum", "")

    async def test_failed_paper_resumes_validated_batches_without_repeating_calls(self):
        import tempfile
        from pathlib import Path
        from backend.app.database import Database
        request = StudyPaperRequest(user_id="checkpoint-owner", grade="11", subject="Computer Science", chapters=["Computer systems"], paper_size="full")
        with tempfile.TemporaryDirectory() as directory:
            database = Database(Path(directory) / "checkpoint.db")
            database.initialize()
            router = LLMRouter(Settings.from_env())
            calls = []
            fail = [True]
            async def generate(**kwargs):
                slots = json.loads(kwargs["prompt"])["slots"]
                calls.append(slots[0]["id"])
                if fail[0] and len(calls) == 2:
                    raise GenerationUnavailableError("provider interrupted")
                rows = []
                for slot in slots:
                    row = {"id": slot["id"], "text": slot["id"] + ": explain processing.", "answer_outline": "CPU executes instructions."}
                    if slot["type"] == "mcq":
                        row["options"] = ["CPU", "Keyboard", "Printer", "Monitor"]
                    if slot["type"] == "case-study":
                        row["parts"] = [{"text": f"Explain processing, part {i}", "marks": mark, "answer_outline": "CPU executes instructions."} for i, mark in enumerate((1, 1, 2))]
                    rows.append(row)
                return GenerationResult(kwargs["transform"]({"questions": rows}), "groq", [])
            router.generate_json = AsyncMock(side_effect=generate)
            blueprint = _blueprint("full")
            args = (router, request, blueprint, _fallback_paper(request, blueprint), "Local curriculum", "")
            with self.assertRaises(GenerationUnavailableError):
                await _generate_practice_batches(*args, database=database)
            fail[0] = False
            paper, _ = await _generate_practice_batches(*args, database=database)
            self.assertEqual(paper["reused_questions"], 6)
            self.assertEqual(calls.count("Q1"), 1)
            self.assertEqual(len(paper["questions"]), 31)
            self.assertEqual(sum(q["marks"] for q in paper["questions"]), 80)
            with database.connect() as db:
                cache = db.execute("SELECT paper_json FROM generated_paper_cache").fetchone()["paper_json"]
            self.assertNotIn('"user_id"', cache)

    def test_full_paper_batches_avoid_a_singleton_and_checkpoint_keys_preserve_order(self):
        from backend.app.study import _practice_batches, _practice_checkpoint_key
        self.assertEqual([len(batch) for batch in _practice_batches(list(range(31)))], [6, 6, 6, 6, 7])
        first = StudyPaperRequest(user_id="a", grade="11", subject="Computer Science", chapters=["A", "B"])
        second = first.model_copy(update={"chapters": ["B", "A"]})
        self.assertNotEqual(_practice_checkpoint_key(first, "v"), _practice_checkpoint_key(second, "v"))

    async def test_next_provider_receives_bounded_validation_feedback(self):
        router = LLMRouter(replace(Settings.from_env(), allow_mock_fallback=False, provider_order=("gemini", "groq"), gemini_api_keys=("test1",), groq_api_keys=("test2",), llm_max_attempts=2))
        router._request_provider = AsyncMock(side_effect=['{"questions": []}', '{"questions": [1]}'])
        def validate(value):
            if not value["questions"]:
                raise ValueError("Return every assigned question, once")
            return value
        result = await router.generate_json(system="system", prompt="assigned slots", fallback={}, transform=validate)
        self.assertEqual(result.provider, "groq")
        self.assertIn("Return every assigned question, once", router._request_provider.await_args_list[1].args[2])
        self.assertEqual(router._request_provider.await_count, 2)
