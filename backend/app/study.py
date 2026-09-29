from __future__ import annotations

import json
import hashlib
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from .database import Database
from .curriculum import context_for_selection, paper_guidance_for_selection, validate_selection
from .llm_router import GenerationUnavailableError, LLMRouter
from .schemas import StudyAttemptRequest, StudyPaperFeedbackRequest, StudyPaperRequest


def _blueprint(paper_size: str) -> dict[str, Any]:
    if paper_size == "full":
        return {"total_marks": 80, "time_minutes": 180, "sections": [{"id": "A", "count": 10, "marks": 1}, {"id": "B", "count": 6, "marks": 2}, {"id": "C", "count": 6, "marks": 3}, {"id": "D", "count": 4, "marks": 5}, {"id": "E", "count": 5, "marks": 4}]}
    return {"total_marks": 40, "time_minutes": 90, "sections": [{"id": "A", "count": 6, "marks": 1}, {"id": "B", "count": 4, "marks": 2}, {"id": "C", "count": 4, "marks": 3}, {"id": "D", "count": 2, "marks": 5}, {"id": "E", "count": 1, "marks": 4}]}


def _fallback_paper(request: StudyPaperRequest, blueprint: dict[str, Any]) -> dict[str, Any]:
    chapters = request.chapters or ["Mixed syllabus"]
    questions = []
    q_number = 1
    for section in blueprint["sections"]:
        for index in range(section["count"]):
            chapter = chapters[index % len(chapters)]
            questions.append({
                "id": f"Q{q_number}",
                "section": section["id"],
                "chapter": chapter,
                "marks": section["marks"],
                "type": "objective" if section["marks"] == 1 else "constructed-response",
                "text": f"Sample {request.subject} question for {chapter}. Replace with curriculum-grounded generation before classroom use.",
                "answer_outline": "Demonstration answer outline. Requires subject validation.",
            })
            q_number += 1
    return {
        "title": f"{request.paper_size.title()} {request.subject} Practice Paper",
        "board": request.board,
        "grade": request.grade,
        "subject": request.subject,
        "paper_size": request.paper_size,
        "total_marks": blueprint["total_marks"],
        "time_minutes": blueprint["time_minutes"],
        "instructions": ["All questions are compulsory unless a choice is shown.", "This offline fallback is illustrative and must be reviewed by an educator."],
        "questions": questions,
        "is_demo": True,
    }


async def generate_paper(database: Database, router: LLMRouter, request: StudyPaperRequest) -> dict[str, Any]:
    selected = validate_selection(router.settings.study_curriculum_csv_path, request.board, request.grade, request.subject, request.chapters)
    request = request.model_copy(update={"subject": selected["subject"], "chapters": selected["chapters"]})
    blueprint = _blueprint(request.paper_size)
    fallback = _fallback_paper(request, blueprint)
    context = context_for_selection(router.settings.study_curriculum_csv_path, request.board, request.grade, request.subject, request.chapters)
    guidance = paper_guidance_for_selection(router.settings.study_curriculum_csv_path, request.board, request.grade, request.subject)
    cache_key = _generation_cache_key(request, router.settings.study_generation_cache_version)
    prompt = json.dumps({"task": "Create a curriculum-grounded practice paper as JSON using only the supplied local study context. Do not use template text.", "request": request.model_dump(), "class_label": selected["class_label"], "requested_total_marks": blueprint["total_marks"], "requested_time_minutes": blueprint["time_minutes"], "local_paper_setting_guidance": guidance or "No subject-specific local paper-setting guidance was supplied. Use a balanced assessment layout.", "local_study_context": context, "required_shape": {"title": "string", "board": "string", "grade": "string", "subject": "string", "paper_size": "half|full", "total_marks": "integer", "time_minutes": "integer", "instructions": ["string"], "questions": [{"id": "string", "section": "string", "chapter": "string", "marks": "number", "type": "string", "text": "string", "answer_outline": "string"}], "is_demo": False}}, ensure_ascii=False)
    def normalize_and_validate(candidate: dict[str, Any]) -> dict[str, Any]:
        normalized = _normalise_generated_paper(candidate, request)
        _validate_generated_paper(normalized, blueprint, request)
        return normalized

    try:
        result = await router.generate_json(system="You are an assessment designer. Return JSON only. Create original questions from the supplied local study context and local paper-setting guidance. Return every question, including section questions, in the top-level questions array. The sum of question marks must equal the requested total. A real model is required in normal operation: do not output illustrative, sample, placeholder, or template questions. Do not invent claims about official approval.", prompt=prompt, fallback=fallback, transform=normalize_and_validate)
    except GenerationUnavailableError:
        cached = _load_cached_paper(database, cache_key)
        if cached is None:
            raise
        return _save_paper(database, request, cached, "cache", generation_source="cached-recovery")
    _store_cached_paper(database, cache_key, result.value, result.provider, router.settings.study_generation_cache_hours)
    return _save_paper(database, request, result.value, result.provider, generation_source="fresh")


