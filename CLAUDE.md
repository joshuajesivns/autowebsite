# Apex Engine — Project Context

## What this is
An Astro static site combining an **automotive blog** and a **vehicle listing marketplace**,
aimed at the Philippines / JDM market. Built originally from the Astro blog starter and being
reshaped into the product below.

> **Brand name is not final.** Using **"Apex Engine"** for now. The codebase also contains the
> name **"SouthShift"** (folder name, blog author byline) — this is leftover inconsistency, not a
> second product. When in doubt, use "Apex Engine".

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
- Branding split between "Apex Engine" and "SouthShift" (see above).
- `astro.config.mjs` `site` is still the placeholder `https://example.com` — breaks canonical URLs,
  sitemap, RSS, and OG image absolute URLs. Should be set to the real domain.
- Listings use hardcoded mock arrays; `src/data/vehicles/*.json` is not wired into a content
  collection yet (`content.config.ts` only defines `blog`).
- `src/content/blog/toyota-avanza-2018-review.md` uses MDX syntax but has a `.md` extension, so its
  components render as raw text — should be renamed `.mdx`.
- `Footer.astro` is still Astro-starter boilerplate ("Your name here", Astro social links) and uses
  CSS vars not defined in `apex.css`.
- Unused stylesheets: `src/styles/base.css`, `src/styles/global.css` (only `apex.css` is imported).

## Commands
- `npm run dev` — local dev server (localhost:4321)
- `npm run build` — production build to `./dist/`
- `npm run preview` — preview the build locally
