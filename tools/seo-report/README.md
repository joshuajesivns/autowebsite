# Apex Engine — SEO Opportunity Report

Pulls **Google Search Console** (rank, impressions, CTR) and **GA4** (engagement),
joins them by URL, and produces a ranked "what to optimize next" report.

## One-time setup (~15 min)

### 1. Google Cloud project + APIs
1. Go to <https://console.cloud.google.com> → create a project (e.g. "apex-seo").
2. **APIs & Services → Library** → enable:
   - **Google Search Console API**
   - **Google Analytics Data API**
   - **PageSpeed Insights API** (for Core Web Vitals)

### 2. Service account + key
1. **APIs & Services → Credentials → Create credentials → Service account.**
2. Name it (e.g. `seo-report`), create. No roles needed.
3. Open the service account → **Keys → Add key → Create new key → JSON**. Download it.
4. Save that file here as **`service-account.json`**.
5. Copy the service account's email (looks like `seo-report@apex-seo.iam.gserviceaccount.com`) — you need it next.

### 3. Grant it read access
- **GA4:** Admin → **Property access management** → add the service-account email as **Viewer**.
- **Search Console:** Settings → **Users and permissions** → add the service-account email (Restricted is enough).

### 4. Config
1. Copy `config.example.json` to **`config.json`**.
2. Set:
   - `gscSiteUrl` — your Search Console property. URL-prefix: `https://www.apexenginehq.com/`. (If yours is a *Domain* property, use `sc-domain:apexenginehq.com`.)
   - `ga4PropertyId` — the **numeric** Property ID (GA4 Admin → Property Settings, top-right, e.g. `498765432`). NOT the `G-XXXX` measurement ID.
   - `pagespeed` — `enabled`, `strategy` (`mobile` or `desktop`), `maxUrls` (how many top pages to check; PSI is slow ~5–15s each).
   - `pagespeedApiKey` *(optional but recommended)* — **APIs & Services → Credentials → Create credentials → API key**. Without it PSI still works for a handful of URLs but throttles fast.
   - `indexCheck` — `enabled`, `maxUrls`. Uses the Search Console **URL Inspection API** (same service account) to report whether each page is indexed and when it was last crawled.
   - `ai` *(optional)* — set `enabled: true`, `provider: "gemini"`, and paste an `apiKey` from **Google AI Studio** (<https://aistudio.google.com/apikey>) to get a "this week's 3 moves" summary at the top of the report. `model` defaults to `gemini-1.5-flash` (free tier) — update if Google renames it. Leave `enabled: false` to skip.

## What you get
- **Page opportunities** — ranked by clicks you're leaving on the table, with index status and ▲/▼ position trend vs the last run.
- **Core Web Vitals** — perf score / LCP / CLS for your top pages.
- **Query opportunities** — searches where you rank but the click rate is weak.
- **AI summary** *(if enabled)* — plain-English top 3 actions + watchlist.

## Trends
Every run appends a snapshot to `output/history.jsonl`. The next run compares against it to show position movement. Run it on a regular cadence (weekly is plenty) to build that history — we can automate this later with a scheduled job.

## Run

```bash
npm install
npm run report
```

Outputs `output/report-<date>.html` — open it in a browser. Re-run anytime for fresh data.

## Notes
- GSC data lags ~2–3 days, so the report ends 3 days ago by design.
- `service-account.json`, `config.json`, and `output/` are git-ignored — never commit them.
- "Potential clicks" = impressions × (benchmark CTR for that position − your actual CTR). It surfaces pages you already rank for but whose snippet isn't earning the click — exactly the "heavy pms" situation, found automatically.
