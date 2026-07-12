import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Reader-intent vertical → selects the JSON-LD entity mix in src/lib/schema.ts.
			// Required on purpose: a post that forgets to declare one fails the build
			// (caught before deploy) instead of shipping a mis-typed page.
			vertical: z.enum(['daily-driver', 'ev', 'jdm', 'news']),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			tags: z.array(z.string()).optional(), // Tags to link articles to car models/makes
			// Q&A pairs → rendered as a visible FAQ section + FAQPage schema (AI Overview fuel)
			faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
			// Structured car facts → feeds the `Vehicle` node in the post's JSON-LD @graph
			// (and, later, the Quick Specs table the CMS renders). Optional: posts without a
			// specific subject car (roundups, how-tos) simply omit it and get no Vehicle entity.
			vehicle: z
				.object({
					name: z.string(), // display name, e.g. "Toyota Corolla AE92 (Levin / Trueno)"
					brand: z.string(), // make, e.g. "Toyota"
					model: z.string(), // e.g. "Corolla AE92"
					vehicleModelDate: z.string().optional(), // production years, e.g. "1987/1991"
					bodyType: z.string().optional(), // e.g. "Coupe", "Sedan", "SUV"
					fuelType: z.string().optional(), // e.g. "Gasoline", "Diesel", "Electric"
					transmission: z.string().optional(), // e.g. "5-speed manual"
					drivetrain: z.enum(['FWD', 'RWD', 'AWD', '4WD']).optional(),
					engines: z
						.array(
							z.object({
								name: z.string(), // e.g. "4A-GE (NA, GT / GT-APEX)"
								engineType: z.string().optional(), // e.g. "1.6L DOHC 16-valve NA"
								power: z.string().optional(), // value only, e.g. "120–140"
								powerUnit: z.string().optional(), // defaults to "PS" when omitted
							}),
						)
						.optional(),
				})
				.optional(),
			// PMS servicing data (Daily Driver vertical only) → feeds Light/Heavy HowTo
			// entities with estimatedCost. Optional & dormant until populated (via CMS);
			// a post without it simply emits no HowTo. Costs are numbers (not "1,500"
			// strings) so the MonetaryAmount stays clean — display formatting happens in
			// the visible prose table, not here.
			pms: z
				.object({
					currency: z.string().default('PHP'),
					light: z
						.object({
							name: z.string().default('Light (Minor) PMS'),
							interval: z.string().optional(),
							costMin: z.number().optional(),
							costMax: z.number().optional(),
							steps: z.array(z.string()).optional(),
						})
						.optional(),
					heavy: z
						.object({
							name: z.string().default('Heavy (Major) PMS'),
							interval: z.string().optional(),
							costMin: z.number().optional(),
							costMax: z.number().optional(),
							steps: z.array(z.string()).optional(),
						})
						.optional(),
				})
				.optional(),
			// Affiliate product picks → renders BOTH a visible "Recommended parts" section AND
			// the ItemList/Product part of the @graph, from the SAME data so the markup can never
			// describe products a reader can't see (the mismatch Google penalizes). No `price`
			// field on purpose — affiliate prices go stale; we only carry the affiliate `url`.
			featuredProducts: z
				.array(
					z.object({
						name: z.string(),
						category: z.string().optional(),
						brand: z.string().optional(),
						description: z.string().optional(), // your editorial take / why it fits
						url: z.string().url(), // affiliate link
					}),
				)
				.optional(),
		}),
});

const models = defineCollection({
	// Load Markdown and MDX files in the `src/content/models/` directory.
	loader: glob({ base: './src/content/models', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			make: z.string(),
			model: z.string(),
			yearsProduced: z.string(),
			engine: z.string(),
			transmission: z.string(),
			fuel: z.string(),
			seats: z.number(),
			bodyType: z.string(),
			averageMarketPrice: z.string(),
			heroImage: z.optional(image()),
			category: z.string().optional(), // e.g. sports, kei-truck, sedan, van
			// Optional SEO overrides — falls back to a generic template in
			// models/[slug].astro when omitted. Follow the meta title/description
			// formula in CONTENT_STYLE_GUIDE.md when setting these.
			metaTitle: z.string().optional(),
			metaDescription: z.string().optional(),
		}),
});

export const collections = { blog, models };
