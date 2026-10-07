import { WHATSAPP_INTERACTIVE_LIMITS as LIMITS } from "../../../whatsapp/messages/constants/whatsapp-interactive.constant.js";
import { BuildInteractivePayload } from "../../../whatsapp/messages/builders/whatsapp/buildInteractivePayload.js";

export type AgentOutbound = {
  text: string;
  interactive: Record<string, unknown> | null;
  imageUrl?: string;
};

type ReplyJson = {
  messageType?: string;
  text?: string;
  imageUrl?: string;
  header?: string;
  footer?: string;
  buttons?: { id?: string; title?: string }[];
  listButton?: string;
  sections?: {
    title?: string;
    rows?: { id?: string; title?: string; description?: string }[];
  }[];
  link?: { label?: string; url?: string };
  cards?: {
    imageUrl?: string;
    text?: string;
    label?: string;
    url?: string;
  }[];
};

const clip = (value: unknown, max: number) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : "";
};

const clipBody = (value: unknown, max: number) => {
  const text = String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/:\s+/g, ":\n")
    .replace(/,\s+(?=[A-Z][^,\n]{0,40}\s+at\s+[₹$€])/g, "\n")
    .replace(/\s+and\s+(?=[A-Z][^,\n]{0,40}\s+at\s+[₹$€])/g, "\n")
    .replace(/([^\n])\s+(\d+[.)]\s+)/g, "$1\n$2")
    .replace(/\.\s+(?=[A-Z])/g, ".\n")
    .trim();
  return text ? text.slice(0, max) : "";
};

const parseReply = (raw: string): ReplyJson | null => {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let slice = trimmed.slice(start, end + 1);
  for (let extra = 0; extra < 3; extra += 1) {
    try {
      return JSON.parse(slice) as ReplyJson;
    } catch {
      if (!slice.endsWith("}")) return null;
      slice = slice.slice(0, -1).trimEnd();
    }
  }
  return null;
};

const slug = (value: string, max: number) => {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return (base || "option").slice(0, max);
};

const uniqueId = (preferred: string, title: string, used: Set<string>, max: number) => {
  let id = slug(preferred || title, max);
  let n = 2;
  while (used.has(id)) {
    const suffix = `_${n}`;
    n += 1;
    id = `${slug(preferred || title, Math.max(1, max - suffix.length))}${suffix}`;
  }
  used.add(id);
  return id;
};

const httpsUrl = (value: unknown) => {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
};

const choices = (
  items: { id?: string; title?: string }[] | undefined,
  idMax: number,
  titleMax: number,
  usedIds = new Set<string>(),
) => {
  const usedTitles = new Set<string>();
  const next = [];
  for (const item of items || []) {
    const title = clip(item?.title, titleMax);
    const key = title.toLowerCase();
    if (!title || usedTitles.has(key)) continue;
    usedTitles.add(key);
    next.push({
      id: uniqueId(String(item?.id || ""), title, usedIds, idMax),
      title,
    });
  }
  return next;
};

const inferType = (reply: ReplyJson) => {
  const explicit = String(reply.messageType || "").trim().toLowerCase();
  if (["text", "button", "list", "cta_url", "carousel", "image"].includes(explicit)) {
    return explicit;
  }
  if (httpsUrl(reply.link?.url)) return "cta_url";
  if ((reply.cards || []).length >= LIMITS.carousel.minCards) return "carousel";
  if ((reply.sections || []).some((section) => (section.rows || []).length)) return "list";
  const count = (reply.buttons || []).length;
  if (count > LIMITS.button.max) return "list";
  if (count > 0) return "button";
  return "text";
};

const headerOf = (reply: ReplyJson) => {
  const text = clip(reply.header, LIMITS.headerText);
  return text ? { type: "text", text } : undefined;
};

const footerOf = (reply: ReplyJson) => {
  const text = clip(reply.footer, LIMITS.footer);
  return text ? { text } : undefined;
};

