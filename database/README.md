# Shared PostgreSQL database

`database/migrations/` is the only production schema history for both the Netlify web application and Render API. Runtime services verify the schema; they do not create production tables.

Apply migrations with an administrator/migration role:

```powershell
$env:DATABASE_URL="postgresql://<migration-user>:<password>@127.0.0.1:5432/papershapers_dev"
npm run db:migrate:postgres
```

Use separate runtime roles: `papershapers_web` for accounts/sessions/community data and `papershapers_api` for generated papers, attempts, feedback and cache. Local ignored environment files contain those URLs; Neon credentials belong only in Netlify and Render settings.

For the one-time local copy, back up the stores and run:

```powershell
$env:DATABASE_URL="postgresql://<migration-user>:<password>@127.0.0.1:5432/papershapers_dev"
python scripts/migrate_sqlite_to_postgres.py `
  --web-sqlite ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/<database>.sqlite" `
  --backend-sqlite "backend/data/papershapers.db"
```

The importer is idempotent through primary/unique-key conflict handling and never overwrites newer PostgreSQL rows. It copies account records first, backend paper records second, then dependent teacher-room records. Legacy rows with missing parents are reported and skipped rather than weakening PostgreSQL constraints.
