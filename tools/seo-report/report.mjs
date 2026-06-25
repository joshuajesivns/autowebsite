// Apex Engine — all-in-one SEO report
// Joins Google Search Console (rank/CTR) + GA4 (engagement) + PageSpeed (CWV)
// + URL Inspection (index status), tracks trends across runs, and can add an
// AI "do these 3 things this week" summary. Outputs an HTML report + console.
//
// Setup: see README.md. Needs service-account.json + config.json in this folder.
// Run:   npm install && npm run report

import { google } from 'googleapis';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));

// ── Config + auth ────────────────────────────────────────────────────────────
let config;
try {
  config = read('config.json');
} catch {
  console.error('✗ Missing config.json — copy config.example.json to config.json and fill it in.');
  process.exit(1);
}
const keyPath = path.join(HERE, 'service-account.json');
if (!fs.existsSync(keyPath)) {
  console.error('✗ Missing service-account.json — download it from Google Cloud (see README.md).');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
  ],
});

// ── Date range (GSC data lags ~2–3 days, so end 3 days ago) ───────────────────
const fmt = (d) => d.toISOString().slice(0, 10);
const end = new Date();
end.setDate(end.getDate() - 3);
const start = new Date(end);
start.setDate(start.getDate() - ((config.lookbackDays || 28) - 1));
const startDate = fmt(start);
const endDate = fmt(end);

// ── Helpers ───────────────────────────────────────────────────────────────────
const pathOf = (u) => {
  try {
    return new URL(u).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return (u || '').split('?')[0].replace(/\/+$/, '') || '/';
  }
};
const expectedCtr = (p) => {
  const t = { 1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06, 6: 0.05, 7: 0.04, 8: 0.032, 9: 0.028, 10: 0.025 };
  if (p <= 10) return t[Math.round(p)] ?? 0.025;
  if (p <= 20) return 0.015;
  return 0.008;
};
const pct = (n) => (n * 100).toFixed(1) + '%';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Fetch: Search Console ──────────────────────────────────────────────────────
async function gscQuery(searchconsole, dimensions) {
  const res = await searchconsole.searchanalytics.query({
    siteUrl: config.gscSiteUrl,
    requestBody: { startDate, endDate, dimensions, rowLimit: 1000, type: 'web' },
  });
  return res.data.rows || [];
}

