// Pure logic for the paste-and-publish admin tool. No Astro/Node-network imports
// so it's unit-testable in isolation. The API route (src/pages/api/admin/publish.ts)
// wires these to the GitHub commit helpers in src/lib/github.ts.

export const VALID_VERTICALS = ['daily-driver', 'ev', 'jdm', 'news'] as const;
export type Vertical = (typeof VALID_VERTICALS)[number];

// Where uploaded images for a post live in the repo, and how a post at
// src/content/blog/<slug>.mdx references them (two dirs up → src/, then assets/…).
export const assetRepoPath = (slug: string, file: string) => `src/assets/blog/${slug}/${file}`;
export const assetImportPath = (slug: string, file: string) => `../../assets/blog/${slug}/${file}`;

const IMG_EXT_RE = /\.(jpe?g|png|webp|avif|gif)$/i;

export interface ParsedPost {
	ok: boolean;
	frontmatter: string; // raw YAML between the --- fences
	body: string; // everything after the closing fence
	meta: {
		vertical?: string;
		title?: string;
		description?: string;
		pubDate?: string;
		heroImage?: string;
	};
}

/** Split the opening `--- … ---` frontmatter from the body. */
export function parsePost(mdx: string): ParsedPost {
	const norm = mdx.replace(/^﻿/, '').replace(/\r\n/g, '\n');
	const m = norm.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) {
		return { ok: false, frontmatter: '', body: norm, meta: {} };
	}
	const frontmatter = m[1];
	const body = m[2];
	const scalar = (key: string): string | undefined => {
		// key: "value" | key: 'value' | key: value   (ignores trailing # comments)
		const re = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\n#]*?))\\s*(?:#.*)?$`, 'm');
		const r = frontmatter.match(re);
		if (!r) return undefined;
		return (r[1] ?? r[2] ?? r[3] ?? '').trim() || undefined;
	};
	return {
		ok: true,
		frontmatter,
		body,
		meta: {
			vertical: scalar('vertical'),
			title: scalar('title'),
			description: scalar('description'),
			pubDate: scalar('pubDate'),
			heroImage: scalar('heroImage'),
		},
	};
}

/** Human-readable problems that would break the build or the publish. Empty = good. */
export function validatePost(p: ParsedPost): string[] {
	const errors: string[] = [];
	if (!p.ok) {
		errors.push('No frontmatter block found. The post must start with a `---` … `---` section.');
		return errors;
	}
	if (!p.meta.vertical) errors.push('Missing `vertical:` — required (daily-driver | ev | jdm | news).');
	else if (!VALID_VERTICALS.includes(p.meta.vertical as Vertical))
		errors.push(`\`vertical: "${p.meta.vertical}"\` is not valid. Use one of: ${VALID_VERTICALS.join(', ')}.`);
	if (!p.meta.title) errors.push('Missing `title:`.');
	if (!p.meta.description) errors.push('Missing `description:`.');
	if (!p.meta.pubDate) errors.push('Missing `pubDate:`.');
	if (p.meta.pubDate && Number.isNaN(Date.parse(p.meta.pubDate)))
		errors.push(`\`pubDate: "${p.meta.pubDate}"\` is not a date I can read (try e.g. "July 13, 2026").`);
	return errors;
}

export function slugify(title: string): string {
	return title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^\w\s-]/g, '') // drop punctuation/accents
		.trim()
		.replace(/[\s_]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
}

export interface ImageSlot {
	id: string; // 'hero' or the import variable name
	kind: 'hero' | 'body';
	currentPath: string; // the placeholder path currently referenced
	caption?: string; // best-effort, to help identify the slot
	isPlaceholder: boolean;
	alt: string; // current alt text ('' if none) — heroAlt for the hero, alt="…" on the tag for body images
}

/**
 * Find every image the post references: the hero (frontmatter) plus each
 * `import name from '….jpg'` in the body. Captions are pulled best-effort from
 * the matching <Figure src={name} …> / <Split image={name} …> tag.
 */
export function detectImageSlots(p: ParsedPost): ImageSlot[] {
	const slots: ImageSlot[] = [];
	if (p.meta.heroImage) {
		slots.push({
			id: 'hero',
			kind: 'hero',
			currentPath: p.meta.heroImage,
			caption: 'Hero image (top of the post)',
			isPlaceholder: /placeholder/i.test(p.meta.heroImage),
			alt: heroAltOf(p.frontmatter),
		});
	}
	const importRe = /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?\s*$/gm;
	let m: RegExpExecArray | null;
	while ((m = importRe.exec(p.body)) !== null) {
		const [, name, path] = m;
		if (!IMG_EXT_RE.test(path)) continue; // skip component imports
		slots.push({
			id: name,
			kind: 'body',
			currentPath: path,
			caption: findCaptionFor(p.body, name),
			isPlaceholder: /placeholder/i.test(path),
			alt: findAltFor(p.body, name),
		});
	}
	return slots;
}

