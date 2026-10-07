import { AI_AGENT_TOOL_TYPE } from "../../constants/ai-agent.constant.js";
import type { TAiAgentToolConfig } from "../../types/ai-agent.type.js";
import { assertPublicHttpUrl } from "../utils/url-guard.util.js";

const STOP = new Set([
  "the",
  "and",
  "for",
  "you",
  "your",
  "our",
  "what",
  "when",
  "where",
  "which",
  "who",
  "how",
  "can",
  "could",
  "please",
  "show",
  "tell",
  "give",
  "want",
  "need",
  "have",
  "with",
  "from",
  "this",
  "that",
  "about",
  "any",
  "are",
  "does",
  "did",
  "get",
  "list",
  "me",
]);

const tokensOf = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP.has(token));

const fold = (token: string) => {
  const forms = new Set([token]);
  if (token.endsWith("s") && token.length > 4) forms.add(token.slice(0, -1));
  else if (token.length > 3) forms.add(`${token}s`);
  return forms;
};

const endpointOf = (tool: TAiAgentToolConfig) => String(tool.config?.endpoint || "");

export const isDetailApi = (tool: TAiAgentToolConfig) => /\{id\}/i.test(endpointOf(tool));

const isCustom = (tool: TAiAgentToolConfig) =>
  Boolean(tool.enabled) && tool.type === AI_AGENT_TOOL_TYPE.CUSTOM_API;

export type TCatalogItem = { id: string; title: string };

export type TProductChoice = {
  id: string;
  title: string;
  field: string;
  kind: "image" | "text";
};

export type TSelectedProduct = {
  id: string;
  title: string;
  price: string;
  description: string;
  image: string;
  rating: string;
};

export type TProductCatalog = {
  sourceKey: string;
  items: TCatalogItem[];
  selectedId: string;
  choices: TProductChoice[];
  selected: TSelectedProduct | null;
};

const BROWSE = new Set([
  "products",
  "product",
  "catalog",
  "items",
  "item",
  "list",
  "some",
  "see",
  "show",
  "all",
  "price",
  "prices",
  "details",
  "detail",
]);

export const resolveCatalogItem = (message: string, items: TCatalogItem[]) => {
  const raw = message.trim();
  if (!raw || !items.length) return null;
  const byId = items.find((item) => item.id && item.id === raw);
  if (byId) return byId;

  const unique = [...new Set(tokensOf(raw).flatMap((token) => [...fold(token)]))];
  if (!unique.length || unique.every((token) => BROWSE.has(token))) return null;

  const scored = items
    .map((item) => {
      const titleTokens = new Set(tokensOf(item.title).flatMap((token) => [...fold(token)]));
      return { item, matched: unique.filter((token) => titleTokens.has(token)).length };
    })
    .filter((row) => row.matched === unique.length);
  if (!scored.length) return null;
  scored.sort((a, b) => b.matched - a.matched || a.item.title.length - b.item.title.length);
  if (
    scored.length > 1 &&
    scored[0].matched === scored[1].matched &&
    scored[0].item.title.length === scored[1].item.title.length
  ) {
    return null;
  }
  return scored[0].item;
};

export const pickDetailApis = (tools: TAiAgentToolConfig[], sourceKey = "") => {
  const details = tools.filter((tool) => isCustom(tool) && isDetailApi(tool));
  if (!details.length) return [];
  const source = tools.find((tool) => tool.key === sourceKey);
  const sourceEndpoint = endpointOf(source || ({} as TAiAgentToolConfig)).replace(/\/$/, "");
  if (sourceEndpoint) {
    const related = details.filter((tool) => endpointOf(tool).startsWith(sourceEndpoint));
    if (related.length) return related;
  }
  return details.length === 1 ? details : [];
};

const PRODUCT_ATTRIBUTE = new Set([
  "color",
  "colour",
  "variant",
  "size",
  "dimension",
  "brand",
  "review",
  "rating",
  "image",
  "photo",
  "picture",
  "price",
  "stock",
  "shipping",
  "material",
  "specification",
  "available",
  "availability",
]);

const attributeToken = (token: string) => {
  if (PRODUCT_ATTRIBUTE.has(token)) return true;
  const bare = token.endsWith("s") && token.length > 4 ? token.slice(0, -1) : token;
  return PRODUCT_ATTRIBUTE.has(bare);
};

