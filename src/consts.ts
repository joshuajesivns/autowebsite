// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Apex Engine';
export const SITE_DESCRIPTION = 'The Ultimate Automotive Engineering Guide and Marketplace.';

// ── SEO / authority config ──────────────────────────────────────────────
// Keep SITE_URL in sync with `site` in astro.config.mjs.
export const SITE_URL = 'https://www.apexenginehq.com';

// Paste your IDs here when you have them; each feature is skipped until set.
export const GA_MEASUREMENT_ID = 'G-QE5FCP0VXP';   // Google Analytics 4
export const GOOGLE_SITE_VERIFICATION = 'HSbvWsGQs2LsqcS746ovWF7VAdN57syR2MZeKmg6b5s';   // Search Console verification
// Google AdSense publisher ID, e.g. "ca-pub-1234567890123456". Get it when you
// create the AdSense account (assigned at signup, before approval). The ad loader
// only renders once this is set — and also add the matching line to public/ads.txt.
export const ADSENSE_CLIENT = 'ca-pub-5056058699610793';
// The ad LOADER (adsbygoogle.js, ~57 kB of third-party JS) is gated separately from
// the publisher ID. The application was rejected 2026-07-22, so until it's approved
// the script serves no ads and only costs load time — measured as part of a 223 KiB
// unused-JS penalty that was holding FCP at 4.2s and LCP at 6.3s on mobile.
// The `google-adsense-account` meta tag still renders (it's free and is what the
// re-application verifies against). Flip this to `true` on approval.
export const ADSENSE_ACTIVE = false;

// Official profiles — populate as you create them (used for Organization sameAs).
export const SOCIAL_LINKS: string[] = [
	'https://www.facebook.com/apexenginehq/',
	'https://www.instagram.com/apexenginehq/',
	// 'https://x.com/...',
];

// Business identity (NAP) for Organization structured data.
export const ORG = {
	name: SITE_TITLE,
	email: 'info@apexenginehq.com',
	// Fill in real values when available — blank fields are omitted from structured data.
	telephone: '',
	streetAddress: '',
	addressLocality: '',
	addressRegion: '',
	addressCountry: 'PH',
};
