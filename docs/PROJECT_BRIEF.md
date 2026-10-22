# Reconstructed project brief

## Provenance

The exact original prompt used to create the first hosted version is not stored in the source repository. The text below is a reconstruction from the committed product, repository documentation, route structure, and site metadata. It should not be quoted as the verbatim original prompt.

## Reconstructed prompt

>
> Keep the first release lightweight, responsive, accessible, and honest about prototype data. Use one deployable application with stable routes for the home and all two portals, while keeping each portal's code and product boundary separate enough to move to a subdomain or independent service later. Prefer server-rendered pages with small interactive client components.
>
> Choose a stack that can run locally and remain compatible with free-tier hosting. Do not require a paid database, authentication provider, or other paid service for the prototype. Include a parent README, a README for each portal, system-design documentation, and basic structural tests. Document future backend contracts, trust and moderation needs, and the path from route-based prototypes to independently deployed products.

## Confirmed implementation facts

- The portals share layout, typography, accessibility rules, and navigation but use different colour and interaction patterns.
- Current content and interactions are front-end prototypes; durable accounts, generation, publishing, and moderation are deferred.
- The committed web build target is standard Next.js on Vercel, with a separate FastAPI worker and Neon database.
