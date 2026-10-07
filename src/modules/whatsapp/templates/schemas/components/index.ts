import { z } from "zod";

import { HeaderComponentSchema } from "./header.schema.js";
import { BodyComponentSchema } from "./body.schema.js";
import { FooterComponentSchema } from "./footer.schema.js";
import { ButtonsComponentSchema } from "./buttons.schema.js";
import { CarouselComponentSchema } from "./carousel.schema.js";

export const TemplateComponentSchema = z.union([
  HeaderComponentSchema,
  BodyComponentSchema,
  FooterComponentSchema,
  ButtonsComponentSchema,
  CarouselComponentSchema,
]);

export {
  HeaderComponentSchema,
  BodyComponentSchema,
  FooterComponentSchema,
  ButtonsComponentSchema,
  CarouselComponentSchema,
};
