import { WhatsappTemplateModel } from "../../templates/models/template.model.js";

type ParamComponent = {
  type?: string;
  text?: string;
  parameters?: Array<{ type?: string; text?: string }>;
  buttons?: unknown[];
  format?: string;
};

function fillPlaceholders(
  text: string,
  params: Array<{ text?: string }>,
  parameterFormat?: string,
) {
  if (!text) return "";
  const values = params.map((p) => String(p?.text ?? ""));

  if (
    String(parameterFormat || "").toUpperCase() === "NAMED" ||
    /{{[a-zA-Z_]/.test(text)
  ) {
    let i = 0;
    return text.replace(/{{([^{}]+)}}/g, () => values[i++] ?? "");
  }

  return text.replace(/{{(\d+)}}/g, (_, num: string) => {
    const idx = Number(num) - 1;
    return values[idx] ?? "";
  });
}

function paramsFor(
  paramComponents: ParamComponent[],
  type: string,
): Array<{ text?: string }> {
  const row = paramComponents.find(
    (c) => String(c.type || "").toUpperCase() === type,
  );
  return row?.parameters || [];
}

/**
 * Build UI-friendly template components (with rendered text) from the
 * approved template definition + Meta parameter payload.
 */
export function hydrateTemplateDisplayComponents(
  storedTemplate: {
    components?: ParamComponent[];
    parameterFormat?: string;
  } | null,
  paramComponents: ParamComponent[] = [],
) {
  // Already display-shaped (has text on BODY/HEADER)
  if (
    Array.isArray(paramComponents) &&
    paramComponents.some(
      (c) =>
        typeof c.text === "string" &&
        c.text.length > 0 &&
        ["BODY", "HEADER", "FOOTER"].includes(String(c.type || "").toUpperCase()),
    )
  ) {
    return paramComponents.map((c) => ({
      type: String(c.type || "").toUpperCase(),
      text: c.text,
      format: c.format,
      parameters: c.parameters,
      buttons: c.buttons,
    }));
  }

  if (!storedTemplate?.components?.length) {
    return [];
  }

  const display: ParamComponent[] = [];

  for (const component of storedTemplate.components) {
    const type = String(component.type || "").toUpperCase();

    if (type === "HEADER") {
      const parameters = paramsFor(paramComponents, "HEADER");
      display.push({
        type: "HEADER",
        format: component.format,
        text: fillPlaceholders(
          String(component.text || ""),
          parameters,
          storedTemplate.parameterFormat,
        ),
        parameters,
      });
      continue;
    }

    if (type === "BODY") {
      const parameters = paramsFor(paramComponents, "BODY");
      display.push({
        type: "BODY",
        text: fillPlaceholders(
          String(component.text || ""),
          parameters,
          storedTemplate.parameterFormat,
        ),
        parameters,
      });
      continue;
    }

    if (type === "FOOTER") {
      display.push({
        type: "FOOTER",
        text: String(component.text || ""),
      });
      continue;
    }

    if (type === "BUTTONS") {
      display.push({
        type: "BUTTONS",
        buttons: component.buttons || [],
      });
    }
  }

  return display;
}

export async function buildStoredTemplateMessage(
  accountId: string,
  payload: any,
) {
  const name = String(payload?.template?.name || "template");
  const language =
    typeof payload?.template?.language === "string"
      ? payload.template.language
      : String(payload?.template?.language?.code || "en");

  const paramComponents = Array.isArray(payload?.template?.components)
    ? payload.template.components
    : [];

  const stored = await WhatsappTemplateModel.findOne({
    accountId,
    name: name.toLowerCase(),
  }).lean();

  const components = hydrateTemplateDisplayComponents(
    stored as any,
    paramComponents,
  );

  const bodyText =
    components.find((c) => String(c.type).toUpperCase() === "BODY")?.text ||
    name;

  const categoryRaw = stored?.category
    ? String(stored.category).toLowerCase()
    : undefined;
  const category = ["marketing", "utility", "authentication"].includes(
    String(categoryRaw),
  )
    ? categoryRaw
    : undefined;

  return {
    type: "template" as const,
    body: { text: bodyText },
    searchText: bodyText,
    template: {
      name,
      language,
      ...(category ? { category } : {}),
      components,
    },
  };
}