def _generation_cache_key(request: StudyPaperRequest, cache_version: str) -> str:
    """Fingerprint shared content only; identity and attempts never enter this key."""
    canonical = {
        "version": cache_version,
        "board": request.board,
        "grade": request.grade,
        "subject": request.subject,
        "chapters": sorted(request.chapters),
        "focus": request.focus,
        "paper_size": request.paper_size,
    }
    return hashlib.sha256(json.dumps(canonical, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def _store_cached_paper(database: Database, generation_key: str, paper: dict[str, Any], provider: str, cache_hours: int) -> None:
    now = datetime.now(UTC)
    expires_at = now + timedelta(hours=cache_hours)
    # Cache only validated, identity-free paper content. Do not cache the user ID, paper ID, or attempts.
    with database.connect() as db:
        db.execute("INSERT OR REPLACE INTO generated_paper_cache (generation_key, provider, paper_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?)", (generation_key, provider, json.dumps(paper), now.isoformat(), expires_at.isoformat()))


def _load_cached_paper(database: Database, generation_key: str) -> dict[str, Any] | None:
    now = datetime.now(UTC).isoformat()
    with database.connect() as db:
        row = db.execute("SELECT provider, paper_json FROM generated_paper_cache WHERE generation_key = ? AND expires_at > ? LIMIT 1", (generation_key, now)).fetchone()
    if row is None:
        return None
    paper = json.loads(row["paper_json"])
    if not isinstance(paper, dict):
        return None
    return {**paper, "cached_from_provider": row["provider"]}


def _save_paper(database: Database, request: StudyPaperRequest, paper: dict[str, Any], provider: str, *, generation_source: str) -> dict[str, Any]:
    paper_id = str(uuid.uuid4())
    created_at = datetime.now(UTC).isoformat()
    value = {**paper, "id": paper_id, "provider": provider, "generation_source": generation_source, "created_at": created_at}
    with database.connect() as db:
        db.execute("INSERT INTO generated_papers (id, user_id, paper_size, board, grade, subject, chapters_json, provider, status, paper_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (paper_id, request.user_id, request.paper_size, request.board, request.grade, request.subject, json.dumps(request.chapters), provider, "generated", json.dumps(value), created_at))
    return value


def _normalise_generated_paper(value: dict[str, Any], request: StudyPaperRequest) -> dict[str, Any]:
    """Accept Gemini's section-grouped paper form without inventing any content."""
    normalized = dict(value)
    if not isinstance(normalized.get("questions"), list):
        flattened: list[dict[str, Any]] = []
        for section_index, section in enumerate(normalized.get("sections", []), start=1):
            if not isinstance(section, dict):
                continue
            section_id = str(section.get("id") or section.get("section") or section.get("name") or chr(64 + section_index))
            for question_index, question in enumerate(section.get("questions", []), start=1):
                if not isinstance(question, dict):
                    continue
                flattened.append({
                    "id": str(question.get("id") or question.get("question_number") or f"{section_id}{question_index}"),
                    "section": section_id,
                    "chapter": str(question.get("chapter") or question.get("topic") or ", ".join(request.chapters)),
                    "marks": question.get("marks") if question.get("marks") is not None else question.get("mark"),
                    "type": str(question.get("type") or question.get("question_type") or "constructed-response"),
                    "text": str(question.get("text") or question.get("question") or question.get("question_text") or ""),
                    "answer_outline": str(question.get("answer_outline") or question.get("answer") or question.get("marking_scheme") or question.get("answer_key") or ""),
                })
        normalized["questions"] = flattened
    normalized["title"] = normalized.get("title") or normalized.get("paper_title") or f"{request.subject} practice paper"
    normalized["instructions"] = normalized.get("instructions") or normalized.get("general_instructions") or []
    normalized.update({"board": request.board, "grade": request.grade, "subject": request.subject, "paper_size": request.paper_size, "is_demo": False})
    return normalized


def _validate_generated_paper(value: dict[str, Any], blueprint: dict[str, Any], request: StudyPaperRequest) -> None:
    questions = value.get("questions")
    if not isinstance(questions, list) or not questions:
        raise ValueError("The model response did not contain questions")
    seen: set[str] = set()
    calculated_marks = 0.0
    for question in questions:
        if not isinstance(question, dict) or not isinstance(question.get("id"), str) or question["id"] in seen:
            raise ValueError("The model response contains invalid or duplicate question IDs")
        seen.add(question["id"])
        try:
            marks = float(question.get("marks"))
        except (TypeError, ValueError):
            raise ValueError("The model response contains a question without numeric marks") from None
        if marks <= 0 or not str(question.get("text", "")).strip() or not str(question.get("answer_outline", "")).strip():
            raise ValueError("The model response contains an incomplete question")
        calculated_marks += marks
    if int(value.get("total_marks", -1)) != blueprint["total_marks"] or int(value.get("time_minutes", -1)) != blueprint["time_minutes"]:
        raise ValueError("The model response did not preserve the requested paper timing or total marks")
    if calculated_marks != float(blueprint["total_marks"]):
        raise ValueError("The model response question marks do not add up to the requested total")


def list_papers(database: Database, user_id: str, limit: int = 20, include_mock: bool = True) -> list[dict[str, Any]]:
    with database.connect() as db:
        query = "SELECT id, paper_size, board, grade, subject, chapters_json, provider, status, paper_json, created_at FROM generated_papers WHERE user_id = ?"
        if not include_mock:
            query += " AND provider != 'mock'"
        query += " ORDER BY created_at DESC LIMIT ?"
        rows = db.execute(query, (user_id, min(max(limit, 1), 50))).fetchall()
    return [Database.decode(row, "chapters_json", "paper_json") for row in rows]


def get_paper(database: Database, paper_id: str, user_id: str, include_mock: bool = True) -> dict[str, Any] | None:
    with database.connect() as db:
        query = "SELECT id, paper_size, board, grade, subject, chapters_json, provider, status, paper_json, created_at FROM generated_papers WHERE id = ? AND user_id = ?"
        if not include_mock:
            query += " AND provider != 'mock'"
        query += " LIMIT 1"
        row = db.execute(query, (paper_id, user_id)).fetchone()
    return Database.decode(row, "chapters_json", "paper_json") if row else None


def _fallback_attempt_score(paper: dict[str, Any], request: StudyAttemptRequest) -> dict[str, Any]:
    answers = {answer.question_id: answer.answer.strip() for answer in request.answers}
    breakdown: list[dict[str, Any]] = []
    earned_total = 0.0
    total_marks = 0.0
    for question in paper.get("questions", []):
        marks = float(question.get("marks", 0))
        answer = answers.get(question.get("id", ""), "")
        length = len(answer)
        if not answer:
            earned, feedback = 0.0, "No response yet. Add your working or reasoning before submitting."
        elif length < 18:
            earned, feedback = min(1.0, marks), "You made a start. Explain the method or evidence to earn more marks."
        elif length < 60:
            earned, feedback = max(1.0, marks - 1.0), "The core idea is present. Add steps, definitions, or a conclusion."
        else:
            earned, feedback = marks, "Practice estimate: your response includes enough working to review. Compare it with the answer outline."
        earned_total += earned
        total_marks += marks
        breakdown.append({"question_id": question.get("id"), "earned_marks": earned, "available_marks": marks, "question_text": question.get("text", ""), "student_answer": answer, "feedback": feedback, "answer_outline": question.get("answer_outline", "")})
    return {
        "earned_marks": earned_total,
        "total_marks": total_marks,
        "percentage": round((earned_total / total_marks * 100) if total_marks else 0, 1),
        "breakdown": breakdown,
        "summary": "Practice-feedback estimate based on response completeness. It is not an official score and needs educator review.",
        "is_demo": True,
    }


def _validated_attempt_score(candidate: dict[str, Any], fallback: dict[str, Any], paper: dict[str, Any], provider: str) -> dict[str, Any]:
    """Accept only a bounded, paper-shaped model review; otherwise retain the safe fallback."""
    if provider == "mock":
        return {**fallback, "verification": {"status": "local-rubric", "provider": provider, "detail": "No model verifier is configured; feedback uses the local practice rubric and question mark caps."}}
    expected = {str(question.get("id")): float(question.get("marks", 0)) for question in paper.get("questions", [])}
    candidate_rows = candidate.get("breakdown") if isinstance(candidate, dict) else None
    if not isinstance(candidate_rows, list) or len(candidate_rows) != len(expected):
        return {**fallback, "verification": {"status": "fallback", "provider": provider, "detail": "The model response did not match the paper schema; the local practice rubric was used."}}
    rows_by_id = {str(row.get("question_id")): row for row in candidate_rows if isinstance(row, dict)}
    if set(rows_by_id) != set(expected):
        return {**fallback, "verification": {"status": "fallback", "provider": provider, "detail": "Question IDs did not match the generated paper; the local practice rubric was used."}}
    normalized_rows: list[dict[str, Any]] = []
    total = 0.0
    for fallback_row in fallback["breakdown"]:
        question_id = str(fallback_row["question_id"])
        row = rows_by_id[question_id]
        try:
            earned = float(row.get("earned_marks"))
        except (TypeError, ValueError):
            return {**fallback, "verification": {"status": "fallback", "provider": provider, "detail": "A score was not numeric; the local practice rubric was used."}}
        allowed = expected[question_id]
        if earned < 0 or earned > allowed:
            return {**fallback, "verification": {"status": "fallback", "provider": provider, "detail": "A score exceeded the question mark cap; the local practice rubric was used."}}
        total += earned
        normalized_rows.append({
            "question_id": question_id,
            "earned_marks": earned,
            "available_marks": allowed,
            "question_text": fallback_row["question_text"],
            "student_answer": fallback_row["student_answer"],
            "feedback": str(row.get("feedback") or fallback_row["feedback"])[:1200],
            "answer_outline": fallback_row["answer_outline"],
        })
    total_marks = sum(expected.values())
    return {
        "earned_marks": total,
        "total_marks": total_marks,
        "percentage": round((total / total_marks * 100) if total_marks else 0, 1),
        "breakdown": normalized_rows,
        "summary": str(candidate.get("summary") or fallback["summary"])[:1200],
        "is_demo": True,
        "verification": {"status": "validated", "provider": provider, "detail": "Question IDs, numeric marks, and every mark cap were checked against this paper before showing feedback."},
    }


async def submit_attempt(database: Database, router: LLMRouter, paper_id: str, request: StudyAttemptRequest) -> dict[str, Any] | None:
    paper_row = get_paper(database, paper_id, request.user_id, include_mock=router.settings.allow_mock_fallback)
    if paper_row is None:
        return None
    paper = paper_row["paper"]
    fallback = _fallback_attempt_score(paper, request)
    prompt = json.dumps({"task": "Provide formative practice feedback for this paper attempt. Do not claim an official score. Return JSON only.", "paper": {"title": paper.get("title"), "questions": [{"id": q.get("id"), "marks": q.get("marks"), "answer_outline": q.get("answer_outline")} for q in paper.get("questions", [])]}, "answers": [answer.model_dump() for answer in request.answers], "required_shape": {"earned_marks": "number", "total_marks": "number", "percentage": "number", "breakdown": [{"question_id": "string", "earned_marks": "number", "available_marks": "number", "feedback": "string", "answer_outline": "string"}], "summary": "string", "is_demo": True}}, ensure_ascii=False)
    result = await router.generate_json(system="You are a supportive formative assessment coach. Return JSON only. Never represent a draft score as official or final.", prompt=prompt, fallback=fallback)
    attempt_id = str(uuid.uuid4())
    now = datetime.now(UTC).isoformat()
    checked_score = _validated_attempt_score(result.value, fallback, paper, result.provider)
    score = {**checked_score, "id": attempt_id, "paper_id": paper_id, "provider": result.provider, "submitted_at": now}
    with database.connect() as db:
        db.execute("INSERT INTO paper_attempts (id, paper_id, user_id, status, provider, answers_json, score_json, started_at, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", (attempt_id, paper_id, request.user_id, "reviewed", result.provider, json.dumps([answer.model_dump() for answer in request.answers]), json.dumps(score), now, now))
    return score


def get_attempt(database: Database, paper_id: str, attempt_id: str, user_id: str) -> dict[str, Any] | None:
    with database.connect() as db:
        row = db.execute("SELECT id, paper_id, status, provider, answers_json, score_json, started_at, submitted_at FROM paper_attempts WHERE id = ? AND paper_id = ? AND user_id = ? LIMIT 1", (attempt_id, paper_id, user_id)).fetchone()
    return Database.decode(row, "answers_json", "score_json") if row else None


def submit_paper_feedback(database: Database, paper_id: str, request: StudyPaperFeedbackRequest) -> bool:
    """Store owner-scoped product feedback for review; never feed it into live prompts automatically."""
    if get_paper(database, paper_id, request.user_id, include_mock=True) is None:
        return False
    with database.connect() as db:
        db.execute("INSERT INTO paper_feedback (id, paper_id, user_id, category, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)", (str(uuid.uuid4()), paper_id, request.user_id, request.category, request.comment.strip(), datetime.now(UTC).isoformat()))
    return True
