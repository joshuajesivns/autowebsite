# Apex Engine — Backend Guide (Plain-English Edition)

This guide assumes you know **nothing** about code, Astro, or how websites are built — because
you don't need to. Everything here was set up for you. Your job is to *run* the site, not to
build it. This explains, in normal words, how it works and what you can do yourself.

Keep this file — it lives in your project folder next to `CLAUDE.md`.

---

## 1. The one-minute version

Apex Engine is your car website, live at **https://www.apexenginehq.com**.

Think of it like a **printed magazine**, not a live kitchen:

- Every page is "printed" ahead of time into finished pages. When someone visits, they just get
  the already-printed page. That's why the site is **fast** and **very hard to break** — there's no
  live machinery running that can crash.
- When you publish or change something, the whole magazine gets **re-printed automatically** and
  the new edition appears online in about **1–2 minutes**. You never do the printing yourself.

There is **no server you have to babysit**, no "is the site down?" panic. If a change ever goes
wrong, the last good version simply stays up.

You control all of this in **three ways**, easiest first:

| Way | Use it for | What you need |
|-----|-----------|---------------|
| **The Admin panel** (a website page: `/admin`) | Publishing and editing posts, approving reader submissions. This is 90% of what you'll do. | A web browser + your admin password. |
| **Asking Claude Code** (me) | Anything else — design tweaks, new features, fixing something odd, adding a page. | Open Claude Code in this folder and describe what you want in plain English. |
| **Editing the files by hand** | You almost certainly won't. | (Skip it — that's what asking me is for.) |

---

## 2. A few words you'll bump into (read once, refer back later)

You don't need to memorize these. When you see one and go "huh?", come back here.

- **The repo (or "GitHub")** — the safe, master copy of your entire website, stored in the cloud.
  Your site's repo is called **`autowebsite`**. Think of it as the master magazine binder that
  nobody can lose.
- **A commit** — one saved change to that master copy, with a short note about what changed. Every
  commit is kept forever, so you can always look back or undo.