// ── Fetch: GA4 ─────────────────────────────────────────────────────────────────
async function ga4LandingPages() {
  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
  const res = await analyticsdata.properties.runReport({
    property: `properties/${config.ga4PropertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }, { name: 'userEngagementDuration' }],
      limit: 1000,
    },
  });
  const map = new Map();
  for (const row of res.data.rows || []) {
    const p = pathOf(row.dimensionValues[0].value);
    const sessions = Number(row.metricValues[0].value) || 0;
    const engagedSessions = Number(row.metricValues[1].value) || 0;
    const engDuration = Number(row.metricValues[2].value) || 0;
    const prev = map.get(p) || { sessions: 0, engagedSessions: 0, engDuration: 0 };
    map.set(p, {
      sessions: prev.sessions + sessions,
      engagedSessions: prev.engagedSessions + engagedSessions,
      engDuration: prev.engDuration + engDuration,
    });
  }
  for (const v of map.values()) {
    v.avgEngagementTime = v.sessions ? v.engDuration / v.sessions : 0;
    v.engagementRate = v.sessions ? v.engagedSessions / v.sessions : 0;
  }
  return map;
}

// ── Fetch: PageSpeed Insights (Core Web Vitals) ────────────────────────────────
async function fetchPSI(url, strategy, apiKey) {
  const u = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  u.searchParams.set('url', url);
  u.searchParams.set('strategy', strategy);
  u.searchParams.set('category', 'performance');
  if (apiKey) u.searchParams.set('key', apiKey);
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  const lh = data.lighthouseResult;
  const perf = lh?.categories?.performance?.score != null ? Math.round(lh.categories.performance.score * 100) : null;
  const field = data.loadingExperience?.metrics;
  if (field?.LARGEST_CONTENTFUL_PAINT_MS) {
    return {
      perf,
      lcp: field.LARGEST_CONTENTFUL_PAINT_MS.percentile / 1000,
      cls: field.CUMULATIVE_LAYOUT_SHIFT_SCORE ? field.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : null,
      source: 'field',
    };
  }
  const lab = (id) => lh?.audits?.[id]?.numericValue;
  return {
    perf,
    lcp: lab('largest-contentful-paint') != null ? lab('largest-contentful-paint') / 1000 : null,
    cls: lab('cumulative-layout-shift') ?? null,
    source: 'lab',
  };
}

// ── Fetch: URL Inspection (index coverage) ─────────────────────────────────────
async function inspectUrl(searchconsole, inspUrl) {
  const res = await searchconsole.urlInspection.index.inspect({
    requestBody: { inspectionUrl: inspUrl, siteUrl: config.gscSiteUrl },
  });
  const r = res.data.inspectionResult?.indexStatusResult || {};
  return { verdict: r.verdict, coverage: r.coverageState, lastCrawl: r.lastCrawlTime };
}
const indexLabel = (idx) => {
  if (!idx || !idx.coverage) return { t: '–', c: '' };
  const c = idx.coverage;
  if (/indexed/i.test(c) && !/not indexed/i.test(c)) return { t: '✓ indexed', c: 'good' };
  if (/not indexed/i.test(c)) return { t: c, c: 'avg' };
  return { t: c, c: 'poor' };
};

// ── Trends: snapshot history ───────────────────────────────────────────────────
const histFile = path.join(HERE, 'output', 'history.jsonl');
function loadPrevSnapshot(currentDate) {
  if (!fs.existsSync(histFile)) return null;
  const lines = fs.readFileSync(histFile, 'utf8').trim().split('\n').filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const e = JSON.parse(lines[i]);
    if (e.date !== currentDate) return e;
  }
  return null;
}
function saveSnapshot(date, pages) {
  fs.mkdirSync(path.join(HERE, 'output'), { recursive: true });
  const entry = { date, pages: pages.map((p) => ({ p: p.p, clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position })) };
  fs.appendFileSync(histFile, JSON.stringify(entry) + '\n');
}

// ── AI summary (Gemini; swap-in point for Claude later) ────────────────────────
async function callGemini(prompt, apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }]}] }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
function buildDigest(pages, queryOpps, psi) {
  const top = pages.slice(0, 10).map((p) => `- ${p.p} | potential +${p.potentialClicks} clicks | pos ${p.position.toFixed(1)} | CTR ${pct(p.ctr)} | ${p.impressions} impr | engRate ${p.engagementRate != null ? pct(p.engagementRate) : 'n/a'} | ${p.tags.join(',') || 'none'}`).join('\n');
  const q = queryOpps.slice(0, 10).map((r) => `- "${r.keys[0]}" | ${r.impressions} impr | CTR ${pct(r.ctr)} | pos ${r.position.toFixed(1)}`).join('\n');
  const cwv = psi.filter((r) => (r.perf != null && r.perf < 50) || (r.lcp != null && r.lcp > 2.5) || (r.cls != null && r.cls > 0.1))
    .map((r) => `- ${r.p} | perf ${r.perf} | LCP ${r.lcp?.toFixed(1)}s | CLS ${r.cls?.toFixed(2)}`).join('\n') || '(none flagged)';
  return `Date range: ${startDate} to ${endDate}\n\nTOP PAGE OPPORTUNITIES:\n${top || '(none)'}\n\nQUERY OPPORTUNITIES:\n${q || '(none)'}\n\nCORE WEB VITALS ISSUES:\n${cwv}`;
}
async function aiSummary(pages, queryOpps, psi) {
  if (!config.ai?.enabled || !config.ai?.apiKey) return null;
  const digest = buildDigest(pages, queryOpps, psi);
  const prompt = `You are an SEO analyst for apexenginehq.com, a Philippine automotive (car maintenance / "PMS") blog. Based ONLY on the data below, write:\n1. "This week's 3 moves" — the 3 highest-impact actions, each one sentence, naming the specific page path or query and why.\n2. "Watchlist" — up to 3 things to monitor.\nBe concrete and concise (under 220 words), markdown. Do not invent data.\n\nDATA:\n${digest}`;
  try {
    if (config.ai.provider === 'gemini') {
      return await callGemini(prompt, config.ai.apiKey, config.ai.model || 'gemini-1.5-flash');
    }
    console.warn(`! Unknown ai.provider "${config.ai.provider}" — skipping AI summary.`);
    return null;
  } catch (e) {
    console.warn('! AI summary failed:', e.message);
    return null;
  }
}

// ── Keyword / backlink / competitor data (paid providers — SCAFFOLD ONLY) ──────
// Deferred by choice: Google has no free API for this, so it needs a paid provider.
// To enable later: set config.keywords {enabled, provider, apiKey}, implement the
// provider call below, and return a shape like:
//   { keywords: [{ keyword, volume, difficulty, position }], backlinks: <n>, competitors: [...] }
// The render hook in main() picks it up automatically once this returns data.
async function keywordData() {
  if (!config.keywords?.enabled) return null;
  switch (config.keywords.provider) {
    // case 'dataforseo': return await fetchDataForSEO(config.keywords.apiKey);
    // case 'serpapi':    return await fetchSerpApi(config.keywords.apiKey);
    default:
      console.warn(`! keywords.enabled but provider "${config.keywords.provider}" not implemented yet — skipping.`);
      return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nApex Engine SEO report — ${startDate} → ${endDate}\n`);
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  let gscPages = [], gscQueries = [], ga4 = new Map();
  try {
    [gscPages, gscQueries] = await Promise.all([gscQuery(searchconsole, ['page']), gscQuery(searchconsole, ['query'])]);
  } catch (e) {
    console.error('✗ Search Console fetch failed:', e.errors?.[0]?.message || e.message);
    console.error('  Check: API enabled, service account added in Search Console, gscSiteUrl correct.');
    process.exit(1);
  }
  try {
    ga4 = await ga4LandingPages();
  } catch (e) {
    console.warn('! GA4 fetch failed (continuing with GSC only):', e.errors?.[0]?.message || e.message);
  }

  // Join GSC pages with GA4
  let pages = gscPages.map((r) => {
    const url = r.keys[0];
    const p = pathOf(url);
    const impressions = r.impressions || 0;
    const clicks = r.clicks || 0;
    const ctr = r.ctr || 0;
    const position = r.position || 0;
    const g = ga4.get(p) || {};
    const potentialClicks = position > 0 && position <= 20 ? Math.round(impressions * Math.max(0, expectedCtr(position) - ctr)) : 0;
    const tags = [];
    if (position >= 5 && position <= 20) tags.push('striking-distance');
    if (impressions >= 50 && ctr < expectedCtr(position) * 0.5) tags.push('low-CTR');
    if ((g.engagementRate || 0) >= 0.5 && impressions < 100) tags.push('great-content-low-reach');
    if (position > 0 && position <= 4 && ctr >= expectedCtr(position) * 0.7) tags.push('winning');
    return { url, p, impressions, clicks, ctr, position, potentialClicks, tags, ...g };
  });
  pages.sort((a, b) => b.potentialClicks - a.potentialClicks || b.impressions - a.impressions);

  // Trends vs previous run
  const prev = loadPrevSnapshot(endDate);
  if (prev) {
    const pm = new Map(prev.pages.map((x) => [x.p, x]));
    for (const p of pages) {
      const o = pm.get(p.p);
      if (o) {
        p.posDelta = (o.position || 0) - p.position; // + = improved (rank number went down)
        p.clicksDelta = p.clicks - (o.clicks || 0);
      }
    }
  }

  // PageSpeed Insights on top opportunity pages
  let psi = [];
  if (config.pagespeed?.enabled) {
    const strategy = config.pagespeed.strategy || 'mobile';
    const toCheck = pages.slice(0, config.pagespeed.maxUrls || 10);
    console.log(`PageSpeed Insights (${strategy}) on top ${toCheck.length} pages...`);
    for (const pg of toCheck) {
      try {
        const r = await fetchPSI(pg.url, strategy, config.pagespeedApiKey);
        psi.push({ p: pg.p, url: pg.url, ...r });
        console.log(`  perf ${String(r.perf ?? '–').padStart(3)} | LCP ${r.lcp != null ? r.lcp.toFixed(1) + 's' : '–'} | CLS ${r.cls != null ? r.cls.toFixed(2) : '–'} | ${pg.p}`);
      } catch (e) {
        console.warn(`  ! PSI failed for ${pg.p}: ${e.message}`);
      }
      await sleep(400);
    }
    console.log('');
  }

  // URL Inspection (index coverage) on top pages
  if (config.indexCheck?.enabled) {
    const toCheck = pages.slice(0, config.indexCheck.maxUrls || 30);
    console.log(`Index coverage (URL Inspection) on ${toCheck.length} pages...`);
    for (const pg of toCheck) {
      try {
        pg.index = await inspectUrl(searchconsole, pg.url);
      } catch (e) {
        console.warn(`  ! Inspect failed for ${pg.p}: ${e.errors?.[0]?.message || e.message}`);
      }
      await sleep(300);
    }
    const notIndexed = toCheck.filter((p) => p.index && !/^✓/.test(indexLabel(p.index).t)).length;
    console.log(`  ${toCheck.length - notIndexed}/${toCheck.length} indexed\n`);
  }

  // Save this run to history (for next run's trends)
  saveSnapshot(endDate, pages);

  // Query opportunities
  const queryOpps = gscQueries
    .filter((r) => (r.impressions || 0) >= 20 && (r.ctr || 0) < expectedCtr(r.position || 99) * 0.6 && (r.position || 99) <= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);

  // AI summary
  const ai = await aiSummary(pages, queryOpps, psi);

  // Keyword/backlink/competitor data (scaffold — returns null until a provider is wired)
  const kw = await keywordData();

  // ── Console summary ──
  console.log('Top page opportunities (clicks you could gain):');
  for (const p of pages.slice(0, 8)) {
    console.log(`  ${String(p.potentialClicks).padStart(4)} | pos ${p.position.toFixed(1).padStart(4)} | CTR ${pct(p.ctr).padStart(6)} | ${p.impressions} impr | ${p.p}  ${p.tags.length ? '[' + p.tags.join(', ') + ']' : ''}`);
  }
  console.log('');

  // ── HTML ──
  const psiMap = new Map(psi.map((r) => [r.p, r]));
  const trendCell = (p) => {
    if (p.posDelta == null) return '';
    if (p.posDelta > 0.1) return ` <span class="perf good">▲${p.posDelta.toFixed(1)}</span>`;
    if (p.posDelta < -0.1) return ` <span class="perf poor">▼${Math.abs(p.posDelta).toFixed(1)}</span>`;
    return '';
  };
  const row = (p) => {
    const il = indexLabel(p.index);
    return `<tr>
    <td class="num">${p.potentialClicks || ''}</td>
    <td><a href="${esc(p.url)}">${esc(p.p)}</a></td>
    <td>${il.c ? `<span class="perf ${il.c}">${esc(il.t)}</span>` : esc(il.t)}</td>
    <td class="num">${p.impressions}</td>
    <td class="num">${p.clicks}</td>
    <td class="num">${pct(p.ctr)}</td>
    <td class="num">${p.position ? p.position.toFixed(1) : '–'}${trendCell(p)}</td>
    <td class="num">${p.sessions ?? '–'}</td>
    <td class="num">${p.engagementRate != null ? pct(p.engagementRate) : '–'}</td>
    <td class="num">${p.avgEngagementTime ? Math.round(p.avgEngagementTime) + 's' : '–'}</td>
    <td>${p.tags.map((t) => `<span class="tag t-${t}">${t}</span>`).join(' ')}</td>
  </tr>`;
  };
  const qrow = (r) => `<tr><td>${esc(r.keys[0])}</td><td class="num">${r.impressions}</td><td class="num">${r.clicks}</td><td class="num">${pct(r.ctr)}</td><td class="num">${r.position.toFixed(1)}</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Apex Engine SEO Report ${endDate}</title>
<style>
  body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#111827;background:#fff}
  h1{margin:0 0 4px}h2{margin:28px 0 8px}.sub{color:#6b7280;margin-bottom:8px}
  table{border-collapse:collapse;width:100%;font-size:13px}th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}
  th{background:#f9fafb}.num{text-align:right;font-variant-numeric:tabular-nums}
  a{color:#b91c1c;text-decoration:none}a:hover{text-decoration:underline}
  .tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:10px;background:#eef2ff;color:#3730a3;white-space:nowrap}
  .t-low-CTR{background:#fef2f2;color:#991b1b}.t-striking-distance{background:#fffbeb;color:#92400e}
  .t-great-content-low-reach{background:#ecfdf5;color:#065f46}.t-winning{background:#eff6ff;color:#1e40af}
  .perf{font-weight:600;padding:1px 7px;border-radius:10px;white-space:nowrap}
  .good{background:#ecfdf5;color:#065f46}.avg{background:#fffbeb;color:#92400e}.poor{background:#fef2f2;color:#991b1b}
  .legend{color:#6b7280;font-size:12px;margin:6px 0 0}
  .ai{background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #b91c1c;border-radius:6px;padding:12px 16px;white-space:pre-wrap}
</style></head><body>
  <h1>Apex Engine — SEO Opportunity Report</h1>
  <div class="sub">${startDate} → ${endDate} · last ${config.lookbackDays || 28} days · GSC × GA4 × PageSpeed${prev ? ` · trends vs ${prev.date}` : ''}</div>

  ${ai ? `<h2>AI summary</h2><div class="ai">${esc(ai)}</div>` : ''}

  <h2>Page opportunities</h2>
  <div class="legend">Sorted by <b>potential clicks</b> = impressions × (benchmark CTR for that position − your CTR). ▲/▼ = position change vs last run.</div>
  <table><thead><tr>
    <th>Potential</th><th>Page</th><th>Index</th><th>Impr</th><th>Clicks</th><th>CTR</th><th>Pos</th><th>Sess</th><th>Engmt</th><th>Time</th><th>Flags</th>
  </tr></thead><tbody>
  ${pages.slice(0, 40).map(row).join('\n')}
  </tbody></table>

  ${psi.length ? `<h2>Core Web Vitals — top pages (${config.pagespeed?.strategy || 'mobile'})</h2>
  <div class="legend"><b>field</b> = real-user data; <b>lab</b> = simulated (new sites show lab). Targets: LCP &lt; 2.5s, CLS &lt; 0.1, Perf &ge; 90.</div>
  <table><thead><tr><th>Page</th><th>Perf</th><th>LCP</th><th>CLS</th><th>Source</th></tr></thead><tbody>
  ${psi.map((r) => `<tr><td><a href="${esc(r.url)}">${esc(r.p)}</a></td>
    <td class="num">${r.perf == null ? '–' : `<span class="perf ${r.perf >= 90 ? 'good' : r.perf >= 50 ? 'avg' : 'poor'}">${r.perf}</span>`}</td>
    <td class="num">${r.lcp != null ? r.lcp.toFixed(1) + 's' : '–'}</td>
    <td class="num">${r.cls != null ? r.cls.toFixed(2) : '–'}</td>
    <td>${r.source}</td></tr>`).join('\n')}
  </tbody></table>` : ''}

  <h2>Query opportunities</h2>
  <div class="legend">Searches where you get impressions on page 1–2 but a weak click rate — vocabulary/intent to target in titles, headings, and FAQs.</div>
  <table><thead><tr><th>Query</th><th>Impr</th><th>Clicks</th><th>CTR</th><th>Pos</th></tr></thead><tbody>
  ${queryOpps.map(qrow).join('\n')}
  </tbody></table>

  ${kw && kw.keywords?.length ? `<h2>Keyword / competitor data</h2>
  <table><thead><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th><th>Your position</th></tr></thead><tbody>
  ${kw.keywords.map((k) => `<tr><td>${esc(k.keyword)}</td><td class="num">${k.volume ?? '–'}</td><td class="num">${k.difficulty ?? '–'}</td><td class="num">${k.position ?? '–'}</td></tr>`).join('\n')}
  </tbody></table>` : ''}

  <h2>Flag guide</h2>
  <ul>
    <li><b>low-CTR</b> — ranks but the snippet underperforms → rewrite title/meta/FAQ.</li>
    <li><b>striking-distance</b> — position 5–20; a quality nudge can tip it onto page 1.</li>
    <li><b>great-content-low-reach</b> — visitors engage but few find it → needs internal links / authority / coverage.</li>
    <li><b>winning</b> — already ranking well with a healthy CTR; protect it.</li>
  </ul>
</body></html>`;

  const outDir = path.join(HERE, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `report-${endDate}.html`);
  fs.writeFileSync(outFile, html);
  console.log(`✓ Report written: ${outFile}\n  Open it in a browser.\n`);
}

main().catch((e) => {
  console.error('✗ Unexpected error:', e.message);
  process.exit(1);
});
