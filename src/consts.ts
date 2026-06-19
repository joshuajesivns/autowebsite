// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'Apex Engine';
export const SITE_DESCRIPTION = 'The Ultimate Automotive Engineering Guide and Marketplace.';

// ── SEO / authority config ──────────────────────────────────────────────
// Keep SITE_URL in sync with `site` in astro.config.mjs.
export const SITE_URL = 'https://apexengine.ph';

// Paste your IDs here when you have them; each feature is skipped until set.
export const GA_MEASUREMENT_ID = '';          // e.g. 'G-XXXXXXXXXX' (Google Analytics 4)
export const GOOGLE_SITE_VERIFICATION = '';   // optional Search Console meta token

// Official profiles — populate as you create them (used for Organization sameAs).
export const SOCIAL_LINKS: string[] = [
	// 'https://www.facebook.com/...',
	// 'https://www.youtube.com/@...',
	// 'https://www.tiktok.com/@...',
];

// Business identity (NAP) for Organization structured data.
export const ORG = {
	name: SITE_TITLE,
	email: 'info@apexengine.ph',
	telephone: '+63 (2) 8888-APEX',
	streetAddress: 'Alabang Investment District',
	addressLocality: 'Muntinlupa City',
	addressRegion: 'Metro Manila',
	addressCountry: 'PH',
};
