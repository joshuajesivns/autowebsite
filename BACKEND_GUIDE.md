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

## PART C — The change we just made: "all links open in a new tab"

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

*Last updated: 2026-07-22.*
