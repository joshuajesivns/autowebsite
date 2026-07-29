# Astro for Dummies — Navigating Apex Engine's Code

`BACKEND_GUIDE.md` teaches you how to **run** this site without touching code. This guide is the
next step up: how to **find your way around** the code itself, so when you open the `apex-engine`
folder you're reading a map instead of staring at mystery.

You do not need to learn to write code to use this. The goal is that you can open the folder, think
*"I want to change the footer,"* and know exactly which file to open. That's navigation — and it's
90% of feeling in control of your own site.

**Read this once with the folder open next to you.** It'll click faster.

---

## 0. First: you cannot break anything by looking

This is the single most important thing to know, because fear is what stops people exploring.

- **Opening and reading a file changes nothing.** Ever.
- Even if you *edit* a file on your PC, the public site does not change. The live site only updates
  when a change is **committed and pushed to `main`** (see §9). Your local folder is a private
  sandbox.
- If you mess up a file while poking around, `git checkout <filename>` throws away your changes and
  restores it — or just ask me to reset it.

So: click around freely. Read everything. The worst case is confusion, not damage.

---

## 1. The one idea that unlocks Astro

Most website systems (WordPress, for instance) keep your pages in a hidden database. **Astro doesn't.
In Astro, the folder tree *is* the website.**

One rule explains most of it:

> **A file's location inside `src/pages/` becomes its web address.**

That's called *file-based routing*, and once you see it you can't unsee it:

| The file on your PC | The page on the internet |
|---|---|
| `src/pages/index.astro` | `apexenginehq.com/` (the homepage) |
| `src/pages/about.astro` | `apexenginehq.com/about/` |
| `src/pages/contact.astro` | `apexenginehq.com/contact/` |
| `src/pages/privacy.astro` | `apexenginehq.com/privacy/` |
| `src/pages/blog/index.astro` | `apexenginehq.com/blog/` (the article list) |
| `src/pages/admin/publish.astro` | `apexenginehq.com/admin/publish/` |
| `src/pages/models/index.astro` | `apexenginehq.com/models/` |

Folder name → path segment. File name → last part of the address. `index` means "the folder itself."

**Practical payoff:** any time you see a URL on your own site and wonder where it comes from, you can
now find it. `/contribute/` → `src/pages/contribute.astro`. Done. And the reverse: if a file isn't
in `src/pages/`, **it is not a page** — it's a building block used *by* pages.

---

## 2. The 60-second map of `src/`

Everything that makes your site what it is lives in `src/`. Nine folders, and here's the honest
one-line version of each:

```
src/
├── pages/        THE WEBSITE'S ADDRESSES. Every file here = a real URL.
├── content/      YOUR WRITING. Blog posts (45 of them) + model pages, as text files.
├── layouts/      PAGE SKELETONS. The reusable shell a page is poured into.
├── components/   REUSABLE PIECES. Header, footer, figures, cards.
├── styles/       THE LOOK. One file: apex.css — all colors, fonts, spacing.
├── lib/          THE MACHINERY. Behind-the-scenes logic (schema, publishing, login).
├── assets/       IMAGES + FONTS that the build optimizes for you.
├── data/         SPREADSHEET-ISH DATA. Listings, vehicle JSON files.
└── consts.ts     SITE-WIDE SETTINGS. Site name, Google IDs, social links.
```

If you remember only two: **`pages/` = addresses**, **`content/` = your writing**. Those are the two
you'd ever actually visit.

---

## 3. "I want to change X" → open this file

This is the section to bookmark. It's the whole guide in table form.

### Content and words

| What you want to change | File to open |
|---|---|
| A blog post's text | `src/content/blog/<post-name>.mdx` |
| A model catalog entry (e.g. the AE86 page) | `src/content/models/<model>.mdx` |
| The homepage's headline and sections | `src/pages/index.astro` |
| The About / Contact / Privacy / Terms wording | `src/pages/about.astro`, `contact.astro`, etc. |
| The blog index page's intro copy | `src/pages/blog/index.astro` |
| The public "Contribute your PMS cost" form page | `src/pages/contribute.astro` |

