from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class StudyPaperRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=100)
    paper_size: Literal["half", "full"] = "half"
    board: str = Field(default="CBSE", min_length=2, max_length=30)
    grade: str = Field(min_length=1, max_length=20)
    subject: str = Field(min_length=2, max_length=80)
    chapters: list[str] = Field(default_factory=list, max_length=12)
    focus: str = Field(default="Exam practice", max_length=80)

    @field_validator("chapters")
    @classmethod
    def clean_chapters(cls, value: list[str]) -> list[str]:
        return [chapter.strip()[:120] for chapter in value if chapter.strip()]


class StudyAnswer(BaseModel):
    question_id: str = Field(min_length=1, max_length=40)
    answer: str = Field(default="", max_length=8000)


class StudyAttemptRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=100)
    answers: list[StudyAnswer] = Field(default_factory=list, max_length=80)


class StudyPaperFeedbackRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=100)
    category: Literal["good-fit", "difficulty", "wording", "coverage", "other"]
    comment: str = Field(default="", max_length=1200)


class NewsAnalysisRequest(BaseModel):
    article_id: str = Field(min_length=1, max_length=100)


class NewsBatchRequest(BaseModel):
    feeds: list[str] = Field(default_factory=list, max_length=20)
    use_fixture: bool = False


class MarketplaceQuery(BaseModel):
    area: str = Field(default="Indiranagar", max_length=80)
    interests: list[str] = Field(default_factory=list, max_length=12)
