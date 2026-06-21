import type { z } from 'zod';
import type { CouncilConfigSchema } from '@/schema/council';

export type CouncilConfig = z.infer<typeof CouncilConfigSchema>;
