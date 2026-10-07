import { z } from "zod";
import { MediaSchema } from "../media.schema.js";
import { ButtonSchema } from "./buttons.schema.js";

const CarouselCardHeaderSchema = z.object({
  type: z.literal("HEADER"),
  format: z.enum(["IMAGE", "VIDEO"]),
  media: MediaSchema,
});

const CarouselCardBodySchema = z.object({
  type: z.literal("BODY"),
  text: z.string().min(1).max(160),
});

const CarouselCardButtonsSchema = z.object({
  type: z.literal("BUTTONS"),
  buttons: z.array(ButtonSchema).min(1).max(2),
});

const CarouselCardComponentSchema = z.union([
  CarouselCardHeaderSchema,
  CarouselCardBodySchema,
  CarouselCardButtonsSchema,
]);

export const CarouselCardSchema = z.object({
  components: z.array(CarouselCardComponentSchema).min(1),
});

export const CarouselComponentSchema = z.object({
  type: z.literal("CAROUSEL"),
  cards: z.array(CarouselCardSchema).min(2).max(10),
});

export type TCarouselComponent = z.infer<typeof CarouselComponentSchema>;
