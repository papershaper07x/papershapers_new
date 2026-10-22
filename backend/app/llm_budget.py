from datetime import UTC, datetime

from .database import Database


class BudgetExhaustedError(RuntimeError):
    def __init__(self, message: str, *, scope: str = "site"):
        super().__init__(message)
        self.scope = scope


def reserve_provider_call(database: Database, daily_limit: int, monthly_limit: int, now: datetime | None = None) -> None:
    """Reserve before network I/O, counting failures; one atomic row across workers."""
    if daily_limit <= 0 or monthly_limit <= 0:
        raise BudgetExhaustedError("AI calls are paused by the operator.")
    now = (now or datetime.now(UTC)).astimezone(UTC)
    day, month = now.strftime("%Y-%m-%d"), now.strftime("%Y-%m")
    with database.connect() as db:
        row = db.execute("""INSERT INTO llm_call_budget (id, day_key, month_key, daily_calls, monthly_calls)
            VALUES ('site', ?, ?, 1, 1)
            ON CONFLICT (id) DO UPDATE SET
              daily_calls = CASE WHEN llm_call_budget.day_key = excluded.day_key THEN llm_call_budget.daily_calls + 1 ELSE 1 END,
              monthly_calls = CASE WHEN llm_call_budget.month_key = excluded.month_key THEN llm_call_budget.monthly_calls + 1 ELSE 1 END,
              day_key = excluded.day_key, month_key = excluded.month_key
            WHERE (llm_call_budget.day_key <> excluded.day_key OR llm_call_budget.daily_calls < ?)
              AND (llm_call_budget.month_key <> excluded.month_key OR llm_call_budget.monthly_calls < ?)
            RETURNING id""", (day, month, daily_limit, monthly_limit)).fetchone()
        if row is None:
            raise BudgetExhaustedError("The site's AI allowance is exhausted. Please try again after the next allowance reset.")
