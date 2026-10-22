from __future__ import annotations

import hmac
import asyncio
import logging
import sys
import time
from contextlib import asynccontextmanager
from contextlib import suppress

# Configure logging for standard output (essential for Render visibility)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .database import Database
from .llm_router import GenerationUnavailableError, LLMRouter
from .marketplace import list_listings, seed_listings
from .marketplace_review import ReviewRequest, review_notice
from .schemas import StudyAttemptRequest, StudyPaperFeedbackRequest, StudyPaperRequest
from .study import generate_paper, get_attempt, get_paper, list_papers, submit_attempt, submit_paper_feedback, student_paper
from .curriculum import catalog
from .study_jobs import enqueue, job_status, worker
from .observability import event, elapsed, request_id, valid_trace_id

# HTTPX INFO logs include full URLs/query strings. Our trace events replace them.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

settings = Settings.from_env()
database = Database(settings.db_path, settings.database_url)
router = LLMRouter(settings)
marketplace_review_slot = asyncio.Lock()


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.initialize()
    seed_listings(database)
    task = asyncio.create_task(worker(database, router))
    try:
        yield
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="Paper Shapers local backend", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=list(settings.allowed_origins), allow_credentials=False, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-Backend-Secret"])


@app.middleware("http")
async def trace_request(request: Request, call_next):
    # Accept the web-generated ID only from the authenticated web service.
    trusted = settings.shared_secret and hmac.compare_digest(request.headers.get("x-backend-secret", ""), settings.shared_secret)
    token = request_id.set(valid_trace_id(request.headers.get("x-request-id") if trusted else None))
    started = time.perf_counter()
    code = 500
    try:
        response = await call_next(request)
        code = response.status_code
        response.headers["X-Request-ID"] = request_id.get()
        return response
    finally:
        route = request.scope.get("route")
        template = getattr(route, "path", "unmatched")
        # Framework route templates contain placeholders, never actual IDs/queries.
        event("http.request", operation=template, status=code, duration_ms=elapsed(started))
        request_id.reset(token)


@app.get("/version")
def version() -> dict:
    import os
    return {"service": "backend", "commit": os.getenv("RENDER_GIT_COMMIT") or os.getenv("GIT_COMMIT") or "local", "release": "2026-10-21-production-audit"}


def require_write_access(x_backend_secret: str | None = Header(default=None)) -> None:
    if not settings.shared_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Backend write authentication is not configured.",
        )
    if settings.shared_secret and not hmac.compare_digest(x_backend_secret or "", settings.shared_secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid backend credential")


@app.post("/v1/marketplace/review", dependencies=[Depends(require_write_access)])
async def marketplace_review(request: ReviewRequest) -> dict:
    if marketplace_review_slot.locked():
        raise HTTPException(status_code=503, detail="Review capacity is busy; keep this notice pending", headers={"Retry-After": "5"})
    try:
        async with marketplace_review_slot:
            return await asyncio.wait_for(review_notice(router, request), timeout=18)
    except (GenerationUnavailableError, ValueError, TimeoutError):
        raise HTTPException(status_code=503, detail="Review unavailable; keep this notice pending") from None


@app.get("/health")
async def health() -> dict:
    database.initialize()
    providers = await router.provider_status()
    try:
        curriculum_available = bool(catalog(settings.study_curriculum_csv_path)["classes"])
    except (FileNotFoundError, ValueError):
        curriculum_available = False
    return {"status": "ok", "database": database.engine, "providers": providers, "study_generation": {"mode": "mock-enabled" if settings.allow_mock_fallback else "real-model-required", "curriculum_source": "configured" if curriculum_available else "missing"}}


@app.get("/v1/study/catalog")
def study_catalog() -> dict:
    try:
        return catalog(settings.study_curriculum_csv_path)
    except (FileNotFoundError, ValueError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@app.post("/v1/study/papers", dependencies=[Depends(require_write_access)])
async def create_study_paper(request: StudyPaperRequest) -> dict:
    try:
        return {"paper": student_paper(await generate_paper(database, router, request))}
    except GenerationUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/v1/study/generation-jobs", status_code=202, dependencies=[Depends(require_write_access)])
def start_generation(request: StudyPaperRequest) -> dict:
    try:
        return {"job": enqueue(database, router, request)}
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/v1/study/generation-jobs/{job_id}", dependencies=[Depends(require_write_access)])
def generation_status(job_id: str, user_id: str = Query(min_length=1, max_length=100)) -> dict:
    job = job_status(database, job_id, user_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Generation job not found")
    return {"job": job}


@app.get("/v1/study/papers", dependencies=[Depends(require_write_access)])
def study_history(user_id: str = Query(min_length=1, max_length=100), limit: int = Query(default=20, ge=1, le=50), offset: int = Query(default=0, ge=0, le=10_000)) -> dict:
    items = list_papers(database, user_id, limit + 1, offset, include_mock=settings.allow_mock_fallback)
    return {"items": student_paper(items[:limit]), "has_more": len(items) > limit}


@app.get("/v1/study/papers/{paper_id}", dependencies=[Depends(require_write_access)])
def study_paper(paper_id: str, user_id: str = Query(min_length=1, max_length=100)) -> dict:
    paper = get_paper(database, paper_id, user_id, include_mock=settings.allow_mock_fallback)
    if paper is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    return {"paper": student_paper(paper)}


@app.post("/v1/study/papers/{paper_id}/attempts", dependencies=[Depends(require_write_access)])
async def study_attempt(paper_id: str, request: StudyAttemptRequest) -> dict:
    try:
        attempt = await submit_attempt(database, router, paper_id, request)
    except GenerationUnavailableError as error:
        raise HTTPException(status_code=503, detail="Assessment is temporarily unavailable. Your draft can be submitted again later.") from error
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
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


@app.get("/v1/marketplace/listings")
def marketplace_listings(area: str | None = None, interests: list[str] = Query(default=[]), limit: int = Query(default=30, ge=1, le=50)) -> dict:
    return {"items": list_listings(database, area, interests, limit)}