const asList = (reply: ReplyJson, body: string) => {
  type ListRow = { id?: string; title?: string; description?: string };
  type ListSection = { title?: string; rows?: ListRow[] };
  const fromButtons: ListRow[] = (reply.buttons || []).map((button) => ({
    id: button.id,
    title: button.title,
  }));
  const sections = [];
  let rowCount = 0;
  const usedIds = new Set<string>();
  const source: ListSection[] = (reply.sections || []).some((section) => (section.rows || []).length)
    ? reply.sections || []
    : [{ title: "Options", rows: fromButtons }];

  for (const section of source) {
    if (sections.length >= LIMITS.list.maxSections || rowCount >= LIMITS.list.maxRows) break;
    const picked = choices(section.rows, LIMITS.list.rowId, LIMITS.list.rowTitle, usedIds).slice(
      0,
      LIMITS.list.maxRows - rowCount,
    );
    if (!picked.length) continue;
    const title = clip(section.title, LIMITS.list.sectionTitle);
    sections.push({
      ...(title ? { title } : {}),
      rows: picked.map((row) => {
        const sourceRow = (section.rows || []).find(
          (item) => clip(item.title, LIMITS.list.rowTitle) === row.title,
        );
        const description = clip(sourceRow?.description, LIMITS.list.rowDescription);
        return {
          id: row.id,
          title: row.title,
          ...(description ? { description } : {}),
        };
      }),
    });
    rowCount += picked.length;
  }

  if (!sections.length) return null;
  return {
    type: "list",
    header: headerOf(reply),
    body: { text: clipBody(body, LIMITS.body) },
    footer: footerOf(reply),
    action: {
      button: clip(reply.listButton, LIMITS.list.button) || "Options",
      sections,
    },
  };
};

const asButtons = (reply: ReplyJson, body: string) => {
  const buttons = choices(reply.buttons, LIMITS.button.id, LIMITS.button.title);
  if (buttons.length > LIMITS.button.max) return asList(reply, body);
  if (!buttons.length) return null;
  return {
    type: "button",
    header: headerOf(reply),
    body: { text: clipBody(body, LIMITS.body) },
    footer: footerOf(reply),
    action: {
      buttons: buttons.map((button) => ({
        type: "reply",
        reply: button,
      })),
    },
  };
};

const asCta = (reply: ReplyJson, body: string) => {
  const url = httpsUrl(reply.link?.url);
  const displayText = clip(reply.link?.label, LIMITS.carousel.displayText);
  if (!url || !displayText) return null;
  return {
    type: "cta_url",
    header: headerOf(reply),
    body: { text: clipBody(body, LIMITS.body) },
    footer: footerOf(reply),
    action: {
      name: "cta_url",
      parameters: { display_text: displayText, url },
    },
  };
};

const cardImage = (card: NonNullable<ReplyJson["cards"]>[number] & Record<string, unknown>) =>
  httpsUrl(card.imageUrl) ||
  httpsUrl(card.image) ||
  httpsUrl(card.image_url) ||
  httpsUrl(
    (card.header as { image?: { link?: unknown } } | undefined)?.image?.link,
  );

const asCarousel = (reply: ReplyJson, body: string) => {
  const cards = (reply.cards || [])
    .map((card) => {
      const imageUrl = cardImage(card as NonNullable<ReplyJson["cards"]>[number] & Record<string, unknown>);
      if (!imageUrl) return null;
      const url = httpsUrl(card.url);
      const displayText = clip(card.label, LIMITS.carousel.displayText);
      const cardBody = clip(card.text, LIMITS.carousel.cardBody);
      return {
        type: url && displayText ? "cta_url" : "image",
        header: { type: "image", image: { link: imageUrl } },
        ...(cardBody ? { body: { text: cardBody } } : {}),
        ...(url && displayText
          ? {
              action: {
                name: "cta_url",
                parameters: { display_text: displayText, url },
              },
            }
          : {}),
      };
    })
    .filter(Boolean)
    .slice(0, LIMITS.carousel.maxCards);

  if (cards.length < LIMITS.carousel.minCards) return null;
  
  const replyButtons = choices(reply.buttons, LIMITS.button.id, LIMITS.button.title).slice(
    0,
    LIMITS.button.max,
  );
  return {
    type: "carousel",
    body: { text: clipBody(body, LIMITS.body) },
    action: {
      cards,
      ...(replyButtons.length
        ? {
            buttons: replyButtons.map((button) => ({
              type: "reply",
              reply: button,
            })),
          }
        : {}),
    },
  };
};

