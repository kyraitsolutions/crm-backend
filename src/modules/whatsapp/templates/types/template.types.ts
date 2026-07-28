import { z } from "zod";

import { TemplateSchema } from "../schemas/template.schema.js";
import { MediaSchema } from "../schemas/media.schema.js";
import { VariableMappingSchema } from "../schemas/variable.schema.js";

import {
  HeaderComponentSchema,
  BodyComponentSchema,
  FooterComponentSchema,
  ButtonsComponentSchema,
  TemplateComponentSchema,
} from "../schemas/components/index.js";

export type TTemplate = z.infer<typeof TemplateSchema>;

export type TTemplateComponent = z.infer<typeof TemplateComponentSchema>;
export type THeaderComponent = z.infer<typeof HeaderComponentSchema>;
export type TBodyComponent = z.infer<typeof BodyComponentSchema>;
export type TFooterComponent = z.infer<typeof FooterComponentSchema>;
export type TButtonsComponent = z.infer<typeof ButtonsComponentSchema>;

export type TMedia = z.infer<typeof MediaSchema>;
export type TVariableMapping = z.infer<typeof VariableMappingSchema>;