/** Read the heroAlt frontmatter scalar ('' if absent). */
function heroAltOf(frontmatter: string): string {
	const r = frontmatter.match(/^heroAlt:\s*(?:"([^"]*)"|'([^']*)'|([^\n#]*?))\s*(?:#.*)?$/m);
	return r ? (r[1] ?? r[2] ?? r[3] ?? '').trim() : '';
}

/** Read the existing alt="…" on the <Figure>/<Split> that uses this image variable ('' if none). */
function findAltFor(body: string, name: string): string {
	const use = new RegExp(`(?:src|image)=\\{${name}\\}`).exec(body);
	if (!use) return '';
	const window = body.slice(use.index, use.index + 400);
	const alt = window.match(/\balt=["']([^"']*)["']/);
	return alt ? alt[1] : '';
}

/** Look for a caption on the tag that uses this image variable. Best-effort. */
function findCaptionFor(body: string, name: string): string | undefined {
	const use = new RegExp(`(?:src|image)=\\{${name}\\}`).exec(body);
	if (!use) return undefined;
	// scan a window around the usage for caption="…"
	const window = body.slice(use.index, use.index + 400);
	const cap = window.match(/caption=["']([^"']+)["']/);
	return cap ? cap[1] : undefined;
}

export interface UploadMap {
	hero?: { ext: string };
	body: Record<string, { ext: string }>; // import name → uploaded file ext
}

/**
 * Rewrite the MDX so uploaded slots point at the post's own asset folder.
 * Slots with no upload are left untouched (keep their placeholder).
 */
export function applyUploads(mdx: string, slug: string, uploads: UploadMap): string {
	const p = parsePost(mdx);
	if (!p.ok) return mdx;
	let frontmatter = p.frontmatter;
	let body = p.body;

	if (uploads.hero && p.meta.heroImage) {
		const newPath = assetImportPath(slug, `hero.${uploads.hero.ext}`);
		frontmatter = frontmatter.replace(
			/^(heroImage:\s*)(?:"[^"]*"|'[^']*'|[^\n#]*)(\s*(?:#.*)?)$/m,
			`$1"${newPath}"$2`,
		);
	}

	for (const [name, up] of Object.entries(uploads.body)) {
		const newPath = assetImportPath(slug, `${name}.${up.ext}`);
		const re = new RegExp(`^(import\\s+${name}\\s+from\\s+['"])[^'"]+(['"];?\\s*)$`, 'm');
		body = body.replace(re, `$1${newPath}$2`);
	}

	return `---\n${frontmatter}\n---\n${body}`;
}