export const isCatalogBrowse = (message: string) => {
  const text = message.trim().toLowerCase();
  if (
    /\b(color|colour|colors|colours|size|sizes|variant|variants|dimension|dimensions|brand|review|reviews|rating|ratings|image|images|photo|photos)\b/.test(
      text,
    )
  ) {
    return false;
  }
  return (
    /\bproducts?\b/.test(text) ||
    /\bcatalog\b/.test(text) ||
    /\bwhat do you sell\b/.test(text) ||
    /\bbrowse\b/.test(text)
  );
};

export const selectedProductFollowUp = (
  message: string,
  tools: TAiAgentToolConfig[],
  rememberedId: string,
) => {
  if (!String(rememberedId || "").trim()) return false;
  if (followUpField(message)) return true;
  if (isCatalogBrowse(message)) return false;
  const details = tools.filter((tool) => isCustom(tool) && isDetailApi(tool));
  if (!details.length) return false;
  const tokens = [...new Set(tokensOf(message).flatMap((token) => [...fold(token)]))];
  if (!tokens.length) return false;
  for (const tool of details) {
    const examples = Array.isArray(tool.config?.examples)
      ? tool.config.examples.map((item) => String(item || "")).join(" ")
      : "";
    const hay = new Set(
      tokensOf(`${tool.name} ${tool.description} ${examples}`).flatMap((token) => [...fold(token)]),
    );
    if (tokens.some((token) => hay.has(token))) return true;
  }
  return tokens.some((token) => attributeToken(token));
};

export const matchCustomApis = (message: string, tools: TAiAgentToolConfig[]) => {
  if (followUpField(message)) return [];
  const tokens = new Set(tokensOf(message).flatMap((token) => [...fold(token)]));
  if (!tokens.size) return [];
  return tools.filter((tool) => {
    if (!isCustom(tool) || isDetailApi(tool)) return false;
    const examples = Array.isArray(tool.config?.examples)
      ? tool.config.examples.map((item) => String(item || "")).join(" ")
      : "";
    const hay = tokensOf(`${tool.name} ${tool.description} ${examples} ${endpointOf(tool)}`).flatMap(
      (token) => [...fold(token)],
    );
    return hay.some((token) => tokens.has(token));
  });
};

const httpsUrl = (value: unknown) => {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
};

const clipText = (value: unknown, max = 160) =>
  String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

const compactItem = (value: unknown, descriptionMax = 140, includeImage = false) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const source = value as Record<string, unknown>;
  const preferred = ["id", "title", "name", "price", "category", "status", "sku", "description", "image"];
  const picked: Record<string, unknown> = {};
  for (const key of preferred) {
    if (source[key] == null || source[key] === "") continue;
    if (key === "image") {
      const link = includeImage ? httpsUrl(source[key]) : "";
      if (link) picked.image = link;
      continue;
    }
    if (key === "description") {
      picked.description = clipText(source[key], descriptionMax);
      continue;
    }
    picked[key] = typeof source[key] === "string" ? clipText(source[key]) : source[key];
  }
  return Object.keys(picked).length ? picked : source;
};

export const compactApiPayload = (payload: unknown) => {
  const list = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : payload &&
          typeof payload === "object" &&
          Array.isArray((payload as { products?: unknown }).products)
        ? (payload as { products: unknown[] }).products
        : null;
  if (list) {
    return {
      count: list.length,
      items: list.slice(0, 8).map((item) => compactItem(item, 140, false)),
    };
  }
  if (typeof payload === "string") return payload.slice(0, 1000);
  return compactItem(payload, 700, true);
};

export const catalogFromBody = (key: string, body: unknown): TProductCatalog | null => {
  const items = (body as { items?: unknown[] } | null)?.items;
  if (!Array.isArray(items) || !items.length) return null;
  const catalog = items
    .map((item) => {
      const row = item as { id?: unknown; title?: unknown; name?: unknown };
      return {
        id: String(row?.id ?? "").trim(),
        title: String(row?.title || row?.name || "").trim(),
      };
    })
    .filter((item) => item.id && item.title);
  if (!catalog.length) return null;
  return { sourceKey: key, items: catalog, selectedId: "", choices: [], selected: null };
};