### Look and feel

| What you want to change | File to open |
|---|---|
| **Any color, font, spacing, button style** | `src/styles/apex.css` — the only styling file |
| The top navigation menu (links, order) | `src/components/Header.astro` |
| The footer (copyright year, social icons, links) | `src/components/Footer.astro` |
| The logo | `src/components/Logo.astro` |
| How a blog post page is laid out (hero image, byline, FAQ position) | `src/layouts/BlogPost.astro` |
| How every *other* page is laid out | `src/layouts/Page.astro` |

### Settings and site-wide plumbing

| What you want to change | File to open |
|---|---|
| Site name, tagline, Google Analytics ID, AdSense ID, social profile URLs, business email | `src/consts.ts` |
| What Google sees in the page `<head>` (meta tags, Analytics snippet) | `src/components/BaseHead.astro` |
| The rules a blog post must follow (which fields are required) | `src/content.config.ts` |
| The invisible Google/AI structured-data labels | `src/lib/schema.ts` |
| Whether the listings marketplace is switched on | `src/data/listings.ts` → `LISTINGS_LIVE` |
| Astro's own build settings (domain, integrations, fonts) | `astro.config.mjs` (repo root) |

### The admin panel

| What you want to change | File to open |
|---|---|
| The `/admin` landing page with the three cards | `src/pages/admin/index.astro` |
| The publish tool's screen | `src/pages/admin/publish.astro` |
| The "All Posts" table | `src/pages/admin/posts.astro` |
| The moderation queue screen | `src/pages/admin/moderation.astro` |
| What actually happens when you click Publish | `src/pages/api/admin/publish.ts` + `src/lib/publish.ts` |

**You can always just ask me instead** — "change the footer year" gets it done without you opening
anything. But knowing *where* it lives means you can check my work, and that's worth having.

---

## 4. How to read an `.astro` file (the sandwich)

Open `src/pages/blog/[...slug].astro`. It's only 20 lines, and it's the perfect teaching example:

```astro
---
import { getCollection, render } from 'astro:content';
import BlogPost from '../../layouts/BlogPost.astro';

export async function getStaticPaths() {
    const posts = await getCollection('blog');
    return posts.map((post) => ({ params: { slug: post.id }, props: post }));
}

const post = Astro.props;
const { Content } = await render(post);
---

<BlogPost {...post.data}>
    <Content />
</BlogPost>
```

Every `.astro` file is a **sandwich with one divider**: those three dashes `---`.

- **Above the `---` = the instructions.** "Fetch me all 45 blog posts. Load the layout." This part
  runs once when the site is being built, on the build machine. Visitors never see it. This is the
  part that looks like programming, and it's the part you can safely ignore.
- **Below the `---` = what the page actually looks like.** This is HTML — the same angle-bracket
  language every web page is made of. `<h1>Hello</h1>` is a big heading. This is the part you'd
  realistically edit.

Two symbols to recognize below the line:

- `<BlogPost>` — a capital-letter tag is **another file being dropped in**. Look at the imports above
  the `---` to see which file. Here it's `layouts/BlogPost.astro`.
- `{something}` — curly braces mean **"insert a real value here."** So `{post.data.title}` prints the
  post's actual title. Braces = a blank being filled in.

That's genuinely it. Instructions on top, appearance on the bottom, capital tags pull in other files,
curly braces fill in blanks.

---

## 5. The weird filenames, decoded

Three naming patterns in `src/pages/` confuse everyone at first.

**`index.astro` = "the folder itself."**
`src/pages/blog/index.astro` is the page at `/blog/`, not `/blog/index/`. Same idea as a shop's front
desk.

**`[slug].astro` = one template, many pages.** Square brackets mean *"this part of the address is a
blank."* You have exactly one file at `src/pages/models/[slug].astro`, and it generates **every**
model page — `/models/toyota-ae86-trueno/`, `/models/toyota-vios/`, and so on. Astro looks at your
content files, finds five models, and stamps out five pages from that one template.

