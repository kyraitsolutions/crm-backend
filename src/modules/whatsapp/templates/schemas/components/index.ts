import { z } from "zod";

import { HeaderComponentSchema } from "./header.schema.js";
import { BodyComponentSchema } from "./body.schema.js";
import { FooterComponentSchema } from "./footer.schema.js";
import { ButtonsComponentSchema } from "./buttons.schema.js";

export const TemplateComponentSchema = z.discriminatedUnion("type", [
  HeaderComponentSchema,
  BodyComponentSchema,
  FooterComponentSchema,
  ButtonsComponentSchema,
]);

export {
  HeaderComponentSchema,
  BodyComponentSchema,
  FooterComponentSchema,
  ButtonsComponentSchema,
};
