import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
			tags: z.array(z.enum(['Java', 'Kotlin', 'Spring', 'Architecture', 'Database', 'MySQL', 'JPA', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'AWS', 'CS', 'OS', 'Network', 'Retrospective'])).optional(),
			series: z.string().optional(),
			seriesOrder: z.number().optional(),
			quiz: z.array(z.object({
				question: z.string(),
				options: z.array(z.string()),
				correctAnswer: z.number(),
				explanation: z.string().optional(),
			})).optional(),
		}),
});

const wiki = defineCollection({
	loader: glob({ base: './src/content/wiki', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		term: z.string(),
		aliases: z.array(z.string()).optional(),
		category: z.enum(['database', 'java', 'spring', 'architecture', 'infra', 'general']),
		summary: z.string(),
	}),
});

export const collections = { blog, wiki };
