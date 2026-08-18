import { z } from 'zod';

export const goldenExampleSchema = z.object({
  input: z.string(),
  expected: z.string(),
});

export type GoldenExample = z.infer<typeof goldenExampleSchema>;
