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
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			tags: z.array(z.string()).optional(), // Tags to link articles to car models/makes
			// Q&A pairs → rendered as a visible FAQ section + FAQPage schema (AI Overview fuel)
			faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
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
		}),
});

export const collections = { blog, models };