This is the biggest mental shift from WordPress, and it's a feature: **fix the template once, and all
45 blog posts improve at the same time.** That's how your structured-data upgrade rolled out across
every post in one go.

**`[...slug].astro` = the same thing, but the blank can contain slashes.** The three dots mean "match
however many segments." Used for blog posts so nested addresses would still work.

**How the pieces stack for one blog post.** When someone opens
`/blog/toyota-rush-pms-guide/`:

```
src/content/blog/toyota-rush-pms-guide.mdx   ← your words
        ↓  picked up by
src/pages/blog/[...slug].astro               ← the template that makes post pages
        ↓  poured into
src/layouts/BlogPost.astro                   ← the post skeleton (hero, date, FAQ, schema)
        ↓  which itself pulls in
src/components/BaseHead.astro  (the <head>: meta tags, Analytics)
src/components/Header.astro    (top nav)
src/components/Footer.astro    (footer)
src/styles/apex.css            (all the styling)
```

Read that chain top to bottom and you understand how any page on your site is assembled. Ordinary
pages (About, Contact, all the admin screens) use `layouts/Page.astro` instead of `BlogPost.astro` —
same idea, simpler skeleton, no hero image or schema.

---

## 6. Pages vs. Layouts vs. Components

Three folders that sound similar. The difference is just *scope*:

- **A component** is one small piece, reused anywhere. `Footer.astro` is a component — it appears on
  every page, and it's written once.
- **A layout** is a whole-page skeleton. It defines the arrangement — head, header, the content hole,
  footer. You have two: `BlogPost.astro` (for articles) and `Page.astro` (for everything else).
- **A page** is one actual address, which chooses a layout and fills it with specific content.

The magazine analogy from the other guide still works: components are the recurring furniture (the
page-number strip, the masthead), a layout is the blank page template, and a page is one printed page
with real words on it.

**Why this matters to you:** it tells you *where to change something so it changes everywhere*. Want
the footer different on all 50+ pages? One edit to `Footer.astro`. Want it different on just the
About page? That's a change in `about.astro`. Knowing which of those you want is the actual skill.

---

## 7. Why your blog posts aren't in `pages/`

This surprises people: your 45 articles are in `src/content/blog/`, not `src/pages/`. That's
deliberate, and it's the concept Astro calls a **content collection**.

The reasoning: a blog post isn't really a *page*, it's a *record* — a title, a date, a description,
some tags, and a body. Keeping them as records means Astro can do things it can't do with loose
pages: sort them by date, filter by tag, build the RSS feed, list them on `/blog/`, and — crucially —
**check them for mistakes**.

That checking is `src/content.config.ts`, and it's worth understanding because it's your safety net.
It's the **rulebook every post must satisfy**. In plain terms it says:

- Every post **must** have a `title`, a `description`, a `pubDate`, and a `vertical`.
- `vertical` must be exactly one of `daily-driver`, `ev`, `jdm`, or `news` — a typo like `dailydriver`
  is rejected.
- Optional extras are allowed if present and correctly shaped: `updatedDate`, `heroImage`, `heroAlt`,
  `tags`, `faq`, `vehicle` (the car spec block), `pms` (service cost data), `featuredProducts`
  (affiliate picks).

**If a post breaks a rule, the build fails and the site does not deploy.** That sounds alarming; it's
actually the best feature in your whole setup. A broken post can never reach the public — it gets
stopped on the build machine, and the last good version of your site stays live. That's why the guide
says you can't break the site by publishing something odd.

The settings block at the top of every `.mdx` post — between the `---` lines — is what gets checked
against that rulebook. That block is called **frontmatter**. The Publish tool fills it in for you and
warns you before you submit.

---

## 8. Actually walking around: `npm run dev`

Here's how you explore the site live, on your own PC, with zero risk.

1. Open a terminal in the `apex-engine` folder.
2. Run: `npm run dev`
3. Open **http://localhost:4321** in your browser.