const draftFor = (reply: ReplyJson, body: string) => {
  switch (inferType(reply)) {
    case "button":
      return asButtons(reply, body);
    case "list":
      return asList(reply, body);
    case "cta_url":
      return asCta(reply, body);
    case "carousel":
      return asCarousel(reply, body);
    default:
      return null;
  }
};

const buttonNames = (named: string) =>
  named
    .split(/,|\band\b/i)
    .map((part) =>
      part
        .replace(/[^a-z0-9 ]/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    )
    .filter((part) => part.length > 0 && part.length <= LIMITS.button.title)
    .slice(0, LIMITS.button.max);

const sentences = (rules: string[]) =>
  rules.flatMap((rule) =>
    rule
      .split(/\n+|(?<=[.!?])\s+/)
      .map((part) => part.trim())
      .filter(Boolean),
  );

const namedButtons = (sentence: string) => {
  const named =
    sentence.match(/buttons?\s*:\s*([^.\n]+)/i)?.[1] ||
    sentence.match(/buttons?\s+like\s+([^.\n]+)/i)?.[1] ||
    sentence.match(/buttons?\s+(?:follow with name|named|called)\s+([^.\n]+)/i)?.[1] ||
    "";
  return buttonNames(named);
};

const imageFollowSentence = (sentence: string) =>
  /button/i.test(sentence) &&
  /(carousel|tap images|tap image|selects? images|images are more|more than \d)/i.test(sentence);

export const imageFollowButtonTitles = (rules: string[]) => {
  for (const sentence of sentences(rules)) {
    if (!imageFollowSentence(sentence)) continue;
    const titles = namedButtons(sentence);
    if (titles.length) return titles;
  }
  return [];
};

export const selectionButtonTitles = (rules: string[]) => {
  for (const sentence of sentences(rules)) {
    if (imageFollowSentence(sentence)) continue;
    if (
      !/button/i.test(sentence) ||
      !/(pick|picks|select|selects|chosen|chooses|one product)/i.test(sentence)
    ) {
      continue;
    }
    const titles = namedButtons(sentence);
    if (titles.length) return titles;
  }
  return [];
};

export const normalizeAgentReply = (
  raw: string,
  fallbackText: string,
  allowInteractive = true,
): AgentOutbound => {
  const parsed = parseReply(raw);
  
  if (!parsed) {
    const visible = /"messageType"\s*:/.test(raw) ? "" : clipBody(raw, LIMITS.body);
    return { text: visible || clipBody(fallbackText, LIMITS.body), interactive: null };
  }

  const imageUrl = httpsUrl(parsed.imageUrl);
  const messageType = String(parsed.messageType || "").toLowerCase();
  const carouselImages = (parsed.cards || [])
    .map((card) => cardImage(card as NonNullable<ReplyJson["cards"]>[number] & Record<string, unknown>))
    .filter(Boolean);

  if (messageType === "carousel" && carouselImages.length < LIMITS.carousel.minCards) {
    const only = carouselImages[0] || imageUrl;
    return {
      text: clipBody(parsed.text, 1024) || clipBody(fallbackText, 1024),
      interactive: null,
      ...(only ? { imageUrl: only } : {}),
    };
  }

  if (messageType === "image" && imageUrl) {
    return {
      text: clipBody(parsed.text, 1024),
      interactive: null,
      imageUrl,
    };
  }

  const text = clipBody(parsed.text, LIMITS.body) || clipBody(fallbackText, LIMITS.body);
  if (!text) return { text: fallbackText, interactive: null };
  if (!allowInteractive) return { text, interactive: null };

  const draft = draftFor(parsed, text);
  if (!draft) return { text, interactive: null };

  try {
    const shaped = BuildInteractivePayload.build({ interactive: draft });
    const interactive = shaped.interactive as Record<string, unknown>;
    if (!interactive?.type) return { text, interactive: null };
    const draftButtons = (draft.action as { buttons?: unknown } | undefined)?.buttons;
    if (draft.type === "carousel" && Array.isArray(draftButtons) && draftButtons.length) {
      const action = (interactive.action || {}) as Record<string, unknown>;
      interactive.action = { ...action, buttons: draftButtons };
    }
    return { text, interactive };
  } catch {
    if (draft.type === "carousel") return { text, interactive: draft };
    return { text, interactive: null };
  }
};
