import { z } from "zod";

export const HeaderExampleSchema = z.object({
  header_text: z.array(z.string()),
});

export const BodyPositionalExampleSchema = z.object({
  body_text: z.array(z.array(z.string())),
});

export const BodyNamedExampleSchema = z.object({
  body_text_named_params: z.array(
    z.object({
      param_name: z.string(),
      example: z.string(),
    }),
  ),
});

export const BodyExampleSchema = z.union([
  BodyPositionalExampleSchema,
  BodyNamedExampleSchema,
]);
