import { z } from 'zod';

const RateRewardOption = z.object({
  type: z.literal('rate'),
  currency: z.string(),
  period: z.enum(['hour', 'day', 'project']),
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative()
});

const SalaryRewardOption = z.object({
  type: z.literal('salary'),
  currency: z.string(),
  amount: z.number().int().nonnegative()
});

const EquityRewardOption = z.object({
  type: z.literal('equity'),
  share: z.string()
});

const VacancyRewardSchema = z
  .discriminatedUnion('type', [RateRewardOption, SalaryRewardOption, EquityRewardOption])
  .superRefine((value, ctx) => {
    if (value.type === 'rate' && value.max < value.min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Максимальное значение не может быть меньше минимального',
        path: ['max']
      });
    }
  });

export const VacancySchema = z.object({
  id: z.string(),
  slug: z.string(),
  project: z.string(),
  title: z.string(),
  summary: z.string(),
  level: z.enum(['Junior', 'Middle', 'Senior']),
  employment: z.enum(['project', 'part-time', 'full-time']),
  format: z.array(z.enum(['remote', 'office', 'hybrid'])).min(1),
  reward: VacancyRewardSchema,
  language: z.string(),
  timezone: z.string(),
  deadline: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Некорректная дата дедлайна'),
  tags: z.array(z.string()).min(1),
  requirements: z.array(z.string()).min(1),
  responsibilities: z.array(z.string()).min(1),
  testTask: z.string(),
  paymentNote: z.string(),
  contact: z.object({
    name: z.string(),
    channel: z.string()
  }),
  createdAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), 'Некорректная дата публикации')
});

export const VacanciesSchema = z.array(VacancySchema);

export type Vacancy = z.infer<typeof VacancySchema>;
export type VacancyReward = z.infer<typeof VacancyRewardSchema>;
