# Paper Shapers

Paper Shapers is an umbrella for small, practical digital products. This repository contains the public home and the first front-end prototypes for three portals:

- **Study Lab** (`/papershapers`) — focused CBSE practice and research tools.
- **Perspective** (`/perspective`) — one news story viewed through clearly labelled political lenses.
- **Noticeboard** (`/noticeboard`) — time-sensitive posts from nearby shops, services, events, and communities.

The current release is deliberately front-end only. It demonstrates product boundaries, interaction patterns, responsive behaviour, and the shared brand system before backend contracts are locked.

## Run the repo

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run build
npm test
```

The app uses vinext and emits Cloudflare Worker-compatible ESM. The same front end can be hosted on OpenAI Sites/Cloudflare, Netlify, or another platform that supports a modern JavaScript build. No database, authentication provider, or paid service is required for this prototype.

## Repository map

```text
app/
  components/          shared site chrome
  papershapers/        education portal and its product README
  perspective/         news comparison portal and its product README
  noticeboard/         local discovery portal and its product README
  globals.css          shared visual system and responsive rules
docs/
  SYSTEM_DESIGN.md     high-level architecture, flows, and rollout plan
tests/
  site-structure...    low-cost structural guardrails
.openai/
  hosting.json         hosted resource declarations
AGENTS.md              standing maintenance rules for future changes
```

## Architecture decisions

1. **One deployable, multiple bounded routes.** This makes the first release inexpensive and easy to maintain. Each portal keeps its own folder and can later be extracted without redesigning it.
2. **Subdomains at the edge, not in component logic.** Initially, `learn.papershapers.in`, `perspective.papershapers.in`, and `nearby.papershapers.in` can proxy or redirect to their corresponding route. When a portal needs its own release cycle, its folder becomes a separate application.
3. **Server components by default.** Interactive islands are small client components. This limits shipped JavaScript and keeps content fast on low-end mobile devices.
4. **Shared tokens, distinct portal voices.** Typography, spacing, accessibility, and chrome are common. Colour and interaction patterns change by product so the umbrella never feels like a generic template.
5. **Backend contracts come after product validation.** Demo content is local and clearly labelled. Durable accounts, generation, publishing, moderation, and editorial workflows are intentionally deferred.

Full architecture and rollout details live in [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md).

## Responsive and accessibility baseline

- Fluid type and layouts across mobile, tablet, and desktop.
- Mobile navigation uses a real button with an expanded state.
- Product controls are keyboard-operable native buttons.
- Motion is reduced when the visitor requests it.
- Colour is paired with labels; it is never the only carrier of meaning.
- Content width, tap targets, and dense cards collapse deliberately below 920 px and 600 px.

## Documentation contract

Every functional or architectural change must update the closest portal README and, when the change affects shared behaviour, this README or `docs/SYSTEM_DESIGN.md`. The standing rule is also recorded in `AGENTS.md` so future contributors and coding agents inherit it automatically.
