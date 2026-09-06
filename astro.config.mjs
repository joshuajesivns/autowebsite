// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Real domain — keep in sync with SITE_URL in src/consts.ts.
	// NOTE: only merge to production once this domain's DNS points to Vercel.
	site: 'https://www.apexenginehq.com',
	// Matches vercel.json's trailingSlash:true so dev matches the redirect Vercel enforces in prod.
	trailingSlash: 'always',
	// Site stays static by default; only routes with `export const prerender = false`
	// (the PMS-report API + admin moderation) render on-demand via this adapter.
	adapter: vercel(),
	// Keep admin/internal routes out of the sitemap (also Disallowed in public/robots.txt).
	integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/admin/') })],
	// NOTE: the five ~200-word /models/* stubs were removed (zero clicks ever; they
	// cannibalised the guides that outrank them). Their 301s live in vercel.json, NOT
	// here: Astro normalises redirect keys to the slash-less form, which never matches
	// the trailing-slash URLs this site actually publishes. Recover the stub source from
	// git if the AE86 / R34 guides ever get written for real.

	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