/** file.JPG → jpg ; strips the dot, lowercases, defaults to jpg. */
export function extOf(filename: string): string {
	const m = filename.match(/\.([a-z0-9]+)$/i);
	return (m ? m[1] : 'jpg').toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Yoast-lite analysis. Pure functions: the API route feeds them the parsed post
// plus a lightweight index of existing posts (from getCollection) and renders the
// result as a Google preview + traffic-light checklist. Advisory only — none of
// this blocks a publish; hard blockers stay in validatePost().
// ─────────────────────────────────────────────────────────────────────────────

import { RECIPE, type Vertical as SchemaVertical } from './schema';

// The site's meta formula (mirrors CONTENT_STYLE_GUIDE.md).
export const TITLE_MIN = 55;
export const TITLE_MAX = 58;
export const DESC_MIN = 155;
export const DESC_MAX = 158;

export type Level = 'good' | 'warn' | 'bad';
export interface Check {
	level: Level;
	text: string;
}
export interface SchemaNode {
	label: string;
	level: Level;
}
export interface Preview {
	titleFull: string;
	url: string;
	description: string;
	titleLen: number;
	titleState: Level;
	descLen: number;
	descState: Level;
	apexCount: number;
	apexState: Level;
}
export interface Analysis {
	content: Check[];
	images: Check[];
	schema: { nodes: SchemaNode[]; notes: Check[] };
	links: { count: number; targets: string[]; suggestions: PostIndexEntry[]; checks: Check[] };
}
export interface PostIndexEntry {
	slug: string;
	title: string;
	vertical: string;
	tags: string[];
	brand?: string;
}

/** Character-count state against a [min,max] window, with a small orange tolerance band. */
export function lengthState(len: number, min: number, max: number, tol = 4): Level {
	if (len >= min && len <= max) return 'good';
	if (len >= min - tol && len <= max + tol) return 'warn';
	return 'bad';
}

/** The Google-snippet preview + live meta bars. */
export function buildPreview(parsed: ParsedPost, url: string): Preview {
	const title = parsed.meta.title ?? '';
	const description = parsed.meta.description ?? '';
	const titleLen = [...title].length;
	const descLen = [...description].length;
	const apexCount = (description.match(/Apex Engine/g) ?? []).length;
	return {
		titleFull: title,
		url,
		description,
		titleLen,
		titleState: lengthState(titleLen, TITLE_MIN, TITLE_MAX),
		descLen,
		descState: lengthState(descLen, DESC_MIN, DESC_MAX),
		apexCount,
		apexState: apexCount === 1 ? 'good' : 'warn',
	};
}

// ── Frontmatter extras the scalar parser doesn't reach (nested blocks) ────────
interface Extras {
	vehiclePresent: boolean;
	vehicleName?: string;
	vehicleBrand?: string;
	vehicleModel?: string;
	engineCount: number;
	faqCount: number;
	hasPms: boolean;
	hasProducts: boolean;
	tags: string[];
}

/** Grab the indented lines under a top-level `key:` (up to the next top-level key). */
function indentedBlock(fm: string, key: string): string | null {
	const lines = fm.split('\n');
	const i = lines.findIndex((l) => new RegExp(`^${key}:`).test(l));
	if (i === -1) return null;
	const out: string[] = [];
	for (let j = i + 1; j < lines.length; j++) {
		if (/^\S/.test(lines[j])) break; // next top-level key
		out.push(lines[j]);
	}
	return out.join('\n');
}

function scalarIn(block: string, key: string): string | undefined {
	const r = block.match(new RegExp(`^\\s*${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\n#]*?))\\s*(?:#.*)?$`, 'm'));
	return r ? (r[1] ?? r[2] ?? r[3] ?? '').trim() || undefined : undefined;
}

export function parseExtras(fm: string): Extras {
	const vehicle = indentedBlock(fm, 'vehicle');
	const faq = indentedBlock(fm, 'faq');
	const tagsLine = fm.match(/^tags:\s*(.*)$/m);
	const tags = tagsLine ? [...tagsLine[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]) : [];
	return {
		vehiclePresent: vehicle != null,
		vehicleName: vehicle ? scalarIn(vehicle, 'name') : undefined,
		vehicleBrand: vehicle ? scalarIn(vehicle, 'brand') : undefined,
		vehicleModel: vehicle ? scalarIn(vehicle, 'model') : undefined,
		engineCount: vehicle ? (vehicle.match(/^\s*-\s*name:/gm) ?? []).length : 0,
		faqCount: faq ? (faq.match(/^\s*-\s*q:/gm) ?? []).length : 0,
		hasPms: /^pms:\s*$/m.test(fm),
		hasProducts: /^featuredProducts:\s*$/m.test(fm),
		tags,
	};
}

// ── Required-section heuristics per vertical (matched against H2/H3 headings) ──
const SHARED_SECTIONS: { label: string; re: RegExp }[] = [
	{ label: 'Model Year Coverage', re: /model year coverage/i },
	{ label: 'Key Takeaways', re: /key takeaways/i },
];
const VERTICAL_SECTIONS: Record<string, { label: string; re: RegExp }[]> = {
	'daily-driver': [
		{ label: 'Quick Specs', re: /quick specs|specs/i },
		{ label: 'Light vs. Heavy PMS', re: /light|heavy|pms/i },
		{ label: 'Known Issues', re: /known issue|problem/i },
	],
	ev: [
		{ label: 'Battery / range / charging', re: /battery|range|charg/i },
		{ label: 'Warranty', re: /warranty/i },
		{ label: 'TCO vs. gasoline', re: /tco|cost of ownership|total cost|cost-per-km/i },
	],
	jdm: [
		{ label: 'Upgrade paths', re: /upgrade|build|mod/i },
		{ label: 'Parts availability / sourcing', re: /parts|sourcing/i },
		{ label: 'Known weak points', re: /weak point|known issue|reliab/i },
		{ label: 'Buying / import guide', re: /buying|import|inspect/i },
		{ label: 'Resale / collector value', re: /resale|collector|value|verdict/i },
	],
	news: [],
};

function headingsOf(body: string): string {
	return [...body.matchAll(/^#{2,3}\s+(.*)$/gm)].map((m) => m[1]).join('\n');
}

/** Rough prose word count: drop import lines, JSX tags, and markdown syntax. */
export function wordCount(body: string): number {
	const text = body
		.replace(/^import\s.+$/gm, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/[#>*_`|[\]()-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return text ? text.split(' ').length : 0;
}

/** Everything the traffic-light panel renders. Advisory only. */
export function analyzePost(
	parsed: ParsedPost,
	posts: PostIndexEntry[],
	currentSlug: string,
	modelSlugs: string[] = [],
): Analysis {
	const ex = parseExtras(parsed.frontmatter);
	const vertical = parsed.meta.vertical ?? '';
	const headings = headingsOf(parsed.body);

	// ── Content ──────────────────────────────────────────────────────────────
	const content: Check[] = [];
	const t = [...(parsed.meta.title ?? '')].length;
	const d = [...(parsed.meta.description ?? '')].length;
	content.push({
		level: lengthState(t, TITLE_MIN, TITLE_MAX),
		text: `SEO title: ${t} chars (aim ${TITLE_MIN}–${TITLE_MAX}).`,
	});
	content.push({
		level: lengthState(d, DESC_MIN, DESC_MAX),
		text: `Meta description: ${d} chars (aim ${DESC_MIN}–${DESC_MAX}).`,
	});
	const apex = (parsed.meta.description?.match(/Apex Engine/g) ?? []).length;
	content.push({
		level: apex === 1 ? 'good' : 'warn',
		text: apex === 1 ? '"Apex Engine" appears once in the description.' : `"Apex Engine" appears ${apex}× in the description (want exactly 1).`,
	});
	for (const s of [...SHARED_SECTIONS, ...(VERTICAL_SECTIONS[vertical] ?? [])]) {
		content.push({
			level: s.re.test(headings) ? 'good' : 'warn',
			text: s.re.test(headings) ? `Section present: ${s.label}.` : `Missing (or unusually named) section: ${s.label}.`,
		});
	}
	content.push({
		level: ex.faqCount >= 3 ? 'good' : ex.faqCount >= 1 ? 'warn' : 'warn',
		text: ex.faqCount ? `FAQ: ${ex.faqCount} Q&A${ex.faqCount > 1 ? 's' : ''} → FAQPage schema.` : 'No FAQ entries — add a few for the FAQ section + schema.',
	});
	const words = wordCount(parsed.body);
	content.push({
		level: words >= 800 ? 'good' : words >= 400 ? 'warn' : 'bad',
		text: `~${words} words${words < 800 ? ' (aim 800+ for a guide)' : '.'}`,
	});

	// ── Images + alt ───────────────────────────────────────────────────────────
	const slots = detectImageSlots(parsed);
	const images: Check[] = [];
	if (!slots.some((s) => s.kind === 'hero')) images.push({ level: 'warn', text: 'No hero image set.' });
	for (const s of slots) {
		const label = s.kind === 'hero' ? 'Hero' : s.id;
		if (!s.alt.trim()) images.push({ level: 'warn', text: `Missing alt text: ${label}.` });
		if (s.isPlaceholder) images.push({ level: 'warn', text: `Still on placeholder image: ${label}.` });
	}
	if (slots.length && images.length === 0) images.push({ level: 'good', text: 'All images have alt text and real photos.' });
	if (slots.every((s) => s.alt.trim()) && slots.length) images.push({ level: 'good', text: 'Every image has alt text.' });

	// ── Schema (reuses the real RECIPE from schema.ts) ─────────────────────────
	const recipe = RECIPE[vertical as SchemaVertical];
	const nodes: SchemaNode[] = [{ label: 'Article (BlogPosting)', level: 'good' }];
	const notes: Check[] = [];
	if (recipe?.vehicle) {
		if (ex.vehiclePresent) {
			const complete = !!(ex.vehicleName && ex.vehicleBrand && ex.vehicleModel);
			nodes.push({
				label: `Vehicle${ex.engineCount ? ` (${ex.engineCount} engine${ex.engineCount > 1 ? 's' : ''})` : ''}`,
				level: complete ? 'good' : 'bad',
			});
			if (!complete) notes.push({ level: 'bad', text: 'Vehicle block is missing name/brand/model.' });
			notes.push({ level: 'warn', text: 'Vehicle shows a cosmetic "Product snippet" notice in Rich Results Test — harmless, does not affect indexing.' });
		} else {
			nodes.push({ label: 'Vehicle (none — vertical supports it)', level: 'warn' });
		}
	}
	nodes.push({ label: `FAQPage${ex.faqCount ? ` (${ex.faqCount})` : ''}`, level: ex.faqCount ? 'good' : 'warn' });
	if (recipe?.howto && ex.hasPms) nodes.push({ label: 'HowTo (PMS)', level: 'good' });
	if (recipe?.products && ex.hasProducts) nodes.push({ label: 'ItemList / Product', level: 'good' });

	// ── Internal linking ───────────────────────────────────────────────────────
	const targetsRaw = [...parsed.body.matchAll(/\]\((\/(?:blog|models)\/[^)\s]+)\)/g)].map((m) => m[1]);
	// Normalise for existence checks: strip trailing slash + #fragment.
	const targets = targetsRaw.map((h) => h.replace(/#.*$/, ''));
	const linkedSlugs = new Set(targets.map((h) => (h.match(/\/blog\/([^/]+)/) ?? [])[1]).filter(Boolean));
	const checks: Check[] = [];
	checks.push({
		level: targets.length >= 2 ? 'good' : targets.length === 1 ? 'warn' : 'bad',
		text: targets.length ? `${targets.length} internal link${targets.length > 1 ? 's' : ''} in the body.` : 'No internal links — add at least one to a related post.',
	});

	// Link-target validation — flag any /blog/ or /models/ link that won't resolve
	// to a real page (the recurring "bottom links must point to real slugs or 404"
	// problem). Deterministic: checks against the actual post + model slug indexes.
	const postSlugSet = new Set(posts.map((p) => p.slug));
	const modelSet = new Set(modelSlugs);
	const broken: string[] = [];
	for (const href of targets) {
		const b = href.match(/^\/blog\/([^/]+)\/?$/);
		const md = href.match(/^\/models\/([^/]+)\/?$/);
		if (b) {
			if (b[1] !== currentSlug && !postSlugSet.has(b[1])) broken.push(href);
		} else if (md) {
			if (!modelSet.has(md[1])) broken.push(href);
		}
	}
	if (broken.length) {
		checks.push({
			level: 'bad',
			text: `Broken internal link${broken.length > 1 ? 's' : ''} — target doesn't exist: ${broken.join(', ')}`,
		});
	} else if (targets.length) {
		checks.push({ level: 'good', text: 'All internal link targets resolve to real pages.' });
	}

	// Anchor-diversity nudge — flag exact-match anchors (same as the target keyword
	// / brand) and anchors reused verbatim across links (see the anchor-diversity
	// rule in CONTENT_STYLE_GUIDE.md). Advisory only.
	const anchors = [...parsed.body.matchAll(/\[([^\]]+)\]\(\/(?:blog|models)\/[^)\s]+\)/g)].map((m) => m[1].trim());
	const anchorCounts = new Map<string, number>();
	for (const a of anchors) anchorCounts.set(a.toLowerCase(), (anchorCounts.get(a.toLowerCase()) ?? 0) + 1);
	const repeated = [...anchorCounts.entries()].filter(([, n]) => n > 1).map(([a]) => a);
	if (repeated.length) {
		checks.push({
			level: 'warn',
			text: `Repeated anchor text (vary it — avoid exact-match over-optimization): ${repeated.slice(0, 3).map((a) => `"${a}"`).join(', ')}.`,
		});
	}
	const brand = (ex.vehicleBrand ?? '').toLowerCase();
	const myTags = new Set(ex.tags.map((x) => x.toLowerCase()));
	const suggestions = posts
		.filter((p) => p.slug !== currentSlug && !linkedSlugs.has(p.slug))
		.map((p) => {
			let score = 0;
			if (p.vertical === vertical) score += 2;
			if (brand && (p.brand?.toLowerCase() === brand || p.tags.some((x) => x.toLowerCase() === brand))) score += 3;
			score += p.tags.filter((x) => myTags.has(x.toLowerCase())).length;
			return { p, score };
		})
		.filter((x) => x.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 5)
		.map((x) => x.p);
	if (suggestions.length) checks.push({ level: 'warn', text: `${suggestions.length} related post${suggestions.length > 1 ? 's' : ''} you could link (see below).` });

	return { content, images, schema: { nodes, notes }, links: { count: targets.length, targets, suggestions, checks } };
}

// ── Alt-text injection (applied at publish, independent of image uploads) ──────
export interface AltMap {
	hero?: string;
	body: Record<string, string>; // import name → alt text
}

/** Write alt text into the post: heroAlt in frontmatter, alt="…" on each body tag. */
export function applyAltText(mdx: string, alts: AltMap): string {
	const p = parsePost(mdx);
	if (!p.ok) return mdx;
	let frontmatter = p.frontmatter;
	let body = p.body;

	if (alts.hero != null && alts.hero !== '') {
		const esc = alts.hero.replace(/"/g, '&quot;');
		if (/^heroAlt:/m.test(frontmatter)) {
			frontmatter = frontmatter.replace(/^heroAlt:.*$/m, `heroAlt: "${esc}"`);
		} else if (/^heroImage:/m.test(frontmatter)) {
			frontmatter = frontmatter.replace(/^(heroImage:.*)$/m, `$1\nheroAlt: "${esc}"`);
		}
	}

	for (const [name, alt] of Object.entries(alts.body)) {
		if (!alt) continue;
		const esc = alt.replace(/"/g, '&quot;');
		const use = new RegExp(`((?:src|image)=\\{${name}\\})`);
		const m = use.exec(body);
		if (!m) continue;
		// Find the enclosing tag and set/replace its alt attribute.
		const tagStart = body.lastIndexOf('<', m.index);
		const tagEnd = body.indexOf('>', m.index);
		if (tagStart === -1 || tagEnd === -1) continue;
		let tag = body.slice(tagStart, tagEnd);
		tag = /\balt=["'][^"']*["']/.test(tag)
			? tag.replace(/\balt=["'][^"']*["']/, `alt="${esc}"`)
			: tag.replace(use, `$1 alt="${esc}"`);
		body = body.slice(0, tagStart) + tag + body.slice(tagEnd);
	}

	return `---\n${frontmatter}\n---\n${body}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured schema fields (vehicle / pms / featuredProducts).
//
// The paste-and-publish flow authors these via a form, so the tool can add rich
// Vehicle/HowTo/Product JSON-LD to a post whose pasted MDX only carried the base
// frontmatter. Two directions:
//   • parse*  — read an existing block out of frontmatter to PRE-FILL the form
//     (so editing a post that already has the block doesn't start blank).
//   • serialize* + applyStructured — write the form values back into frontmatter.
// Shapes mirror src/content.config.ts EXACTLY so a published post always builds.
// ─────────────────────────────────────────────────────────────────────────────

import type { VehicleData, VehicleEngine, PmsData, PmsService, ProductData } from './schema';

export interface StructuredFields {
	vehicle?: VehicleData | null;
	pms?: PmsData | null;
	featuredProducts?: ProductData[] | null;
}

// ── YAML emit helpers ─────────────────────────────────────────────────────────
/** Double-quote + escape a scalar for YAML. */
function yq(s: string): string {
	return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}
const has = (s?: string) => typeof s === 'string' && s.trim() !== '';

/** Serialize a vehicle object to indented YAML (indent = leading spaces). '' if empty. */
export function serializeVehicle(v: VehicleData | null | undefined): string {
	if (!v || !has(v.name)) return '';
	const L: string[] = ['vehicle:'];
	L.push(`  name: ${yq(v.name)}`);
	if (has(v.brand)) L.push(`  brand: ${yq(v.brand!)}`);
	if (has(v.model)) L.push(`  model: ${yq(v.model!)}`);
	if (has(v.vehicleModelDate)) L.push(`  vehicleModelDate: ${yq(v.vehicleModelDate!)}`);
	if (has(v.bodyType)) L.push(`  bodyType: ${yq(v.bodyType!)}`);
	if (has(v.fuelType)) L.push(`  fuelType: ${yq(v.fuelType!)}`);
	if (has(v.transmission)) L.push(`  transmission: ${yq(v.transmission!)}`);
	if (v.drivetrain && ['FWD', 'RWD', 'AWD', '4WD'].includes(v.drivetrain)) L.push(`  drivetrain: ${yq(v.drivetrain)}`);
	const engines = (v.engines ?? []).filter((e) => has(e.name));
	if (engines.length) {
		L.push('  engines:');
		for (const e of engines) {
			L.push(`    - name: ${yq(e.name)}`);
			if (has(e.engineType)) L.push(`      engineType: ${yq(e.engineType!)}`);
			if (has(e.power)) L.push(`      power: ${yq(e.power!)}`);
			if (has(e.powerUnit)) L.push(`      powerUnit: ${yq(e.powerUnit!)}`);
		}
	}
	return L.join('\n');
}

function serializePmsService(svc: PmsService | undefined, key: 'light' | 'heavy'): string[] {
	if (!svc) return [];
	const steps = (svc.steps ?? []).filter(has);
	const hasCost = svc.costMin != null || svc.costMax != null;
	if (!has(svc.name) && !has(svc.interval) && !hasCost && !steps.length) return [];
	const L = [`  ${key}:`];
	if (has(svc.name)) L.push(`    name: ${yq(svc.name)}`);
	if (has(svc.interval)) L.push(`    interval: ${yq(svc.interval!)}`);
	if (svc.costMin != null && Number.isFinite(svc.costMin)) L.push(`    costMin: ${svc.costMin}`);
	if (svc.costMax != null && Number.isFinite(svc.costMax)) L.push(`    costMax: ${svc.costMax}`);
	if (steps.length) {
		L.push('    steps:');
		for (const s of steps) L.push(`      - ${yq(s)}`);
	}
	return L;
}

/** Serialize a pms object to indented YAML. '' if it carries no light/heavy data. */
export function serializePms(pms: PmsData | null | undefined): string {
	if (!pms) return '';
	const light = serializePmsService(pms.light, 'light');
	const heavy = serializePmsService(pms.heavy, 'heavy');
	if (!light.length && !heavy.length) return '';
	return ['pms:', `  currency: ${yq(pms.currency || 'PHP')}`, ...light, ...heavy].join('\n');
}

/** Serialize featuredProducts to indented YAML. '' if the list is empty. */
export function serializeProducts(products: ProductData[] | null | undefined): string {
	const list = (products ?? []).filter((p) => has(p.name) && has(p.url));
	if (!list.length) return '';
	const L = ['featuredProducts:'];
	for (const p of list) {
		L.push(`  - name: ${yq(p.name)}`);
		if (has(p.category)) L.push(`    category: ${yq(p.category!)}`);
		if (has(p.brand)) L.push(`    brand: ${yq(p.brand!)}`);
		if (has(p.description)) L.push(`    description: ${yq(p.description!)}`);
		L.push(`    url: ${yq(p.url)}`);
	}
	return L.join('\n');
}

/** Drop a top-level `key:` and all of its indented/blank continuation lines. */
function removeTopLevelKey(fm: string, key: string): string {
	const lines = fm.split('\n');
	const out: string[] = [];
	let i = 0;
	const head = new RegExp(`^${key}:(\\s|$)`);
	while (i < lines.length) {
		if (head.test(lines[i])) {
			i++;
			while (i < lines.length && (lines[i].trim() === '' || /^\s/.test(lines[i]))) i++;
			continue;
		}
		out.push(lines[i]);
		i++;
	}
	return out.join('\n');
}

/**
 * Merge structured blocks into a post's frontmatter. Only keys PRESENT (non-null)
 * on `fields` are touched — a null/undefined key leaves the post's existing block
 * untouched, so an untouched form section can never silently wipe real data. A
 * present-but-empty value removes the block.
 */
export function applyStructured(mdx: string, fields: StructuredFields): string {
	const p = parsePost(mdx);
	if (!p.ok) return mdx;
	let fm = p.frontmatter;

	const jobs: [keyof StructuredFields, string, () => string][] = [
		['vehicle', 'vehicle', () => serializeVehicle(fields.vehicle)],
		['pms', 'pms', () => serializePms(fields.pms)],
		['featuredProducts', 'featuredProducts', () => serializeProducts(fields.featuredProducts)],
	];
	for (const [field, key, ser] of jobs) {
		if (!(field in fields) || fields[field] === undefined) continue; // untouched → leave as-is
		fm = removeTopLevelKey(fm, key).replace(/\n+$/, '');
		const block = ser();
		if (block) fm = `${fm}\n${block}`;
	}
	fm = fm.replace(/\n{3,}/g, '\n\n');
	return `---\n${fm}\n---\n${p.body}`;
}

// ── Parsers (read an existing block back into form values) ─────────────────────
function unquote(s: string): string {
	const t = s.trim();
	const m = t.match(/^"([\s\S]*)"$/) || t.match(/^'([\s\S]*)'$/);
	if (m) return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
	return t.replace(/\s*#.*$/, '').trim();
}

/** Grab the lines under `key:` at ANY nesting level (indent-aware, unlike indentedBlock). */
function subBlock(text: string, key: string): string | null {
	const lines = text.split('\n');
	let i = -1;
	let keyIndent = 0;
	for (let j = 0; j < lines.length; j++) {
		const m = lines[j].match(new RegExp(`^(\\s*)${key}:(\\s|$)`));
		if (m) {
			i = j;
			keyIndent = m[1].length;
			break;
		}
	}
	if (i === -1) return null;
	const out: string[] = [];
	for (let j = i + 1; j < lines.length; j++) {
		if (lines[j].trim() === '') {
			out.push(lines[j]);
			continue;
		}
		if ((lines[j].match(/^\s*/)![0].length) <= keyIndent) break;
		out.push(lines[j]);
	}
	return out.join('\n');
}

/** Split a YAML list under `key` into per-item text blocks (dash-item bodies, dedented). */
function listItemsUnder(block: string, key: string): string[] {
	const lines = block.split('\n');
	const startIdx = lines.findIndex((l) => new RegExp(`^\\s*${key}:\\s*$`).test(l));
	if (startIdx === -1) return [];
	const keyIndent = (lines[startIdx].match(/^\s*/)?.[0].length) ?? 0;
	const items: string[] = [];
	let cur: string[] | null = null;
	let dashIndent = -1;
	for (let j = startIdx + 1; j < lines.length; j++) {
		const line = lines[j];
		if (line.trim() === '') continue;
		const indent = line.match(/^\s*/)![0].length;
		if (indent <= keyIndent) break;
		const dash = line.match(/^(\s*)-\s?(.*)$/);
		if (dash && (dashIndent === -1 || dash[1].length === dashIndent)) {
			dashIndent = dash[1].length;
			if (cur) items.push(cur.join('\n'));
			cur = [dash[2]];
		} else if (cur) {
			cur.push(line.slice(dashIndent + 2));
		}
	}
	if (cur) items.push(cur.join('\n'));
	return items;
}

/** Parse a `vehicle:` block out of frontmatter into form values (null if absent). */
export function parseVehicle(fm: string): VehicleData | null {
	const block = subBlock(fm, 'vehicle');
	if (block == null) return null;
	const engines: VehicleEngine[] = listItemsUnder(block, 'engines').map((it) => ({
		name: scalarIn(it, 'name') ?? '',
		engineType: scalarIn(it, 'engineType'),
		power: scalarIn(it, 'power'),
		powerUnit: scalarIn(it, 'powerUnit'),
	}));
	const drivetrain = scalarIn(block, 'drivetrain') as VehicleData['drivetrain'] | undefined;
	return {
		name: scalarIn(block, 'name') ?? '',
		brand: scalarIn(block, 'brand') ?? '',
		model: scalarIn(block, 'model') ?? '',
		vehicleModelDate: scalarIn(block, 'vehicleModelDate'),
		bodyType: scalarIn(block, 'bodyType'),
		fuelType: scalarIn(block, 'fuelType'),
		transmission: scalarIn(block, 'transmission'),
		drivetrain: drivetrain && ['FWD', 'RWD', 'AWD', '4WD'].includes(drivetrain) ? drivetrain : undefined,
		engines: engines.length ? engines : undefined,
	};
}

function parsePmsService(fm: string, key: 'light' | 'heavy'): PmsService | undefined {
	const block = subBlock(fm, key);
	if (block == null) return undefined;
	const min = scalarIn(block, 'costMin');
	const max = scalarIn(block, 'costMax');
	const steps = listItemsUnder(block, 'steps').map((s) => unquote(s)).filter(Boolean);
	return {
		name: scalarIn(block, 'name') ?? '',
		interval: scalarIn(block, 'interval'),
		costMin: min != null && min !== '' ? Number(min) : undefined,
		costMax: max != null && max !== '' ? Number(max) : undefined,
		steps: steps.length ? steps : undefined,
	};
}

/** Parse a `pms:` block out of frontmatter into form values (null if absent). */
export function parsePms(fm: string): PmsData | null {
	const block = subBlock(fm, 'pms');
	if (block == null) return null;
	return {
		currency: scalarIn(block, 'currency') ?? 'PHP',
		light: parsePmsService(block, 'light'),
		heavy: parsePmsService(block, 'heavy'),
	};
}

/** Parse a `featuredProducts:` block out of frontmatter into form values (null if absent). */
export function parseProducts(fm: string): ProductData[] | null {
	if (!/^featuredProducts:/m.test(fm)) return null;
	// The list sits at top level, so scope to the block under the key.
	const block = 'featuredProducts:\n' + (subBlock(fm, 'featuredProducts') ?? '');
	return listItemsUnder(block, 'featuredProducts').map((it) => ({
		name: scalarIn(it, 'name') ?? '',
		category: scalarIn(it, 'category'),
		brand: scalarIn(it, 'brand'),
		description: scalarIn(it, 'description'),
		url: scalarIn(it, 'url') ?? '',
	}));
}

/** Read all three structured blocks at once (for pre-filling the publish form). */
export function parseStructured(fm: string): { vehicle: VehicleData | null; pms: PmsData | null; featuredProducts: ProductData[] | null } {
	return { vehicle: parseVehicle(fm), pms: parsePms(fm), featuredProducts: parseProducts(fm) };
}
