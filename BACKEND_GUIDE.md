# Apex Engine — Backend Guide

A plain-language tour of how to run Apex Engine's "backend." Written so you can do everything
yourself without Claude Code. Keep this file — it lives in the project root next to `CLAUDE.md`.

---

## The big picture (read this first)

There is **no traditional server backend** you have to babysit. Apex Engine is a *static site*:
the pages are pre-built into plain HTML and served by Vercel. That means it's fast, cheap, and
almost impossible to "crash."

You manage it in **two ways**, and you can use whichever you're comfortable with:

| Way | What it's for | Needs |
|-----|---------------|-------|
| **1. The browser Admin panel** (`/admin`) | Day-to-day: publish posts, edit posts, moderate submissions. | Just a browser + your admin password. |
| **2. The code** (this repo) | Deeper changes: design, config, new features, fixing links. | The files on your PC + a push to GitHub. |

The golden rule of how anything goes live:

```
You publish/edit  ─►  a commit lands in GitHub (repo: autowebsite, branch: main)
                  ─►  Vercel sees the commit and auto-builds
                  ─►  the new version is live at apexenginehq.com  (~1–2 minutes)
```

Both ways above end at the same place: **a commit on the `main` branch → Vercel deploys.**
The Admin panel just makes that commit *for you* from the browser.

---

## What's in this guide

Parts **A–E** are the practical, day-to-day stuff — most days you never need more than these.
Parts **F–I** are the "under the hood" reference: how the machinery actually works, for when
you (or a developer) need to change or debug it rather than just use it.

- **A — The browser Admin panel** (`/admin`) — publish, edit, moderate from any browser.
- **B — Managing it from the code** (this repo) — files, `consts.ts`, how a code change goes live.
- **C — Site-wide behavior: links open in a new tab** — where that's set and how to change it.
- **D — Secrets & environment variables** — what each one unlocks, where they live.
- **E — Quick troubleshooting** — the usual "why didn't it work" answers.
- **F — Under the hood: how publishing actually works** — the Scan → Publish pipeline, atomic commits.
- **G — The structured-data (JSON-LD) engine** — how a post's schema is built from its `vertical`.
- **H — Owner-submitted PMS costs** — the `/contribute` → Moderation → Supabase flow (the one database).
- **I — Helper scripts & offline tools** — `npm run generate` and the SEO opportunity report.

---

## PART A — The browser Admin panel

### A1. Logging in

1. Go to **https://www.apexenginehq.com/admin** (or `/admin/login`).
2. Enter your **admin password**. (This is the `ADMIN_PASSWORD` value stored in Vercel — see
   "Secrets" at the bottom. It is *not* your GitHub or Vercel account password.)
3. You stay logged in via a cookie until it expires or you switch browsers/devices.

If you ever forget it: go to Vercel → the Apex Engine project → **Settings → Environment
Variables → `ADMIN_PASSWORD`**, set a new value, and redeploy. Whatever you set there *is* the
new password.

The Admin pages are **not linked anywhere public** and sit behind this login, so visitors and
Google can't reach them.

### A2. The three tools on the Admin dashboard

Once logged in, `/admin` shows three cards:

**1) Publish a Post — `/admin/publish`**
Your main content tool. You paste an AI-written MDX article, and it:
- Checks the frontmatter (warns if `vertical`, title, description, or date is missing/wrong).
- Lists every image slot (hero + in-body figures) so you can attach real photos. Photos are
  auto-resized to ≤2000px and converted to WebP *in your browser* before upload.
- Lets you confirm the **slug** (the URL, e.g. `/blog/your-slug/`).
- On **Publish**, commits the article + photos to GitHub in one go → Vercel deploys → live.

Safety net: a broken paste can't take the site down. If the build fails, Vercel keeps the last
good version live. Worst case is "that one post didn't publish."