const unwrapProduct = (record: unknown): Record<string, unknown> | null => {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const row = record as Record<string, unknown>;
  const nested = row.data;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>;
    if (inner.id != null || inner.name || inner.title || inner.image || inner.images) return inner;
  }
  if (row.id != null || row.name || row.title || row.image || row.images) return row;
  return null;
};

const firstImage = (row: Record<string, unknown>) => {
  const direct = httpsUrl(row.image) || httpsUrl(row.thumbnail);
  if (direct) return direct;
  if (!Array.isArray(row.images)) return "";
  for (const item of row.images) {
    const link = httpsUrl(item);
    if (link) return link;
  }
  return "";
};

const imageList = (row: Record<string, unknown>) => {
  const links = Array.isArray(row.images) ? row.images.map((item) => httpsUrl(item)).filter(Boolean) : [];
  if (links.length) return [...new Set(links)].slice(0, 4);
  const thumb = httpsUrl(row.thumbnail);
  const image = httpsUrl(row.image);
  return [...new Set([image, thumb].filter(Boolean))].slice(0, 4);
};

const variantList = (row: Record<string, unknown>) => {
  if (!Array.isArray(row.variants)) return undefined;
  const variants = row.variants
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const variant = item as Record<string, unknown>;
      const color = fieldText(variant.color) || fieldText(variant.colour);
      const size = fieldText(variant.size);
      const name = fieldText(variant.name) || fieldText(variant.title);
      if (!color && !size && !name) return null;
      return {
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
        ...(size ? { size } : {}),
        price: fieldText(variant.price),
        stock: fieldText(variant.stock),
      };
    })
    .filter((item) => item !== null)
    .slice(0, 8);
  return variants.length ? variants : undefined;
};

export const productForPrompt = (record: unknown) => {
  const row = unwrapProduct(record);
  if (!row) return null;
  const images = imageList(row);
  const title = fieldText(row.title) || fieldText(row.name);
  if (!title && !images.length) return null;
  return {
    id: String(row.id ?? "").trim(),
    name: title,
    price: fieldText(row.price),
    originalPrice: fieldText(row.originalPrice),
    currency: fieldText(row.currency),
    brand: fieldText(row.brand),
    category: fieldText(row.category),
    description: fieldText(row.description).slice(0, 500),
    rating: fieldText(row.rating) || fieldText(readPath(row, "rating.rate")),
    reviewCount: fieldText(row.reviewCount),
    images,
    variants: variantList(row),
    dimensions: row.dimensions && typeof row.dimensions === "object" ? row.dimensions : undefined,
    specifications:
      row.specifications && typeof row.specifications === "object" ? row.specifications : undefined,
    availability: fieldText(row.availability),
  };
};

export const productSnapshot = (record: unknown): TSelectedProduct | null => {
  const row = unwrapProduct(record);
  if (!row) return null;
  const title = fieldText(row.title) || fieldText(row.name);
  const image = firstImage(row);
  if (!title && !image) return null;
  const rate = fieldText(row.rating) || fieldText(readPath(row, "rating.rate"));
  return {
    id: String(row.id ?? "").trim(),
    title,
    price: fieldText(row.price),
    description: fieldText(row.description).slice(0, 700),
    image,
    rating: rate,
  };
};

const CHOICE_LABELS: Record<string, string> = {
  image: "Image",
  description: "Details",
  price: "Price",
  rating: "Rating",
  "rating.rate": "Rating",
  category: "Category",
  title: "Name",
  name: "Name",
};

const choiceLabel = (field: string) =>
  CHOICE_LABELS[field] ||
  field
    .split(".")
    .pop()!
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 20);

const FOLLOW_UP: { field: "image" | "price" | "description" | "rating"; words: string[] }[] = [
  { field: "image", words: ["image", "images", "photo", "photos", "picture", "pictures"] },
  { field: "price", words: ["price", "cost"] },
  { field: "description", words: ["details", "detail", "description"] },
  { field: "rating", words: ["rating", "rate"] },
];

const BUTTON_FIELD = /^(images|image|photos|photo|pictures|picture|price|cost|details|detail|description|rating|rate|buy)$/i;
const GENERIC_BUTTON_PREFIX = /^(btn|button|id|item|option|choice|reply)$/i;