That's your own private copy of the entire website, running on your machine. Nobody else can see it.
Now the magic part: **edit any file, hit save, and the browser updates instantly.** Change a heading
in `about.astro`, save, and watch it change. That immediate feedback loop is the fastest way to learn
which file controls what — far faster than reading about it.

To stop it, press `Ctrl+C` in the terminal.

**One gotcha specific to your site:** addresses need the trailing slash locally. `http://localhost:4321/blog/toyota-rush-pms-guide/`
works; the same URL without the final `/` gives a 404 in dev. That's your `trailingSlash: 'always'`
setting, which exists on purpose — it matches what Vercel enforces in production, and it's what fixed
your Google Search Console duplicate-page problem. Live, Vercel redirects the no-slash version
automatically, so this only ever bites you locally.

Other commands you'll see:

- `npm run build` — do the full "print the magazine" run into a `dist/` folder. **This is your test
  before publishing.** If it completes, your changes are structurally sound.
- `npm run preview` — view what `npm run build` produced, exactly as the public would get it.

---

## 9. Local vs. live — the line that matters

Worth being crystal clear, since this is where "wait, is this public?" anxiety comes from:

| Where | Public? | How things get there |
|---|---|---|
| Your `apex-engine` folder | **No.** Private to your PC. | You edit files, or I do. |
| `localhost:4321` | **No.** Only your machine. | `npm run dev` |
| The `autowebsite` repo on GitHub (`main`) | **Yes — this is the trigger.** | A commit gets pushed |
| `apexenginehq.com` | **Yes.** The real site. | Vercel rebuilds automatically, ~1–2 min |

So the moment of publication is **pushing to `main`**. Everything before that is a rehearsal. Nothing
you do while reading files, running `npm run dev`, or even editing locally is visible to anyone until
that push happens.

---

## 10. Static by default — and the four exceptions

Your site is "static": pages are built ahead of time, so there's no live machinery to crash. But five
admin pages and four API routes are different, and you'll spot how in the code.

Look at the top of `src/pages/admin/publish.astro` and you'll find:

```astro
export const prerender = false;
```

That line means *"don't pre-print this one — build it fresh each time someone asks."* It's necessary
for anything that has to check your password or talk to a database at the moment you use it:

- `src/pages/admin/` — all five screens (index, login, publish, posts, moderation)
- `src/pages/api/admin/login.ts`, `moderate.ts`, `publish.ts` — the actions behind those screens
- `src/pages/api/pms-report.ts` — the reader submission endpoint

**`src/pages/api/` is worth knowing about as a category.** Those files aren't pages you look at —
they're *doors that accept requests*. When you click Publish, the browser page sends your article to
`api/admin/publish.ts`, which does the real work (validating, uploading images, saving to GitHub).
Page = something you read. API route = something that does a job.

Everything else on your site — all 45 posts, the homepage, the model pages — is pre-printed. That's
why it's fast and why it stays up even if something goes wrong.

---

## 11. What lives outside `src/`

Briefly, so nothing in the folder looks unexplained:

| Item | What it is |
|---|---|
| `public/` | Files served exactly as-is, untouched: `robots.txt`, `ads.txt`, favicons, brand logos. If you need a file at a literal URL, it goes here. |
| `astro.config.mjs` | Astro's own settings: your domain, trailing slashes, the Vercel adapter, MDX, sitemap, fonts. |
| `package.json` | The project's shopping list of dependencies plus those `npm run` commands. |
| `vercel.json` | Hosting-level config — currently the trailing-slash redirect rule. |
| `dist/` | **Build output. Ignore it.** This is the "printed" site, regenerated every build. Never edit anything here; your changes get wiped. |
| `node_modules/` | Downloaded dependency code. Enormous, never touched by hand, not in the repo. |
| `tools/seo-report/` | Your separate Search-Console-plus-Analytics report tool. Not part of the website build. |
| `*.md` at the root | Your documentation: `CLAUDE.md`, `CONTENT_STYLE_GUIDE.md`, `BACKEND_GUIDE.md`, this file. |
| `supabase/schema.sql` | The table definition for reader-submitted PMS reports. |

---

## 12. Don't-touch list

