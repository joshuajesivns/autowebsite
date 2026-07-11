# Apex Engine — Project Context

## What this is
A **live** Astro static site (`https://www.apexenginehq.com`) combining an **automotive blog** and a
**vehicle listing marketplace**, aimed at the Philippines / JDM market.

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

## Content system — read `CONTENT_STYLE_GUIDE.md` before writing or editing any post
Blog content is organized into **3 verticals by reader intent**, each with its own phrase bank
(real example sentences, not tone adjectives) and a checklist of required sections mapped to
actual headings:
- **Daily Driver** (PMS cluster — Vios, Wigo, City, Fortuner, etc.): practical ownership-cost
  intent, warmest/most Tagalog-heavy register.
- **EV** (BYD cluster): tech-literate cross-shopping intent, more technical/English-forward.
- **JDM/Enthusiast** (new, greenfield — AE92 is the pilot post): mod/upgrade/parts-sourcing
  intent, the "cooler" register — deliberately NOT a PMS-style template.

Any change to a vertical's required-sections checklist must state whether it applies to new
posts only or requires a retrofit of existing posts — this guide tracks its own retrofit debt
at the bottom rather than letting requirements silently skip old posts (this happened once
already with the "Model Year Coverage" section).

A separate, standalone **fallback tool** (provider-agnostic prompt generator, not part of this
repo) lives at `Desktop/apex-content-engine` — see its own memory/README, not needed to know
for day-to-day work in this repo.

## Priorities (current phase)
1. **Blog first**, still true — authority-building via the PMS cluster is largely done; JDM
   vertical is the newest growth area; EV (BYD) cluster is ongoing.
2. Keep the **listings experience ready** to go live at any time — still gated behind
   `LISTINGS_LIVE = false` in `src/data/listings.ts`, "Coming Soon" everywhere.
3. **Affiliate monetization** is an active thread — favor specific/branded product keywords
   over broad ones when inserting affiliate links (see any affiliate-links notes in a post's
   generation context); check that the affiliate program actually stocks what's being
   recommended before treating it as a target.
- **Definition of "done" for this milestone:** able to **publish blog posts on a daily basis**
  (smooth authoring workflow matters) — largely achieved; the acknowledged remaining gap is
  **real photos** (posts still use placeholder/AI-generated hero images).

## Current state
- Blog is **live and real** — dozens of published posts across the PMS/Daily-Driver, BYD/EV, and
  (new) JDM verticals. Listings marketplace is still mock/placeholder, intentionally gated off
  (`LISTINGS_LIVE = false`) until real inventory exists.

## Deploy / workflow
- GitHub: `https://github.com/joshuajesivns/autowebsite` (remote `origin`, branch `main`).
- **`main` auto-deploys to Vercel.** Pushing to `main` ships to production — always confirm before
  pushing to `main`. Recent batches have been pushed straight to `main` on explicit go-ahead
  rather than via a preview branch — confirm current preference before assuming either way.

## Known gaps / cleanup backlog (as of 2026-07-11)
- `astro.config.mjs` `site` is set to the real domain (resolved).
- Inventory is centralized (still mock) in `src/data/listings.ts` — the single source for the
  homepage featured grid, the hero search dropdowns (derived `makes` / `modelsByMake`), and the
  `/listings` page. Replace with a content collection when real inventory exists.
- Hero search is functional: dependent Make→Model dropdowns submit to `/listings`, which filters
  **client-side** from the URL query (the site is static, so no server-side filtering).
- `Footer.astro` — check current state before assuming it's still starter boilerplate; social
  icon links were added at some point (verify).
- An untracked `social-assets/` folder and a `SOCIAL_LINKS` Facebook entry in `src/consts.ts`
  have existed since 2026-07-02 without a clear owner/purpose — ask before touching either.
- A `/contribute` page (owner-submitted PMS cost data + moderation) exists but has not been
  reviewed/tested end-to-end — verify before treating it as production-solid.

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
