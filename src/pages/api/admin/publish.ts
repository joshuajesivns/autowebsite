import type { APIRoute } from 'astro';
import { ADMIN_COOKIE_NAME, isValidAdminSession } from '../../../lib/adminAuth';
import { commitFiles, createBlob, fileExists, GH_BRANCH, type TreeEntry } from '../../../lib/github';
import {
	applyUploads,
	assetRepoPath,
	detectImageSlots,
	extOf,
	parsePost,
	slugify,
	type UploadMap,
	validatePost,
} from '../../../lib/publish';

export const prerender = false;

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
		// ── SCAN: validate frontmatter + list image slots ──────────────────────
		if (action === 'scan') {
			const mdx = String(payload.mdx ?? '');
			const parsed = parsePost(mdx);
			const errors = validatePost(parsed);
			const slug = parsed.meta.title ? slugify(parsed.meta.title) : '';
			const taken = slug ? await fileExists(`${BLOG_DIR}/${slug}.mdx`) : false;
			return json({
				ok: errors.length === 0,
				errors,
				meta: parsed.meta,
				slug,
				slugTaken: taken,
				slots: detectImageSlots(parsed),
			});
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
			if (await fileExists(`${BLOG_DIR}/${slug}.mdx`))
				return json({ ok: false, error: `A post with slug "${slug}" already exists.` }, 409);

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

			const finalMdx = applyUploads(mdx, slug, uploadMap);
			entries.push({ path: `${BLOG_DIR}/${slug}.mdx`, content: finalMdx });

			const imgCount = entries.length - 1;
			const commitSha = await commitFiles(
				`Publish post: ${slug}${imgCount ? ` (+${imgCount} image${imgCount > 1 ? 's' : ''})` : ''}\n\nvia /admin/publish`,
				entries,
			);

			return json({ ok: true, slug, url: `${SITE}/blog/${slug}/`, commitSha, branch: GH_BRANCH });
		}

		return json({ ok: false, error: `Unknown action: ${action}` }, 400);
	} catch (err) {
		return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
	}
};
