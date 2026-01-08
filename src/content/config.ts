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
		quiz: z.array(z.object({
			question: z.string(),
			options: z.array(z.string()),
			correctAnswer: z.number(),
			explanation: z.string(),
		})).optional(),
	}),
});

const wiki = defineCollection({
	type: 'content',
	schema: z.object({
		term: z.string(),
		aliases: z.array(z.string()).optional(),
		category: z.enum(['database', 'java', 'kotlin', 'spring', 'architecture', 'infra', 'general']),
		summary: z.string(),
		related: z.array(z.string()).optional(),
	}),
});

export const collections = { blog, wiki };
