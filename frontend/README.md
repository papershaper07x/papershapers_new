# Web deployment boundary

Paper Shapers currently keeps its standard Next.js source at the repository root (`app/`, `lib/`, `db/`, and `public/`). Those paths form one web deployment unit even though the framework convention does not yet wrap them in a physical `frontend/` directory.

Server data access uses PostgreSQL. Keep the Vercel root directory at the repository root; moving into `frontend/` is not required or planned for this deployment.

## Boundary contract

- Browser code calls only same-origin `/api/*` routes.
- Vercel server routes own sessions, Google OAuth, authorization, and user-facing response shaping.
- Only server routes may call the Render API, using `BACKEND_ORIGIN` and `BACKEND_SHARED_SECRET`.
- LLM provider keys never exist in this deployment unit.
- PostgreSQL access is server-only. No privileged database credential may use a `NEXT_PUBLIC_` name.

The current deployment layout and migration gates are maintained in [`docs/production/02-vercel/README.md`](../docs/production/02-vercel/README.md).
