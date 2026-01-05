import { z } from 'zod';

export const createTemplateTaskSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  parentTaskId: z.string().nullable().optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().max(5000, 'Description is too long').optional(),
  defaultStatus: z.enum(['new', 'in_progress', 'review', 'done', 'blocked']).default('new'),
  defaultPriority: z.enum(['low', 'med', 'high', 'urgent']).optional(),
  defaultLabels: z.array(z.string()).default([]),
  offsetStartDays: z.number().int().min(0).default(0),
  offsetDueDays: z.number().int().min(0).optional(),
  estimatedTime: z.number().int().min(0).nullable().optional(),
  storyPoints: z.number().int().min(0).nullable().optional(),
  position: z.number().int().min(0).optional()
});

export const updateTemplateTaskSchema = z.object({
  parentTaskId: z.string().nullable().optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long').optional(),
  description: z.string().max(5000, 'Description is too long').optional(),
  defaultStatus: z.enum(['new', 'in_progress', 'review', 'done', 'blocked']).optional(),
  defaultPriority: z.enum(['low', 'med', 'high', 'urgent']).optional(),
  defaultLabels: z.array(z.string()).optional(),
  offsetStartDays: z.number().int().min(0).optional(),
  offsetDueDays: z.number().int().min(0).optional(),
  estimatedTime: z.number().int().min(0).nullable().optional(),
  storyPoints: z.number().int().min(0).nullable().optional(),
  position: z.number().int().min(0).optional()
});

export const reorderTasksSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1, 'At least one task ID is required')
});