export const productIdFromButton = (selectionId: string) => {
  const raw = String(selectionId || "").trim();
  if (!raw) return "";
  const product = raw.match(/^(prod_[A-Za-z0-9]+)_(.+)$/);
  if (product?.[1]) return product[1];
  const match = raw.match(/^(.+)_(images|image|photos|photo|pictures|picture|price|cost|details|detail|description|rating|rate|buy)$/i);
  if (match?.[1]) {
    if (GENERIC_BUTTON_PREFIX.test(match[1]) || BUTTON_FIELD.test(match[1])) return "";
    return match[1];
  }
  if (BUTTON_FIELD.test(raw) || GENERIC_BUTTON_PREFIX.test(raw)) return "";
  return raw;
};

export const followUpField = (message: string) => {
  const raw = message.trim().toLowerCase();
  return FOLLOW_UP.find((item) => item.words.includes(raw))?.field || null;
};

export const selectedFieldReply = (message: string, product: TSelectedProduct | null) => {
  const field = followUpField(message);
  if (!field || !product) return null;
  if (field === "image") {
    if (!product.image) return null;
    return { text: product.title || "Product image", imageUrl: product.image };
  }
  if (field === "price") {
    if (!product.price) return null;
    return { text: `Price: ${product.price}`, imageUrl: "" };
  }
  if (field === "rating") {
    if (!product.rating) return null;
    return { text: `Rating: ${product.rating}`, imageUrl: "" };
  }
  if (!product.description) return null;
  return { text: product.description, imageUrl: "" };
};

export const matchProductChoice = (message: string, choices: TProductChoice[] = []) => {
  const raw = message.trim().toLowerCase();
  if (!raw) return null;
  return choices.find((choice) => choice.id.toLowerCase() === raw || choice.title.toLowerCase() === raw) || null;
};

export const productChoices = (
  record: unknown,
  config: { imageField?: unknown; replyFields?: unknown } = {},
) => {
  if (!record || typeof record !== "object" || Array.isArray(record)) return [];
  const configuredImage = String(config.imageField || "").trim();
  const configuredFields = String(config.replyFields || "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  const choices: TProductChoice[] = [];
  const imageField = configuredImage || (httpsUrl(readPath(record, "image")) ? "image" : "");
  if (imageField && httpsUrl(readPath(record, imageField))) {
    choices.push({ id: "image", title: "Image", field: imageField, kind: "image" });
  }
  const fields = configuredFields.length
    ? configuredFields
    : ["description", "rating.rate"].filter((field) => fieldText(readPath(record, field)));
  const seen = new Set<string>();
  for (const field of fields) {
    if (field === imageField || field === "title" || field === "name") continue;
    const value = fieldText(readPath(record, field));
    if (!value || seen.has(choiceLabel(field).toLowerCase())) continue;
    seen.add(choiceLabel(field).toLowerCase());
    choices.push({
      id: field.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() || "detail",
      title: choiceLabel(field),
      field,
      kind: "text",
    });
  }
  return choices;
};

export const replyForChoice = (record: unknown, choice: TProductChoice) => {
  if (choice.kind === "image") {
    const link = httpsUrl(readPath(record, choice.field));
    const title = fieldText(readPath(record, "title")) || fieldText(readPath(record, "name"));
    return link
      ? { link, caption: title.slice(0, 1024) }
      : { link: "", caption: "I don't have an image for this product." };
  }
  if (choice.field === "price") {
    const price = fieldText(readPath(record, "price"));
    return { link: "", caption: price ? `Price: ${price}` : "I don't have a price for this product." };
  }
  if (choice.field.startsWith("rating")) {
    const rate = fieldText(readPath(record, choice.field)) || fieldText(readPath(record, "rating.rate"));
    const count = fieldText(readPath(record, "rating.count"));
    if (!rate) return { link: "", caption: "I don't have a rating for this product." };
    return { link: "", caption: count ? `Rating: ${rate} (${count} reviews)` : `Rating: ${rate}` };
  }
  const text = fieldText(readPath(record, choice.field));
  return { link: "", caption: text || "I don't have that for this product." };
};

const readPath = (source: unknown, path: string) => {
  let current = source;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const fieldText = (value: unknown) => {
  if (value == null || typeof value === "object") return "";
  return String(value).replace(/\s+/g, " ").trim();
};

export const replyFromRecord = (
  record: unknown,
  config: { imageField?: unknown; replyFields?: unknown },
) => {
  const imageField = String(config.imageField || "").trim();
  const fields = String(config.replyFields || "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  if (!imageField && !fields.length) return null;
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const link = imageField ? httpsUrl(readPath(record, imageField)) : "";
  const caption = fields
    .map((field) => fieldText(readPath(record, field)))
    .filter(Boolean)
    .join("\n\n")
    .slice(0, link ? 1024 : 3500);
  if (!link && !caption) return null;
  return { link, caption };
};

export type TCustomApiRequest = {
  method?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  authType?: string;
  authToken?: string;
  timeoutMs?: number;
};

const fill = (value: string, vars: Record<string, string>) =>
  value.replace(/\{([a-zA-Z0-9_.]+)\}/g, (match, key) => vars[key] ?? match);

const listItems = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const row = payload as { items?: unknown; data?: unknown; products?: unknown };
  if (Array.isArray(row.items)) return row.items;
  if (Array.isArray(row.data)) return row.data;
  if (Array.isArray(row.products)) return row.products;
  return [];
};

const lookupProductId = async (collectionUrl: string, message: string) => {
  const tokens = tokensOf(message);
  if (!tokens.length || tokens.every((token) => BROWSE.has(token)) || followUpField(message)) {
    return "";
  }
  const response = await fetch(collectionUrl, { headers: { accept: "application/json" } });
  const payload = await response.json().catch(() => null);
  const items = listItems(payload)
    .map((item) => {
      const row = item as { id?: unknown; title?: unknown; name?: unknown };
      return { id: String(row?.id ?? "").trim(), title: String(row?.title || row?.name || "").trim() };
    })
    .filter((item) => item.id && item.title);
  const found = resolveCatalogItem(message, items);
  console.log("CUSTOM_API_MATCH", {
    message,
    matchedId: found?.id || "",
    matchedTitle: found?.title || "",
  });
  return found?.id || "";
};

const resultPreview = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return {
      type: "list",
      count: payload.length,
      items: payload.slice(0, 5).map((item) => {
        const row = item as { id?: unknown; title?: unknown; name?: unknown };
        return { id: row?.id, title: row?.title || row?.name };
      }),
    };
  }
  if (payload && typeof payload === "object") {
    const row = payload as Record<string, unknown>;
    return {
      id: row.id,
      title: row.title || row.name,
      price: row.price,
      image: row.image,
      description: row.description,
      rating: row.rating,
    };
  }
  return payload;
};

