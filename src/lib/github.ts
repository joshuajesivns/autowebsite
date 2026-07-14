// Thin GitHub REST wrapper for the publish tool. Commits the post + its images
// as ONE commit via the Git Data API (blobs → tree → commit → ref), so a
// publish is atomic: either the whole post lands or nothing does. Server-only —
// reads the token from an env var that must never reach the browser.

const API = 'https://api.github.com';

// The live content repo. If you ever rename/move it, change these two.
export const GH_OWNER = 'joshuajesivns';
export const GH_REPO = 'autowebsite';
// Defaults to the production branch. Set PUBLISH_BRANCH (e.g. to a throwaway
// "publish-test" branch) to trial the tool without deploying to production —
// only `main` auto-deploys, so a commit to any other branch is safe to inspect.
export const GH_BRANCH = import.meta.env.PUBLISH_BRANCH || 'main';

function token(): string {
	const t = import.meta.env.GITHUB_TOKEN;
	if (!t) {
		throw new Error(
			'GITHUB_TOKEN is not set. Add a fine-grained GitHub token (Contents: Read and write on the ' +
				`${GH_OWNER}/${GH_REPO} repo) as a GITHUB_TOKEN environment variable in Vercel, then redeploy.`,
		);
	}
	return t;
}

async function gh(path: string, init: RequestInit = {}): Promise<Response> {
	return fetch(`${API}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${token()}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Content-Type': 'application/json',
			'User-Agent': 'apex-engine-publisher',
			...(init.headers ?? {}),
		},
	});
}

async function ghJson<T = any>(path: string, init?: RequestInit): Promise<T> {
	const res = await gh(path, init);
	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`GitHub ${init?.method ?? 'GET'} ${path} failed (${res.status}): ${detail.slice(0, 300)}`);
	}
	return res.json() as Promise<T>;
}

const repo = `/repos/${GH_OWNER}/${GH_REPO}`;

/** True if a file already exists on the branch (used to prevent slug clobber). */
export async function fileExists(path: string): Promise<boolean> {
	const res = await gh(`${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${GH_BRANCH}`);
	if (res.status === 200) return true;
	if (res.status === 404) return false;
	const detail = await res.text().catch(() => '');
	throw new Error(`GitHub exists-check failed (${res.status}): ${detail.slice(0, 200)}`);
}

/** Upload one binary file as a git blob; returns its sha for inclusion in a tree. */
export async function createBlob(base64Content: string): Promise<string> {
	const out = await ghJson<{ sha: string }>(`${repo}/git/blobs`, {
		method: 'POST',
		body: JSON.stringify({ content: base64Content, encoding: 'base64' }),
	});
	return out.sha;
}

export interface TreeEntry {
	path: string; // repo-root-relative
	content?: string; // for text files (utf-8)
	sha?: string; // for pre-uploaded blobs (images)
}

/**
 * Create one commit that adds/updates every entry, on top of the current branch
 * tip. Returns the new commit sha.
 */
export async function commitFiles(message: string, entries: TreeEntry[]): Promise<string> {
	const ref = await ghJson<{ object: { sha: string } }>(`${repo}/git/ref/heads/${GH_BRANCH}`);
	const baseCommitSha = ref.object.sha;
	const baseCommit = await ghJson<{ tree: { sha: string } }>(`${repo}/git/commits/${baseCommitSha}`);

	const tree = await ghJson<{ sha: string }>(`${repo}/git/trees`, {
		method: 'POST',
		body: JSON.stringify({
			base_tree: baseCommit.tree.sha,
			tree: entries.map((e) => ({
				path: e.path,
				mode: '100644',
				type: 'blob',
				...(e.sha ? { sha: e.sha } : { content: e.content ?? '' }),
			})),
		}),
	});

	const commit = await ghJson<{ sha: string }>(`${repo}/git/commits`, {
		method: 'POST',
		body: JSON.stringify({ message, tree: tree.sha, parents: [baseCommitSha] }),
	});

	await ghJson(`${repo}/git/refs/heads/${GH_BRANCH}`, {
		method: 'PATCH',
		body: JSON.stringify({ sha: commit.sha }),
	});

	return commit.sha;
}
