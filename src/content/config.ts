import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
		tags: z.array(z.string()).optional(),
		series: z.string().optional(),
		seriesOrder: z.number().optional(),
	}),
});

const wiki = defineCollection({
	type: 'content',
	schema: z.object({
		term: z.string(),
		aliases: z.array(z.string()).optional(),
		category: z.enum(['database', 'java', 'spring', 'architecture', 'infra', 'general']),
		summary: z.string(),
	}),
});

export const collections = { blog, wiki };