Short and honest. Everything else is fair game to read, and most of it is fair game to edit.

- **`dist/`** — regenerated on every build; edits vanish.
- **`node_modules/`** — not yours.
- **`src/lib/schema.ts`** — the structured-data engine. Small mistakes here quietly produce invalid
  markup on all 45 posts at once, and Google penalizes bad structured data. Ask me for changes here.
- **`src/lib/adminAuth.ts` / `src/lib/github.ts`** — the login check and the GitHub write access.
  Security-sensitive.
- **`src/content.config.ts`** — safe to *read* (it's a useful reference for what a post can contain),
  but adding a required field here instantly invalidates all existing posts. Ask first.
- **Anything with a password or key in it** — those aren't in the code at all; they're in Vercel's
  environment variables. If you ever find a real password written in a file, tell me — that's a bug.

---

## 13. Your 20-minute first tour

Do these in order, with `npm run dev` running. This is where it stops being abstract.

1. **Prove the routing rule.** Open `src/pages/about.astro`. Find a sentence you recognize from
   `apexenginehq.com/about/`. Change one word, save, and watch `localhost:4321/about/` update. You
   just edited your website. Change it back (or don't — it's local).

2. **Find the sandwich.** In that same file, spot the `---` divider. Note how everything below it
   looks like readable text wrapped in tags, and everything above is imports. That's every `.astro`
   file you'll ever open.

3. **Change something site-wide.** Open `src/components/Footer.astro`. Change something small.
   Now visit two *different* pages on localhost and see the change on both. That's a component.

4. **Look at a post as a file.** Open `src/content/blog/toyota-rush-pms-guide.mdx`. Read the
   frontmatter at the top — you'll recognize `title`, `description`, `vertical: "daily-driver"`, the
   `vehicle:` spec block, the `faq:` list. Then scroll past the closing `---` and it's just your
   article. Compare it to the live page and you'll see exactly which bit became what.

5. **See the one-template-many-pages trick.** Open `src/pages/models/[slug].astro`. It's one file.
   Then look at `src/content/models/` — five files. That single template produces all five model
   pages. Now the square brackets make sense.

6. **Read the rulebook.** Skim `src/content.config.ts`. You don't need to follow the code — just
   notice it's a list of allowed fields with `.optional()` on some and not others. That's the thing
   that stops a broken post from ever going live.

7. **Check the settings drawer.** Open `src/consts.ts`. Everything in it is a plain value you can
   read: your site title, your GA4 ID, your AdSense ID, your Facebook and Instagram URLs. Nothing
   mysterious.

After that tour you'll be able to open this folder and orient yourself in seconds. That's the whole
goal — not writing Astro, just never being lost in your own site.

---

## 14. Symbol cheat sheet

The punctuation that makes code look scarier than it is:

| You see | It means |
|---|---|
| `---` at the top of a file | The divider. Above = instructions/settings, below = content. |
| `import X from './y'` | "Go get the file at `./y` and call it `X` here." |
| `<Capitalized />` | Another file being dropped in at this spot. |
| `<lowercase>` | Ordinary HTML — `<p>` paragraph, `<h2>` subheading, `<a>` link. |
| `{ something }` | "Insert a real value here." A blank being filled in. |
| `{/* ... */}` | A note to humans, invisible on the site. Your posts use these for photo TODOs. |
| `//` at the start of a line | Same thing — a comment, ignored by the computer. |
| `?.` or `.optional()` | "This might not be there, and that's allowed." |
| `[brackets]` in a filename | A blank in the web address — one template, many pages. |
| `.astro` | A page, layout, or component. |
| `.mdx` | An article: frontmatter settings plus written content. |
| `.ts` / `.js` | Pure logic, no visual output. |
| `.json` | Plain structured data — just labelled values. |

---

*Last updated: 2026-07-29. Companion to `BACKEND_GUIDE.md` (how to run the site) and
`CONTENT_STYLE_GUIDE.md` (how to write for it). If any section here still reads like jargon, say
which one and I'll rewrite it plainer.*
