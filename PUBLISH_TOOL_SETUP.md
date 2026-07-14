# Paste-and-Publish Tool — Setup

The publish tool lets you paste an AI-written MDX article, attach photos, and publish it to
Apex Engine — all from a browser, no Claude Code needed.

- Page: `/admin/publish` (protected by your existing admin password)
- Code: `src/pages/admin/publish.astro`, `src/pages/api/admin/publish.ts`,
  `src/lib/publish.ts`, `src/lib/github.ts`

It's already built. It just needs **one secret** before it can publish: a GitHub token that
lets it commit posts to this repo. This is the only manual step.

---

## Step 1 — Create a GitHub token (2 minutes)

1. Go to **https://github.com/settings/tokens?type=beta** (Fine-grained tokens → *Generate new token*).
2. **Token name:** `apex-publish` (anything).
3. **Expiration:** your choice (90 days, or custom/no-expiry — you'll paste a new one when it lapses).
4. **Resource owner:** `joshuajesivns`.
5. **Repository access:** *Only select repositories* → pick **`autowebsite`**.
6. **Permissions →** *Repository permissions* → **Contents: Read and write**. (Leave everything else.)
7. Click **Generate token** and **copy it** (starts with `github_pat_…`). You won't see it again.

> Keep it scoped to just `autowebsite` + Contents. If it ever leaks, delete it on that same page
> and generate a new one — nothing else is exposed.

## Step 2 — Add it to Vercel

1. Vercel → the Apex Engine project → **Settings → Environment Variables**.
2. Add:
   - **Name:** `GITHUB_TOKEN`
   - **Value:** the `github_pat_…` you copied
   - **Environments:** Production (and Preview if you want to test on previews)
3. Save, then **redeploy** (Deployments → ⋯ → Redeploy) so the new variable is picked up.

That's it. Once redeployed, `/admin/publish` can publish.

---

## Optional — safe first test (no production impact)

Before publishing for real, you can point the tool at a throwaway branch. Only `main`
auto-deploys, so a commit anywhere else is safe to inspect on GitHub.

1. Create a branch in the repo (GitHub → branch dropdown → type `publish-test` → create).
2. In Vercel env vars, add `PUBLISH_BRANCH = publish-test`, redeploy.
3. Publish a test post through `/admin/publish` → check the commit landed on the `publish-test`
   branch on GitHub, images and all.
4. When happy, **remove** `PUBLISH_BRANCH` (or set it to `main`) and redeploy. Delete the test branch.

---

## How to use it

1. Run your prompt builder → paste the prompt into any AI chat → copy the MDX it returns.
2. Open `/admin/publish`, paste the MDX, click **Scan**.
   - It checks the frontmatter (flags a missing/invalid `vertical`, title, description, or date).
   - It lists every image: the hero + each in-body Figure/Split, with captions so you know which is which.
3. Attach a photo to any slot you want (skip a slot to keep its placeholder). Photos are
   auto-resized to ≤2000px and converted to WebP in your browser before upload.
4. Confirm the **slug** (the URL). If it's already taken, change it.
5. Click **Publish**. It commits the post + photos as one commit; Vercel deploys; live in a minute or two.

**Safety:** a malformed paste can't take the site down — if the build fails, Vercel keeps the last
good version live. Worst case is "that post didn't publish."

**Note:** the tool sets `vertical`, hero + body images, and publishes the article as-is. The richer
schema fields (`vehicle`, `pms`, `featuredProducts`) are not entered here — those are the CMS's job.
