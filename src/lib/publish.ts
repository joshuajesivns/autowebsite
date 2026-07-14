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
		});
	}
	return slots;
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
