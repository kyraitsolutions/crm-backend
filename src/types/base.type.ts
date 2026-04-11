import { z } from "zod";

export const ZTimestamps = z.object({
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

export const ZBaseEntity = z.object({
  id: z.string(),
  ...ZTimestamps.shape,
});

export type TBaseEntity = z.infer<typeof ZBaseEntity>;