- **`main`** — the "live edition." Anything saved to `main` becomes the real, public website.
- **Deploy** — the automatic re-printing. A change lands on `main` → the site re-builds → it's live.
- **Vercel** — the company that does the re-printing and hosts the site (the "printing press +
  newsstand"). It watches your repo and re-prints automatically. You'll log into it only to change
  a password or check why a change didn't appear.
- **Static site** — the "printed magazine" idea above: pages are made in advance. (Just so the word
  isn't scary if you see it.)
- **A post** — one blog article. Behind the scenes it's a single text file, but you'll almost always
  handle it through the Admin panel, not as a file.
- **Frontmatter** — the little settings block at the very top of a post (its title, description,
  date, which category it is). The Admin panel fills this in and checks it for you.
- **Schema / structured data** — invisible labels on a page that tell Google "this is a car, this
  is its maintenance cost, these are the FAQs." It's what helps you show up in Google's rich results
  and AI answers. It's fully automatic — you never write it.
- **Environment variable / secret** — a password or key (like your admin password) kept in a locked
  drawer at Vercel, never written into the website itself.
- **Supabase** — a small separate notebook (a database) used for **one** feature only: collecting
  maintenance-cost reports from readers. Everything else on the site needs no database.

---

## 3. The Admin panel — your main tool

### 3.1 Logging in

1. Go to **https://www.apexenginehq.com/admin**.
2. Type your **admin password**. (This is *not* your Google, GitHub, or Vercel password — it's a
   separate one, stored at Vercel. See §7 if you ever need to reset it.)
3. You stay logged in for a while via your browser. Switch devices or wait too long and you'll log
   in again.

These admin pages are **not linked anywhere public** and sit behind that password, so random
visitors and Google can't reach them.

### 3.2 The three cards you'll see

Once logged in, `/admin` shows three tools:

**① Publish a Post** — your main content tool. You paste in an article (the kind of MDX article an
AI chat writes for you), and it:
- Checks the settings block at the top and warns you if anything's missing or wrong.
- Shows a **Google preview** — what your post will look like in search results — and simple
  green/amber/red checks for things like title length and whether you linked to other posts.
- Lists every image slot so you can attach real photos (they get shrunk and optimized *in your
  browser* before uploading — you don't resize anything yourself).
- Lets you confirm the **web address** for the post.
- On **Publish**, it saves the article + photos and the site re-prints. Live in a minute or two.

**Can't break the site:** if a bad paste somehow wouldn't build, the last good version of the site
just stays up. Worst case is "that one post didn't publish."

**② All Posts** — a table of everything you've published, newest first. You can:
- Search by title.
- See at a glance which posts are still missing things — little colored chips show whether a post
  has its car specs, maintenance-cost data, product links, and a real photo (green = has it, red =
  missing, amber = still a placeholder photo).
- Click **Edit** on any post to reopen it, change *anything*, and re-publish over the old version.

**③ Moderation** — where maintenance-cost reports submitted by readers (from the public
"Contribute" page) wait for your yes/no before they're used. You approve or reject each one. (This
is the one feature backed by that small Supabase notebook — see §6.)

### 3.3 Your normal publishing routine

1. Get an article written (paste your prompt into any AI chat → copy the article it gives you).
2. Open **Publish a Post** → paste it → click **Scan** → fix anything it flags.
3. Attach real photos to any slots you want (skip one to keep its placeholder image).
4. Confirm the web address.
5. Click **Publish** → wait ~1–2 minutes → check it live.

That's the whole loop. You never touch code to publish.

---

## 4. Changing anything else — just ask me (Claude Code)

Design changes, a new page, fixing a broken link, adjusting the menu, a new feature — you don't edit
files for these. **Open Claude Code in the `apex-engine` folder and describe what you want in plain
English**, e.g.:

> "Make the footer say 2026 instead of 2025."
> "Add a new page called 'Advertise with us.'"
> "The Fortuner post links to a page that doesn't exist — fix it."

I'll make the change, show you, and (with your OK) publish it live. This is exactly how everything
here got built. **You are not expected to write or read code.**

If you ever *do* want to peek or make a tiny text change yourself, there's a slower manual path in
§8 — but asking me is almost always the better move.

---

## 5. When something looks wrong (don't panic)

The site is very hard to actually break. Here's the plain-English version of the usual worries:

- **"I published/changed something and it's not showing up."** Give it 2 minutes (the re-print takes
  a bit). Still nothing? The re-print may have failed — which means the *old good version is still
  live* (that's the safety net working). Tell me and I'll check what went wrong.
- **"The Publish button won't publish."** This is almost always one expired behind-the-scenes key
  (the one that lets the tool save posts). It's a 2-minute fix — tell me, or follow
  `PUBLISH_TOOL_SETUP.md`.
- **"I'm locked out of /admin."** Reset the admin password at Vercel (§7).
- **"A post looks broken."** Reopen it in **All Posts → Edit** and re-publish, or tell me and I'll
  fix it.
- **Anything else.** Tell me what you see (a screenshot helps) and what you expected. I can look at
  the site, the settings, and the history and sort it out.

**The golden rule:** you can't permanently break anything by trying. Every change is saved as its
own version, so we can always go back.

---

## 6. Reader-submitted maintenance costs (the "Contribute" feature)

This is the **only** part of the site that uses a database. Here's what happens, in plain terms:

1. A reader fills in the public **Contribute** form (what car, what service, what they paid).
2. Their report drops into a **pending** pile — it does **not** go live automatically.
3. You review the pending pile under **Admin → Moderation** and click **Approve** or **Reject**.

Why it's safe: readers can only *add* reports, and every report starts as "pending" no matter what.
Readers can never read other people's submissions or make anything go live — only you can, from the
password-protected Moderation page.

**Honest status:** right now, approved reports are collected and stored, but they aren't *shown*
anywhere on the site yet — they're being gathered for a future "how much does this car cost to own"
calculator. So today, "Approve" just means "this looks legit, keep it." Also, this whole flow hasn't
been fully tested start-to-finish yet, so if you want to rely on it, do one real test submission and
approve it, and tell me if anything seems off.

---

## 7. Passwords & keys (where the "locked drawer" is)

A few passwords/keys make the site work. They're **never** written into the website — they live in a
locked drawer at **Vercel** (Vercel → your Apex Engine project → **Settings → Environment
Variables**). You'll rarely open this drawer. What's in it:

- **Admin password** — your `/admin` login. To change it: edit it here, then click **Redeploy**.
  Whatever you set becomes the new password.
- **The publish key** — lets the Publish tool save your posts. If publishing stops working, this is
  usually the culprit (it expired). `PUBLISH_TOOL_SETUP.md` walks through making a new one.
- **The Supabase keys** — power the Contribute/Moderation feature.
- **An OpenAI key** — used only by an optional draft-writing helper on a PC, never by the live site.

Whenever you change anything in this drawer, click **Redeploy** afterward so it takes effect. If any
of this feels fiddly, just tell me which one and why — I'll guide you click by click.

---

## 8. Under the hood — you can safely skip this

*Everything below is for a developer, or for me (Claude) to reference. You do not need to read it to
run the site. It's here so the knowledge isn't lost, not because you're expected to use it.*

### 8.1 The manual code path (if you ever want it)

Everything the site *is* lives in the `apex-engine` folder. Posts are text files in
`src/content/blog/`. Site-wide settings (site name, Google Analytics ID, social links) live in
`src/consts.ts`. The look (colors, fonts) is all in `src/styles/apex.css`.

To preview changes on your own PC before they're public: open a terminal in the folder and run
`npm run dev`, then visit `http://localhost:4321`. To make a change public, it has to be saved
("committed") to `main`, which you can do from Claude Code or directly on GitHub. Only `main` goes
live; other branches get a private preview link.

### 8.2 How publishing works internally

The Publish tool is a browser page backed by a small server routine. When you hit Publish, it
rewrites the post to point at your uploaded photos, adds your alt text and the structured-data
fields, and saves the article **and** all its images together as one single save — so you can never
end up with an article live but its pictures missing. It refuses to overwrite an existing post
unless you're explicitly editing that post. The green/amber/red "SEO" checks on the Scan screen are
just advice; only genuinely broken settings (missing title, bad date, missing category) actually
stop a publish.

### 8.3 The structured-data (Google labels) engine

Each post declares a category ("vertical"): **daily-driver**, **ev**, **jdm**, or **news**. That one
choice decides which invisible Google labels the page carries — e.g. daily-driver car guides get
car specs, maintenance-cost, FAQ, and product labels; news posts stay lean. A label only appears if
both the category allows it *and* you've filled in that data. It's all generated automatically from
one file (`src/lib/schema.ts`); the categories and required fields are defined in
`src/content.config.ts`.

### 8.4 The Contribute → Moderation database

The reader form saves to a Supabase table called `pms_reports`, always as "pending." Readers use a
limited key that can only add rows (and can't read them back); the Moderation page uses a separate
powerful key, kept server-side, to read the pending pile and mark rows approved/rejected. The table
is defined in `supabase/schema.sql` and is set up once in Supabase's SQL editor.

### 8.5 Optional PC-only tools (not part of the live site)

- **`npm run generate`** — an older command-line helper that drafts an article with AI. The Admin
  Publish tool is the better path now; this is just a quick-draft convenience.
- **`tools/seo-report/`** — a separate report tool that pulls your Google Search Console + Analytics
  data and ranks which pages to improve next. It has its own setup guide in
  `tools/seo-report/README.md`.

---

*Last updated: 2026-07-23. Written to be readable with zero coding background — if any part still
reads like jargon, tell me and I'll plain-English it further.*
