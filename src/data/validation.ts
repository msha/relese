import { z } from 'zod';

export const ReleaseTypeSchema = z.enum(['initial', 'major', 'minor', 'patch', 'hotfix']);

export const ReleaseSchema = z.object({
  version: z.string().min(1),
  date: z.string().datetime(),
  type: ReleaseTypeSchema,
  highlights: z.array(z.string()),
  features: z.array(z.string()),
  improvements: z.array(z.string()),
  bugfixes: z.array(z.string()),
});

export const ReleasesArraySchema = z.array(ReleaseSchema);

export const DateRangeSchema = z.enum(['thisYear', 'lastYear', 'older']);

export const FilterStateSchema = z.object({
  version: z.string().optional(),
  dateRange: DateRangeSchema.optional(),
  type: ReleaseTypeSchema.optional(),
});

export type ValidatedRelease = z.infer<typeof ReleaseSchema>;
export type ValidatedReleaseType = z.infer<typeof ReleaseTypeSchema>;
export type ValidatedDateRange = z.infer<typeof DateRangeSchema>;
export type ValidatedFilterState = z.infer<typeof FilterStateSchema>;