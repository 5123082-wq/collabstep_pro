import { z } from 'zod';

export const createProjectFromTemplateSchema = z.object({
  templateId: z.string().min(1),
  projectTitle: z.string().min(1).max(255).optional(),
  projectDescription: z.string().max(5000).optional(),
  organizationId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  selectedTaskIds: z.array(z.string()).optional()
});
