# Apex Engine — Project Context

## What this is
An Astro static site combining an **automotive blog** and a **vehicle listing marketplace**,
aimed at the Philippines / JDM market. Built originally from the Astro blog starter and being
reshaped into the product below.

> **Brand: "Apex Engine"** everywhere — name, folder (`apex-engine`), and bylines.
> If you find any other working name left in the codebase, treat it as leftover and
> change it to "Apex Engine". There is only one product.

## Goal & audience
- **Audience:** car buyers — new *and* second-hand — plus keen enthusiasts. Competitors/benchmarks
  include topgear.com and similar automotive editorial sites.
- **Blog** targets people researching a purchase. The aim is to **build editorial authority** and
  earn visibility (including in **AI Overviews / AI search results**).
- **Listings** target serious potential buyers and aim to **educate impulsive buyers** before they
  commit.
- **Positioning / differentiator:** listings must be **transparent and authoritative**. Basic specs
  (make, model, color, transmission, fuel type, engine) are explicitly **not enough** — dealers are
  expected to document machines properly. "We don't just list cars; we document machines."

## Priorities (current phase)
1. **Blog first.** Build authority and AI-Overview presence before scaling the listings side.
2. Keep the **listings experience ready** to go live at any time, even while blog is the focus.
- **Definition of "done" for this milestone:** able to **publish blog posts on a daily basis**
  (smooth authoring workflow matters).

## Current state
- **Everything is mock/placeholder right now** — including the blog posts. Project is in the
  planning + initial-execution phase. Don't assume any data, listing, or article is real.

## Deploy / workflow
- GitHub: `https://github.com/joshuajesivns/autowebsite` (remote `origin`, branch `main`).
- **`main` auto-deploys to Vercel.** Pushing to `main` ships to production — always confirm before
  pushing to `main`; prefer a preview branch (Vercel gives each branch a preview URL) when unsure.

## Known gaps / cleanup backlog (as of 2026-06-16)
- Branding unified to "Apex Engine"; working folder renamed to `apex-engine` (2026-06-19).
- `astro.config.mjs` `site` is still the placeholder `https://example.com` — breaks canonical URLs,
  sitemap, RSS, and OG image absolute URLs. Should be set to the real domain.
- Inventory is centralized (still mock) in `src/data/listings.ts` — the single source for the
  homepage featured grid, the hero search dropdowns (derived `makes` / `modelsByMake`), and the
  `/listings` page. Replace with a content collection when real inventory exists (`content.config.ts`
  only defines `blog`; `src/data/vehicles/*.json` is not yet wired in).
- Hero search is functional: dependent Make→Model dropdowns submit to `/listings`, which filters
  **client-side** from the URL query (the site is static, so no server-side filtering).
- `src/content/blog/toyota-avanza-2018-review.md` uses MDX syntax but has a `.md` extension, so its
  components render as raw text — should be renamed `.mdx`.
- `Footer.astro` is still Astro-starter boilerplate ("Your name here", Astro social links) and uses
  CSS vars not defined in `apex.css`.

## Design system
- Single source of truth: `src/styles/apex.css` (the old dead `base.css` / `global.css` were deleted).
- Palette = "Panda" black & white (AE86 Trueno) + automotive mica tokens: `--paper`, `--paper-off`,
  `--black-mica`(/`-2`), `--metal-gray`(/`-light`), `--red-mica`(/`-dark`), `--mica-dark` (gradient).
  Semantic aliases `--bg-color` / `--text-color` / `--accent-color` map onto these.
- Red is an accent only — verified badges, `button.primary` CTAs, active state. Never decoration.
- `VehicleSpecCard` defines the **future listing-card contract**: required core specs plus
  transparency fields (`verified`, `grade`, `mileage`, `price`, `year`) that embody the brand promise.
  Real listings should always populate the transparency fields.

## Commands
- `npm run dev` — local dev server (localhost:4321)
- `npm run build` — production build to `./dist/`
- `npm run preview` — preview the build locally
