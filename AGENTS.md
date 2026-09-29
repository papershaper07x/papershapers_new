# Repository instructions

These rules apply to every change in this repository.

1. Keep the code lightweight and readable. Prefer server components plus small, focused client islands. Do not add a dependency when platform APIs or existing code are sufficient.
2. Preserve portal boundaries. Shared brand and layout code belongs in `app/components` or `app/globals.css`; portal-specific behaviour stays inside that portal folder.
3. Update documentation in the same change:
   - update the portal's `README.md` for product, UI, data, or flow changes;
   - update the root `README.md` for repository or runbook changes;
   - update `docs/SYSTEM_DESIGN.md` for architecture, domain, persistence, security, or deployment changes.
4. Keep prototype data explicitly labelled. Do not present invented news, testimonials, business listings, or metrics as live facts.
5. Run `npm run build` and `npm test` before considering a change complete. Check mobile, tablet, and desktop layouts for material UI changes.
6. Do not couple the portals through hidden client state. Cross-portal navigation uses stable URLs; future backend communication must use versioned contracts.
7. Keep free-tier deployment compatibility until a documented requirement makes a paid capability necessary.
8. Add a short entry to `CHANGELOG.md` for user-visible, operational, architectural, or dependency changes. Pure typo fixes may be grouped with the related change.
