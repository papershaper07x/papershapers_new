# Web deployment boundary

Paper Shapers currently keeps its standard Next.js source at the repository root (`app/`, `lib/`, `db/`, and `public/`). Those paths form one web deployment unit even though the framework convention does not yet wrap them in a physical `frontend/` directory.

The runtime and persistence migration is active: server data access now uses PostgreSQL and the physical move into `frontend/` is the remaining workspace-layout step.

## Boundary contract

- Browser code calls only same-origin `/api/*` routes.
- Netlify server routes own sessions, Google OAuth, authorization, and user-facing response shaping.
- Only server routes may call the Render API, using `BACKEND_ORIGIN` and `BACKEND_SHARED_SECRET`.
- LLM provider keys never exist in this deployment unit.
- PostgreSQL access is server-only. No privileged database credential may use a `NEXT_PUBLIC_` name.

The final target layout and migration gates are maintained in [`docs/DEPLOYMENT_NETLIFY_RENDER_NEON.md`](../docs/DEPLOYMENT_NETLIFY_RENDER_NEON.md).
