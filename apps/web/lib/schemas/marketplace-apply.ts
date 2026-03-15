import { z } from 'zod';

const sourceSchema = z.object({
  sourceKind: z.enum(['template', 'solution']),
  sourceId: z.string().min(1)
});

export const marketplaceApplySchema = z.discriminatedUnion('targetMode', [
  sourceSchema.extend({
    targetMode: z.literal('new_project'),
    organizationId: z.string().min(1),
    projectTitle: z.string().min(1).max(255).optional(),
    projectDescription: z.string().max(5000).optional()
  }),
  sourceSchema.extend({
    targetMode: z.literal('existing_project'),
    projectId: z.string().min(1)
  })
]);

export type MarketplaceApplyInput = z.infer<typeof marketplaceApplySchema>;