**2) All Posts — `/admin/posts`**
A table of every published post, newest first. Use it to:
- **Filter** by title/slug/vertical.
- See at a glance which posts still need schema data — the colored chips mean:
  - `Veh` = Vehicle specs · `PMS` = maintenance-cost data · `Prod` = affiliate products · `Photo`
  - **Green** = present · **Red** = missing · **Grey** = not used by that vertical · **Amber** = still a placeholder photo.
- The summary bar at the top counts how many posts still need work (missing Vehicle/PMS/photos).
- Click **Edit →** on any row to open that post in the Publish tool, change *anything* (text,
  specs, prices, images), and re-publish — it overwrites the live post.

**3) Moderation — `/admin/moderation`**
Where owner-submitted PMS cost contributions (from the public `/contribute` page) wait for your
approval before going live. Review each one and approve/reject. (This reads from Supabase, not
GitHub — it's the one part backed by a small database.)

### A3. The normal publishing workflow

1. Build your prompt (your prompt-builder tool) → paste into any AI chat → copy the MDX it returns.
2. Open `/admin/publish` → paste → **Scan** → fix any warnings.
3. Attach real photos to the slots you want (skip a slot to keep its placeholder).
4. Confirm/adjust the **slug**.
5. **Publish** → wait ~1–2 min → check it live at `/blog/your-slug/`.

---

## PART B — Managing it from the code (this repo)

Everything the site *is* lives in this folder. The parts you'll touch most:

```
apex-engine/
├─ src/
│  ├─ content/blog/         ← every blog post (.mdx / .md files) — the actual articles
│  ├─ content/models/       ← the model-catalog pages
│  ├─ consts.ts             ← SITE-WIDE SETTINGS (see B2) — edit this a lot
│  ├─ components/           ← reusable pieces: Header, Footer, BaseHead, cards…
│  ├─ layouts/              ← page shells: BlogPost.astro (post pages), Page.astro (plain pages)
│  ├─ pages/                ← one file = one URL (about, contact, privacy, /admin/*, etc.)
│  ├─ styles/apex.css       ← the ONE stylesheet / design system (colors, fonts, spacing)
│  └─ data/listings.ts      ← mock car inventory + the LISTINGS_LIVE on/off switch
├─ public/                  ← files served as-is: favicon, robots.txt, ads.txt
├─ astro.config.mjs         ← build config (domain, integrations)
└─ CLAUDE.md / *.md         ← project docs (incl. this guide)
```

### B1. A blog post is just a text file

Open any file in `src/content/blog/` (e.g. `toyota-vios-pms-guide.mdx`). The top part between
the `---` lines is the **frontmatter** (title, description, dates, `vertical`, specs, FAQ,
products). Below it is the article body in Markdown. Editing a post = editing this file. The
Admin "Edit" button just does this for you through the browser.

- **Internal links** in a post look like `[Vios PMS Guide](/blog/toyota-vios-pms-guide)`.
- The URL of a post = its filename (the "slug"). `honda-city-pms-guide.mdx` → `/blog/honda-city-pms-guide/`.

### B2. `src/consts.ts` — the site's control panel

This one file holds the settings you're most likely to change:
- `SITE_TITLE`, `SITE_DESCRIPTION`, `SITE_URL`
- `GA_MEASUREMENT_ID` (Google Analytics), `GOOGLE_SITE_VERIFICATION` (Search Console),
  `ADSENSE_CLIENT` (AdSense) — each feature stays off until its ID is filled in.
- `SOCIAL_LINKS` — your Facebook/Instagram URLs (used by the footer icons **and** your
  Organization schema). Add X/YouTube here later by uncommenting/adding a line.
- `ORG` — business name, email, phone, address (feeds structured data; blank fields are skipped).

### B3. How to make a code change go live

Two options:

**Option 1 — edit locally, then push (typical):**
```bash
# from the apex-engine folder
npm run dev        # opens http://localhost:4321 to preview changes live as you type
# …make your edits, check them in the browser…
npm run build      # optional: confirms the site builds cleanly before you ship
git add -A
git commit -m "describe what you changed"
git push origin main     # → Vercel auto-deploys to production
```

**Option 2 — edit the file directly on GitHub:** open the file at
`github.com/joshuajesivns/autowebsite`, click the pencil ✏️, commit to `main`. Vercel deploys.

> ⚠️ **`main` = production.** Any commit to `main` ships to the live site. To test something
> risky first, commit to a different branch (e.g. `preview/...`) — only `main` auto-deploys to
> the real domain; other branches get their own preview URL.

### B4. Useful commands (run inside the `apex-engine` folder)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Local preview at `localhost:4321`, live-reloads as you edit. |
| `npm run build` | Full production build into `dist/`. Catches errors before you push. |
| `npm run preview` | Serve the built `dist/` locally, exactly as it'll look live. |

---

## PART C — Site-wide behavior: links open in a new tab

**What:** every link on the public site now opens in a new browser tab.

**Where:** it's done in **one place** — a small script at the bottom of
`src/components/BaseHead.astro`. Because `BaseHead` is included in the `<head>` of every public
page, that single script covers the whole site: the nav menu, the footer, links inside blog
posts, product cards, and **any page or link you add in the future** — automatically. You never
have to add `target="_blank"` to links by hand again.

**Two deliberate exceptions** (these should *not* open a new tab, and the script skips them):
- Same-page jump links (`href="#section"`) — a new blank tab wouldn't even scroll.
- `mailto:` / `tel:` links — those open your mail/phone app, not a web page.

**Admin pages are excluded** on purpose (they don't use `BaseHead`), so your backend tools don't
spray new tabs while you work.

**How to tweak or undo it:** open `src/components/BaseHead.astro`, scroll to the commented block
near the bottom (`Open every link in a new tab`). To go back to the normal best-practice behavior
(only *external* links open in new tabs, your own pages stay in the same tab), replace the line:

```js
if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
```

with one that also skips your own domain:

```js
if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
// also keep same-site links in the same tab:
if (href.startsWith('/') || href.includes('apexenginehq.com')) continue;
```

To remove the feature entirely, delete the whole commented `<script>` block. Then rebuild/redeploy.

---

## PART D — Secrets & environment variables

These live in **Vercel → Project → Settings → Environment Variables** (and mirrored in the local
`.env` file, which is git-ignored and never committed). Names only — never paste the values into
code or share them:

| Variable | What it unlocks |
|----------|-----------------|
| `ADMIN_PASSWORD` | Your `/admin` login. Change here to reset the password. |
| `GITHUB_TOKEN` | Lets the Publish tool commit posts to the repo. See `PUBLISH_TOOL_SETUP.md`. |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` | The small database behind `/contribute` submissions + Moderation. |
| `OPENAI_API_KEY` | Used by helper scripts (content generation), not the live site. |

After changing any variable in Vercel, **redeploy** (Deployments → ⋯ → Redeploy) so it takes effect.

---

## PART E — Quick troubleshooting

- **A change didn't show up live.** Check Vercel → Deployments. A red/failed build means the last
  good version is still live (good!). Click the failed build to read the error.
- **Publish tool won't publish.** Almost always the `GITHUB_TOKEN` is missing or expired — see
  `PUBLISH_TOOL_SETUP.md` to mint a new one and update it in Vercel.
- **Locked out of `/admin`.** Reset `ADMIN_PASSWORD` in Vercel and redeploy.
- **A post looks broken.** Open its file in `src/content/blog/`, check the frontmatter between the
  `---` lines is valid, or re-open it via `/admin/posts → Edit`.
- **Where's the design?** All colors, fonts, and spacing are in `src/styles/apex.css`.

---

## PART F — Under the hood: how publishing actually works

*You don't need this to publish — Part A covers that. This is for understanding or changing the
machinery behind the `/admin/publish` button.*

The publish tool is deliberately split so the tricky logic is testable and the network code is
tiny. Four files do the work:

| File | Job |
|------|-----|
| `src/pages/admin/publish.astro` | The browser page (the form + preview UI you interact with). |
| `src/pages/api/admin/publish.ts` | The server endpoint. Handles four actions (below). Guards every call behind your admin session. |
| `src/lib/publish.ts` | **Pure logic** — parse frontmatter, validate, slugify, detect image slots, the SEO analysis, and read/write the structured schema blocks. No network calls, so it's easy to reason about. |
| `src/lib/github.ts` | **The only network code** — commits files to GitHub via its API. |

### F1. The four actions

Everything the page does is one of four POSTs to `/api/admin/publish`:

- **`scan`** — takes your pasted MDX and returns everything the review screen shows: validation
  errors, the parsed title/description/vertical, the derived slug (and whether it's already taken),
  the list of image slots, a Google-snippet preview, and the full **SEO analysis** (see F3). No
  GitHub token needed — it reads existing posts straight from the content collection.
- **`load`** — fetches an existing post's raw MDX from GitHub so you can **edit it in place**
  (this is what the "Edit →" button on `/admin/posts` triggers).
- **`upload-blob`** — takes one already-downscaled image, uploads it to GitHub as a git *blob*,
  and hands back the blob's SHA. The browser resizes each photo to ≤2000px WebP *before* this, so
  uploads stay small; the server still enforces an 8 MB hard cap as a backstop.
- **`publish`** — the commit. See F2.

### F2. A publish is one atomic commit

`publish` never touches files one at a time. It:

1. Rewrites the MDX so any uploaded image points at the post's own folder
   (`src/assets/blog/<slug>/hero.webp`, etc.); slots you left empty keep their placeholder.
2. Bakes in the alt text you typed (hero alt → frontmatter, body alts → each `<Figure>`/`<Split>` tag).
3. Merges the structured schema blocks (`vehicle` / `pms` / `featuredProducts`) from the form into
   the frontmatter.
4. Bundles the `.mdx` file **and** every uploaded image into **one commit** via GitHub's Git Data
   API (blobs → tree → commit → move branch). Either the whole post lands or nothing does — you can
   never end up with an article live but its images missing.

Two safety rails, both in `publish.ts`/`publish.ts` API:
- **Create mode refuses to overwrite** an existing slug (returns a 409). **Edit mode requires** the
  slug to already exist. So a new post can't silently clobber an old one, and an "edit" can't
  accidentally create a stray file.
- The commit targets `GH_BRANCH`, which is `main` unless you set `PUBLISH_BRANCH` to a throwaway
  branch (see `PUBLISH_TOOL_SETUP.md` → "safe first test"). Only `main` auto-deploys.

### F3. The Scan screen's "SEO analysis" is advisory only

Everything on the traffic-light panel (`analyzePost` in `src/lib/publish.ts`) is **advice, not a
gate** — it can warn all it likes and you can still publish. Only `validatePost` blocks a publish,
and it only blocks on things that would actually break the build: a missing frontmatter block, or a
missing/invalid `vertical`, `title`, `description`, or `pubDate`.

What the advisory panel checks, all mirroring `CONTENT_STYLE_GUIDE.md`:
- **Title/description character counts** against the meta formula (title 55–58, description
  155–158, "Apex Engine" exactly once).
- **Required sections per vertical** — e.g. Daily Driver wants Quick Specs, Light-vs-Heavy PMS,
  Known Issues; JDM wants upgrade paths, parts sourcing, buying guide, etc. Matched loosely against
  your H2/H3 headings.
- **Images** — hero present? alt text on every image? still on a placeholder?
- **Schema preview** — which JSON-LD nodes this post *will* emit (see Part G).
- **Internal links** — counts them, **flags any `/blog/` or `/models/` link whose target doesn't
  exist** (the recurring "bottom links must point to real slugs or they 404" problem, now caught
  automatically), nudges you when the same anchor text is reused verbatim, and suggests related
  posts you could link based on shared vertical/brand/tags.

Because it reads the real post + model slug lists and the real `RECIPE` from `schema.ts`, its
"broken link" and "which schema will emit" answers are accurate, not guesses.

---

## PART G — The structured-data (JSON-LD) engine

*This is what makes posts eligible for rich results and AI Overviews. The whole system lives in
one file — `src/lib/schema.ts` — plus the frontmatter shapes in `src/content.config.ts`.*

### G1. One graph per post

Every blog page renders a single JSON-LD `@graph`: an **Article**, and — depending on the post —
the **Vehicle** it's about, the **HowTo** procedures (Light + Heavy PMS) it explains, the
**Questions** it answers (FAQ), and the **Products** it recommends. The site-wide **Organization**
and **WebSite** are declared once in `BaseHead.astro`; everything in `schema.ts` references them by
`@id` instead of re-declaring them, so Google reads the whole thing as one connected entity.

### G2. The RECIPE table decides what each vertical may emit

```
                vehicle   howto(PMS)   products
daily-driver      ✓          ✓            ✓
ev                ✓          ✗            ✓
jdm               ✓          ✗            ✓
news              ✗          ✗            ✗
```

Two independent conditions must both be true for an entity to appear:
1. **The vertical allows it** (the table above), **and**
2. **the data is actually present** in the frontmatter.

So a `news` post never emits a Vehicle even if you added vehicle data, and a `daily-driver` post
with no `pms:` block simply emits no HowTo. The markup can never describe something the vertical
shouldn't carry, and never describes data that isn't there. **To change what a vertical emits, you
edit the `RECIPE` table and (if adding a new entity type) add a small builder function — nothing
else in the site changes.**

### G3. The frontmatter that feeds it (`src/content.config.ts`)

The content collection schema is the contract — a post that violates it **fails the build**, so a
mistake is caught before it can deploy. The fields that matter for schema:

- **`vertical`** *(required)* — `daily-driver | ev | jdm | news`. This one field selects the whole
  entity mix. Forgetting it fails the build on purpose.
- **`vehicle`** *(optional block)* — `name`, `brand`, `model`, plus optional `bodyType`,
  `fuelType`, `transmission`, `drivetrain` (FWD/RWD/AWD/4WD), and an `engines:` list. Feeds the
  **Vehicle** node (and the Quick Specs table).
- **`pms`** *(optional, Daily Driver only)* — `currency` + `light`/`heavy` services, each with
  `interval`, numeric `costMin`/`costMax`, and optional `steps`. Costs are **numbers, not `"1,500"`
  strings**, so the `MonetaryAmount` stays clean; the peso formatting happens in the visible prose,
  not here. Feeds the **HowTo** nodes.
- **`faq`** *(optional)* — `q`/`a` pairs → a visible FAQ section **and** the **FAQPage** schema.
- **`featuredProducts`** *(optional)* — affiliate picks. Renders the visible "Recommended parts"
  section **and** the `ItemList`/`Product` schema from the *same* data (so markup can't describe a
  product a reader can't see — the mismatch Google penalizes). **No `price` field on purpose** —
  affiliate prices go stale and become a liability; only the affiliate `url` is carried.

> Most existing posts leave `pms` and `featuredProducts` empty — those nodes are **dormant until
> populated** (via the publish tool's structured-fields form). A post with only base frontmatter is
> perfectly valid; it just emits a leaner graph.

---

## PART H — Owner-submitted PMS costs: `/contribute` → Moderation → Supabase

*This is the **only** part of Apex Engine backed by a live database. Everything else is static
files. It exists to collect real-world PMS prices from owners to replace the "average casa price,
verify with dealer" estimates in the guides — and, later, to feed an ownership-cost calculator.*

### H1. The flow, end to end

```
Public /contribute form
   │  (fetch POST, JSON)
   ▼
/api/pms-report        ← validates every field, drops bot submissions, writes the row
   │
   ▼
Supabase table `pms_reports`   status = 'pending'
   │
   ▼
/admin/moderation      ← you review each pending row (behind admin login)
   │  Approve / Reject  → POST /api/admin/moderate
   ▼
row status = 'approved' | 'rejected'
```

### H2. The pieces

- **`src/pages/contribute.astro`** — the public form (make, model, year, service type, mileage,
  amount paid, casa vs independent, optional region/date/notes). Submits via `fetch` to the API and
  swaps in a "thanks, it's in the queue" message. Includes a **honeypot**: a hidden `website` field
  real users never see; a bot that autofills it gets a fake success and is silently dropped.
- **`src/pages/api/pms-report.ts`** — the write endpoint. Re-validates *everything* server-side
  (year 1990–2100, service type in {light, major, other}, positive amount, casa/independent, etc.)
  and inserts the row using the **public** Supabase key.
- **`src/lib/supabase.ts`** — two clients: `getPublicSupabase()` (the publishable key, safe, used by
  the write endpoint) and `getAdminSupabase()` (the **secret** key that bypasses row-level security,
  server-only, used by moderation).
- **`src/pages/admin/moderation.astro`** — lists `status = 'pending'` rows oldest-first, with
  Approve/Reject buttons.
- **`src/pages/api/admin/moderate.ts`** — flips a row to `approved`/`rejected`. Guarded by the admin
  session cookie.
- **`supabase/schema.sql`** — the table definition. Run it once (below).

### H3. Why it's safe (the security model)

Row-level security is on, and the two keys have very different power:
- The **public key** can only **insert**, and the policy **forces every new row to `status =
  'pending'`** no matter what the client sends. There is **no public SELECT policy**, so the public
  key can never *read back* submissions — approved or not — through the site.
- The **secret key** (moderation only) bypasses RLS entirely. It must stay server-side; it's never
  imported into any client script and never sent to the browser.

### H4. One-time database setup

If you're wiring this up on a fresh Supabase project:
1. Create a project at supabase.com. From **Project Settings → API**, copy the **Project URL**, the
   **publishable/anon key**, and the **service_role/secret key**.
2. Put them in Vercel (and local `.env`) as `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY`. Redeploy.
3. Open **Supabase → SQL Editor → New query**, paste the contents of `supabase/schema.sql`, run it
   once. That creates the `pms_reports` table, its indexes, and the insert-only RLS policy.

### H5. Current status

The data is collected and moderated but **not yet displayed anywhere public** — approved rows sit
in the table waiting for the ownership-cost calculator that will consume them. So "approve" today
just means "this looks plausible, keep it"; nothing goes live on the site as a result yet. My notes
flag this whole flow as **not yet exercised end-to-end** — if you're relying on it, do a real
test submission → moderate it → confirm the status flip before trusting it in production.

---

## PART I — Helper scripts & offline tools (not part of the live site)

These run on your PC, never on Vercel. They're optional utilities, not part of what visitors touch.

### I1. `npm run generate` — AI draft generator (`scripts/generate-blog.js`)

An interactive command-line tool that asks for a mode (Technical Review / Culture Story / How-To /
Market Insight), a topic, and your "human insights," then calls OpenAI (`gpt-4o`) to write a full
MDX draft into `src/content/blog/`. Needs `OPENAI_API_KEY` in `.env`.

> This is an **older/fallback authoring path**. The current workflow is: draft in any AI chat →
> paste into `/admin/publish` (which adds schema, images, alt text, and the SEO checks this script
> doesn't). Treat `npm run generate` as a quick-draft convenience, not the main pipeline — anything
> it produces still wants a pass through the publish tool.

### I2. The SEO opportunity report (`tools/seo-report/`)

A **self-contained** Node tool (its own `package.json`, its own `node_modules`) that pulls Google
Search Console + GA4 + PageSpeed data, joins them by URL, and produces a ranked "what to optimize
next" HTML report — this is exactly what surfaced the "heavy pms" pages that were getting
impressions but zero clicks. It has its own **`tools/seo-report/README.md`** with full setup
(Google Cloud project, service account, granting it Viewer access to GA4 + Search Console). In
short:

```bash
cd tools/seo-report
npm install
npm run report      # → output/report-<date>.html
```

Its secrets (`service-account.json`, `config.json`, `output/`) are git-ignored and live only on
your PC — never committed. Run it roughly weekly so it can show position trends over time.

---

*Last updated: 2026-07-23.*
