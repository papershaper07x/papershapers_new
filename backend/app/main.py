from __future__ import annotations

import hmac
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .database import Database
from .llm_router import GenerationUnavailableError, LLMRouter
from .marketplace import list_listings, seed_listings
from .news import analyze_article, ingest_feeds, ingest_fixture, list_articles
from .schemas import NewsAnalysisRequest, NewsBatchRequest, StudyAttemptRequest, StudyPaperFeedbackRequest, StudyPaperRequest
from .study import generate_paper, get_attempt, get_paper, list_papers, submit_attempt, submit_paper_feedback
from .curriculum import catalog

settings = Settings.from_env()
database = Database(settings.db_path, settings.database_url)
router = LLMRouter(settings)


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.initialize()
    seed_listings(database)
    fixture = Path(__file__).parents[1] / "fixtures" / "news.json"
    if not list_articles(database, limit=1) and fixture.exists():
        ingest_fixture(database, fixture)
    yield


app = FastAPI(title="Paper Shapers local backend", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=list(settings.allowed_origins), allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-Backend-Secret"])


def require_write_access(x_backend_secret: str | None = Header(default=None)) -> None:
    if not settings.shared_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backend write authentication is not configured.",
        )
    if settings.shared_secret and not hmac.compare_digest(x_backend_secret or "", settings.shared_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid backend credential")


@app.get("/health")
async def health() -> dict:
    database.initialize()
    providers = await router.provider_status()
    return {"status": "ok", "database": database.engine, "providers": providers, "study_generation": {"mode": "mock-enabled" if settings.allow_mock_fallback else "real-model-required", "curriculum_source": "configured" if settings.study_curriculum_csv_path.exists() else "missing"}}


@app.get("/v1/study/catalog")
def study_catalog() -> dict:
    try:
        return catalog(settings.study_curriculum_csv_path)
    except (FileNotFoundError, ValueError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/v1/study/papers", dependencies=[Depends(require_write_access)])
async def create_study_paper(request: StudyPaperRequest) -> dict:
    try:
        return {"paper": await generate_paper(database, router, request)}
    except GenerationUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/v1/study/papers", dependencies=[Depends(require_write_access)])
def study_history(user_id: str = Query(min_length=1, max_length=100), limit: int = Query(default=20, ge=1, le=50), offset: int = Query(default=0, ge=0, le=10_000)) -> dict:
    items = list_papers(database, user_id, limit + 1, offset, include_mock=settings.allow_mock_fallback)
    return {"items": items[:limit], "has_more": len(items) > limit}


@app.get("/v1/study/papers/{paper_id}", dependencies=[Depends(require_write_access)])
def study_paper(paper_id: str, user_id: str = Query(min_length=1, max_length=100)) -> dict:
    paper = get_paper(database, paper_id, user_id, include_mock=settings.allow_mock_fallback)
    if paper is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"paper": paper}


@app.post("/v1/study/papers/{paper_id}/attempts", dependencies=[Depends(require_write_access)])
async def study_attempt(paper_id: str, request: StudyAttemptRequest) -> dict:
    attempt = await submit_attempt(database, router, paper_id, request)
    if attempt is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"attempt": attempt}


@app.post("/v1/study/papers/{paper_id}/feedback", dependencies=[Depends(require_write_access)])
def study_paper_feedback(paper_id: str, request: StudyPaperFeedbackRequest) -> dict:
    if not submit_paper_feedback(database, paper_id, request):
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"status": "recorded"}


@app.get("/v1/study/papers/{paper_id}/attempts/{attempt_id}", dependencies=[Depends(require_write_access)])
def study_attempt_result(paper_id: str, attempt_id: str, user_id: str = Query(min_length=1, max_length=100)) -> dict:
    attempt = get_attempt(database, paper_id, attempt_id, user_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return {"attempt": attempt}


@app.get("/v1/news/articles")
def news_articles(limit: int = Query(default=20, ge=1, le=50), category: str | None = None) -> dict:
    return {"items": list_articles(database, limit, category)}


@app.post("/v1/news/analyze", dependencies=[Depends(require_write_access)])
async def news_analyze(request: NewsAnalysisRequest) -> dict:
    analysis = await analyze_article(database, router, request.article_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"analysis": analysis}


@app.post("/v1/news/batch", dependencies=[Depends(require_write_access)])
def news_batch(request: NewsBatchRequest) -> dict:
    fixture = Path(__file__).parents[1] / "fixtures" / "news.json"
    feeds = request.feeds or list(settings.news_rss_feeds)
    inserted = ingest_fixture(database, fixture) if request.use_fixture or not feeds else ingest_feeds(database, feeds)
    return {"inserted": inserted, "mode": "fixture" if request.use_fixture or not feeds else "rss"}


@app.get("/v1/marketplace/listings")
def marketplace_listings(area: str | None = None, interests: list[str] = Query(default=[]), limit: int = Query(default=30, ge=1, le=50)) -> dict:
    return {"items": list_listings(database, area, interests, limit)}
