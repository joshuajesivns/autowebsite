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

// Official profiles — populate as you create them (used for Organization sameAs).
export const SOCIAL_LINKS: string[] = [
	// 'https://www.facebook.com/...',
	// 'https://www.youtube.com/@...',
	// 'https://www.tiktok.com/@...',
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