export const callCustomApi = async (
  config: TCustomApiRequest,
  vars: Record<string, string> = {},
) => {
  let endpoint = fill(String(config.endpoint || "").trim(), vars);
  let recordId = String(vars.id || "").trim();
  if (!recordId && vars.query) {
    const collectionUrl = endpoint.replace(/\/$/, "");
    recordId = await lookupProductId(collectionUrl, String(vars.query)).catch(() => "");
  }
  if (recordId && !endpoint.includes(`/${recordId}`)) {
    endpoint = `${endpoint.replace(/\/$/, "")}/${encodeURIComponent(recordId)}`;
  }
  if (!endpoint || endpoint.includes("{")) throw new Error("Custom API endpoint is missing");
  const parsedUrl = await assertPublicHttpUrl(endpoint);
  const url = new URL(parsedUrl.toString());
  const params = config.params || {};

  for (const [name, value] of Object.entries(params)) {
    const next = fill(String(value || ""), vars).trim();
    if (next) url.searchParams.set(name, next);
  }
  
  const headers: Record<string, string> = {
    accept: "application/json",
    ...(config.headers || {}),
  };
  if (String(config.authType || "") === "bearer" && config.authToken) {
    headers.authorization = `Bearer ${String(config.authToken)}`;
  }
  const method = String(config.method || "GET").toUpperCase();
  // console.log("CUSTOM_API_CALL", {
  //   method,
  //   url: url.toString(),
  //   id: recordId,
  //   message: String(vars.query || ""),
  // }); 
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(config.timeoutMs) || 10000);
  try {
    const response = await fetch(url.toString(), {
      method,
      redirect: "error",
      signal: controller.signal,
      headers,
    });
    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text.slice(0, 1000);
    }
    const record =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : null;
    console.log("CUSTOM_API_RESULT", {
      url: url.toString(),
      status: response.status,
      body: resultPreview(payload),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: compactApiPayload(payload),
      record,
      error: response.ok ? "" : `HTTP ${response.status}`,
    };
  } finally {
    clearTimeout(timeout);
  }
};
