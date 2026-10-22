"""Apply pending PostgreSQL migrations using a separate owner credential."""
from pathlib import Path
import os

from dotenv import dotenv_values
import psycopg
from psycopg import sql


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    values = {**dotenv_values(root / "backend" / ".env"), **os.environ}
    runtime_url = values.get("DATABASE_URL")
    migration_url = values.get("MIGRATION_DATABASE_URL") or runtime_url
    if not migration_url:
        raise SystemExit("Configure DATABASE_URL and MIGRATION_DATABASE_URL in backend/.env before migrating PostgreSQL.")
    try:
        with psycopg.connect(migration_url, connect_timeout=10) as owner:
            # Serialise migration runners and keep schema, grants and ledger atomic.
            owner.execute("SELECT pg_advisory_xact_lock(72619044)")
            current_db = owner.execute("SELECT current_database(), inet_server_addr(), inet_server_port()").fetchone()
            runtime_role = None
            if runtime_url:
                with psycopg.connect(runtime_url, connect_timeout=10) as runtime:
                    runtime_identity = runtime.execute("SELECT current_database(), inet_server_addr(), inet_server_port(), current_user").fetchone()
                    runtime_db, runtime_role = runtime_identity[:3], runtime_identity[3]
                    if current_db != runtime_db:
                        raise ValueError("Migration and runtime connections must target the same database.")
            ledger = owner.execute("SELECT to_regclass('public.schema_migrations')").fetchone()[0]
            applied = {row[0] for row in owner.execute("SELECT version FROM schema_migrations")} if ledger else set()
            for file in sorted((root / "database" / "migrations").glob("*.sql")):
                if file.stem not in applied:
                    owner.execute(file.read_text(encoding="utf-8"), prepare=False)
                    print(f"Prepared {file.stem}")
            if runtime_role:
                owner.execute(sql.SQL("GRANT SELECT, INSERT, UPDATE ON TABLE public.llm_call_budget TO {}").format(sql.Identifier(runtime_role)))
                owner.execute(sql.SQL("GRANT SELECT ON TABLE public.billing_orders TO {}").format(sql.Identifier(runtime_role)))
                owner.execute(sql.SQL("GRANT SELECT ON TABLE public.schema_migrations TO {}").format(sql.Identifier(runtime_role)))
        print("PostgreSQL migrations committed. Restart the backend.")
    except psycopg.errors.InsufficientPrivilege:
        raise SystemExit("Migration permission denied. Set MIGRATION_DATABASE_URL in backend/.env to the database owner/admin connection; keep DATABASE_URL as the runtime role.") from None
    except (psycopg.Error, ValueError):
        # Do not expose URLs/passwords through connection diagnostics.
        raise SystemExit("Migration failed and was rolled back. Check owner credentials, connectivity, and that both URLs target the same database.") from None


if __name__ == "__main__":
    main()
