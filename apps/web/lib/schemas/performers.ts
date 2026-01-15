import { z } from 'zod';

export const VacancyResponseStatusSchema = z.enum(['pending', 'accepted', 'rejected']);

export const VacancyResponseSchema = z.object({
  message: z.string().max(4000).optional(),
  status: VacancyResponseStatusSchema.optional()
});

export const PerformerRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(4000).optional(),
  projectId: z.string().optional()
});

export const PortfolioItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().max(4000).optional(),
  url: z.string().url().optional(),
  fileUrl: z.string().url().optional(),
  projectId: z.string().optional(),
  order: z.number().int().min(0).optional()
});

export const CaseSchema = z.object({
  title: z.string().min(1),
  description: z.string().max(4000).optional(),
  outcome: z.string().max(4000).optional(),
  projectId: z.string().optional()
});
