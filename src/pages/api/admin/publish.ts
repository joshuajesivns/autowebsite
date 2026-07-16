import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { ADMIN_COOKIE_NAME, isValidAdminSession } from '../../../lib/adminAuth';
import { commitFiles, createBlob, fileExists, getFile, GH_BRANCH, type TreeEntry } from '../../../lib/github';
import {
	analyzePost,
	applyAltText,
	applyStructured,
	applyUploads,
	assetRepoPath,
	buildPreview,
	detectImageSlots,
	extOf,
	parsePost,
	parseStructured,
	slugify,
	type AltMap,
	type PostIndexEntry,
	type StructuredFields,
	type UploadMap,
	validatePost,
} from '../../../lib/publish';
import { RECIPE, type Vertical } from '../../../lib/schema';

export const prerender = false;

/** Lightweight index of existing posts for the slug-taken check + link suggestions.
 *  Uses the content collection (no GitHub token needed). */
async function postIndex(): Promise<PostIndexEntry[]> {
	const posts = await getCollection('blog');
	return posts.map((p) => ({
		slug: p.id.replace(/\.(md|mdx)$/, ''),
		title: p.data.title,
		vertical: p.data.vertical,
		tags: p.data.tags ?? [],
		brand: p.data.vehicle?.brand,
	}));
}

/** Slugs of the /models/ pages — used to validate internal links to model pages. */
async function modelSlugs(): Promise<string[]> {
	const models = await getCollection('models');
	return models.map((m) => m.id.replace(/\.(md|mdx)$/, ''));
}

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const BLOG_DIR = 'src/content/blog';
const SITE = 'https://www.apexenginehq.com';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // generous server cap; the UI downscales before upload

export const POST: APIRoute = async ({ request, cookies }) => {
	if (!isValidAdminSession(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
		return json({ ok: false, error: 'Unauthorized' }, 401);
	}

	let payload: any;
	try {
		payload = await request.json();
	} catch {
		return json({ ok: false, error: 'Invalid request body.' }, 400);
	}
	const action = payload?.action;

	try {
		// ── SCAN: validate + full Yoast-lite analysis (token-free) ──────────────
		if (action === 'scan') {
			const mdx = String(payload.mdx ?? '');
			const editSlug = payload.editSlug ? slugify(String(payload.editSlug)) : '';
			const parsed = parsePost(mdx);
			const errors = validatePost(parsed);
			// In edit mode the slug is fixed (we're overwriting that post); otherwise derive from title.
			const slug = editSlug || (parsed.meta.title ? slugify(parsed.meta.title) : '');
			const [posts, models] = await Promise.all([postIndex(), modelSlugs()]);
			// A slug "clash" only blocks a create — when editing its own post, that's expected.
			const taken = slug && !editSlug ? posts.some((p) => p.slug === slug) : false;
			const vertical = parsed.meta.vertical as Vertical | undefined;
			return json({
				ok: errors.length === 0,
				errors,
				meta: parsed.meta,
				slug,
				slugTaken: taken,
				slots: detectImageSlots(parsed),
				preview: buildPreview(parsed, `${SITE}/blog/${slug || 'your-post'}/`),
				analysis: analyzePost(parsed, posts, slug, models),
				structured: parseStructured(parsed.frontmatter),
				recipe: vertical && RECIPE[vertical] ? RECIPE[vertical] : null,
			});
		}

		// ── LOAD: fetch an existing post's raw MDX for edit-in-place ─────────────
		if (action === 'load') {
			const slug = slugify(String(payload.slug ?? ''));
			if (!slug) return json({ ok: false, error: 'No slug given.' }, 400);
			const content = await getFile(`${BLOG_DIR}/${slug}.mdx`);
			if (content == null) return json({ ok: false, error: `No post "${slug}" found to edit.` }, 404);
			return json({ ok: true, slug, mdx: content });
		}

		// ── UPLOAD-BLOB: stage one image, return its git blob sha ───────────────
		if (action === 'upload-blob') {
			const base64 = String(payload.dataBase64 ?? '');
			const filename = String(payload.filename ?? 'image.jpg');
			if (!base64) return json({ ok: false, error: 'No image data.' }, 400);
			// base64 length ≈ 4/3 of byte size
			if (base64.length * 0.75 > MAX_IMAGE_BYTES)
				return json({ ok: false, error: 'Image too large (over 8 MB after processing).' }, 413);
			const sha = await createBlob(base64);
			return json({ ok: true, sha, ext: extOf(filename) });
		}

		// ── PUBLISH: rewrite paths + commit post & images as one commit ─────────
		if (action === 'publish') {
			const mdx = String(payload.mdx ?? '');
			const parsed = parsePost(mdx);
			const errors = validatePost(parsed);
			if (errors.length) return json({ ok: false, errors }, 400);

			const slug = slugify(String(payload.slug || parsed.meta.title || ''));
			if (!slug) return json({ ok: false, error: 'Could not derive a slug.' }, 400);
			const editing = payload.edit === true;
			// Create mode refuses to clobber an existing post; edit mode overwrites on purpose.
			if (!editing && (await fileExists(`${BLOG_DIR}/${slug}.mdx`)))
				return json({ ok: false, error: `A post with slug "${slug}" already exists.` }, 409);
			if (editing && !(await fileExists(`${BLOG_DIR}/${slug}.mdx`)))
				return json({ ok: false, error: `No post "${slug}" to edit — it may have been renamed or removed.` }, 404);

			// uploads from the client: { hero?: {sha, ext}, body: { name: {sha, ext} } }
			const uploads = payload.uploads ?? { body: {} };
			const uploadMap: UploadMap = { body: {} };
			const entries: TreeEntry[] = [];

			if (uploads.hero?.sha) {
				const ext = extOf(`x.${uploads.hero.ext || 'jpg'}`);
				uploadMap.hero = { ext };
				entries.push({ path: assetRepoPath(slug, `hero.${ext}`), sha: uploads.hero.sha });
			}
			for (const [name, u] of Object.entries<any>(uploads.body ?? {})) {
				if (!u?.sha) continue;
				const ext = extOf(`x.${u.ext || 'jpg'}`);
				uploadMap.body[name] = { ext };
				entries.push({ path: assetRepoPath(slug, `${name}.${ext}`), sha: u.sha });
			}

			// Rewrite image paths for uploaded slots, then bake in alt text, then merge
			// the structured schema blocks (vehicle/pms/featuredProducts) from the form.
			let finalMdx = applyUploads(mdx, slug, uploadMap);
			const alts: AltMap | undefined = payload.alts;
			if (alts && (alts.hero != null || alts.body)) {
				finalMdx = applyAltText(finalMdx, { hero: alts.hero, body: alts.body ?? {} });
			}
			const structured: StructuredFields | undefined = payload.structured;
			if (structured && typeof structured === 'object') {
				finalMdx = applyStructured(finalMdx, structured);
			}
			entries.push({ path: `${BLOG_DIR}/${slug}.mdx`, content: finalMdx });

			const imgCount = entries.length - 1;
			const verb = editing ? 'Update' : 'Publish';
			const commitSha = await commitFiles(
				`${verb} post: ${slug}${imgCount ? ` (+${imgCount} image${imgCount > 1 ? 's' : ''})` : ''}\n\nvia /admin/publish`,
				entries,
			);

			return json({ ok: true, slug, url: `${SITE}/blog/${slug}/`, commitSha, branch: GH_BRANCH, edited: editing });
		}

		return json({ ok: false, error: `Unknown action: ${action}` }, 400);
	} catch (err) {
		return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
	}
};
