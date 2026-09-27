import { productForPrompt } from "../../tools/services/custom-api.service.js";
import { WHATSAPP_INTERACTIVE_LIMITS as LIMITS } from "../../../whatsapp/messages/constants/whatsapp-interactive.constant.js";
import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import type { TRetrievedChunk } from "../../types/knowledge.type.js";
import type { TRuntimeToolResult } from "../types/runtime.type.js";

const LENGTH_HINT: Record<string, string> = {
  short: "Keep replies to 1-2 short sentences.",
  medium: "Keep replies to 2-4 sentences.",
  long: "You may write a fuller reply, still concise.",
};

export const buildSystemPrompt = (
  config: TAiAgentConfig,
  context: {
    retrievedChunks: TRetrievedChunk[];
    toolResults: TRuntimeToolResult[];
    selectedProduct?: Record<string, string> | null;
  },
) => {
  const name = config.identity.name || "Kyra AI Agent";
  const lines = [
    `You are ${name}, a WhatsApp-first assistant for this business.`,
    config.identity.description
      ? `Business: ${config.identity.description}`
      : "",
    config.identity.industry ? `Industry: ${config.identity.industry}` : "",
    config.identity.website ? `Website: ${config.identity.website}` : "",
    "",
    "Ground rules (check these before you choose buttons, a list, or plain text):",
    ...config.groundRules.map((rule) => `- ${rule}`),
    "",
    `Voice: ${config.voice.preset}. Language: ${config.voice.language || "en"}.`,
    LENGTH_HINT[config.voice.responseLength] || LENGTH_HINT.medium,
    config.voice.customInstructions,
    "",
    "Skills in play:",
    ...config.skills
      .filter((skill) => skill.enabled)
      .map((skill) => {
        const when = skill.whenToUse ? ` When to use: ${skill.whenToUse}` : "";
        const collect = Array.isArray(skill.config?.collectFields)
          ? skill.config.collectFields
              .map(
                (field) =>
                  `${field.question} → save to contact attribute "${field.attribute}"${
                    field.required ? " (required before continuing)" : ""
                  }`,
              )
              .join("; ")
          : "";
        const tools = Array.isArray(skill.config?.connectedToolKeys)
          ? skill.config.connectedToolKeys.filter(Boolean).join(", ")
          : "";
        return `- ${skill.name}:${when} How: ${skill.instructions}${
          collect ? ` Collect: ${collect}` : ""
        }${tools ? ` Connected tools: ${tools}` : ""}`;
      }),
  ];

  if (config.safety.neverInventFacts) {
    lines.push(
      "",
      "Never invent prices, availability, policies, or product details.",
    );
  }

  if (context.retrievedChunks.length) {
    lines.push("", "Retrieved knowledge (use only this for facts):");
    context.retrievedChunks.forEach((chunk, index) => {
      const heading = chunk.metadata?.heading;
      const label = [chunk.title, heading && heading !== chunk.title ? heading : ""]
        .filter(Boolean)
        .join(" — ");
      lines.push(`[Knowledge ${index + 1}${label ? ` — ${label}` : ""}]\n${chunk.content}`);
    });
    lines.push(
      "",
      "How to answer from knowledge:",
      "- Answer the customer's question directly in a short WhatsApp message.",
      "- If a knowledge entry is a Question and Answer pair that matches, reply with that answer in your own words.",
      "- Do not paste testimonials, menus, feature lists, or any entry that does not answer the question.",
      "- If none of the entries answer the question, say you do not have that information.",
    );
  } else {
    lines.push(
      "",
      "No knowledge snippets were retrieved. Do not invent facts. Ask a clarifying question or offer a human handoff.",
    );
  }

  if (context.toolResults.length) {
    lines.push(
      "",
      "Tool results (live data from connected actions; use this instead of guessing):",
    );
    let selectedProductResult = false;
    context.toolResults.forEach((result) => {
      const data = result.data as { record?: unknown; body?: unknown } | null;
      const product = productForPrompt(data?.record) || productForPrompt(data?.body);
      if (product) {
        selectedProductResult = true;
        lines.push(`- ${result.key}: one product just selected: ${JSON.stringify(product)}`);
        return;
      }
      lines.push(`- ${result.key}: ${JSON.stringify(result.data)}`);
    });
    if (selectedProductResult) {
      lines.push(
        "- This result is the one product the customer just picked. Do not send the product catalog again.",
        "- Do not use messageType list for other products. Do not invent a second product.",
        "- Reply only about this product. Use its name, price, currency, description, brand, rating, dimensions, images, and variants.",
        "- Colors, sizes, and options are in variants. If variants are present, answer from them.",
        "- If a ground rule asks for a carousel, put these image URLs in cards. If it asks for buttons, send those buttons.",
      );
    } else {
      lines.push(
        "- If a tool result has body.items, those are the customer's live records. Answer only from those items.",
        "- Name and price belong in the reply. body.count is the full total; items is only the first page. Do not invent the rest.",
        "- Each list row id must be that item's id. Keep the product's real name words in the row title.",
        "- If a result has an https image URL, send it only when a ground rule asks for the picture. Use messageType image and put that exact URL in imageUrl. Do not paste the URL as text, and do not invent one.",
      );
    }
  }

  if (context.selectedProduct && Object.keys(context.selectedProduct).length) {
    lines.push(
      "",
      "Selected product from the previous step. Use only these values:",
      JSON.stringify(context.selectedProduct),
    );
  }

  const interactive = config.voice.interactiveReplies !== false;
  
  lines.push(
    "",
    "Reply with one JSON object and nothing else. Copy one shape below exactly. Do not rename keys. Do not add label, url, or extra fields. Never describe a carousel or buttons in prose.",
    interactive
      ? [
          '{"messageType":"text","text":""}',
          '{"messageType":"button","text":"","buttons":[{"id":"","title":""}]}',
          '{"messageType":"list","text":"","listButton":"","sections":[{"title":"","rows":[{"id":"","title":"","description":""}]}]}',
          '{"messageType":"image","text":"","imageUrl":""}',
          '{"messageType":"carousel","text":"","cards":[{"imageUrl":"","text":""}]}',
        ].join("\n")
      : '{"messageType":"text","text":""}',
    "Formatting:",
    "- text is the WhatsApp body. Inside the JSON string, write \\n between lines. Do not send prices, plans, features, or steps as one paragraph.",
    "- A short answer can be two lines, for example: Here is what is included.\\nAsk if you want the next step.",
  );

  if (!interactive) {
    lines.push(
      "- messageType must be text. Do not send buttons, lists, links, or carousels.",
    );
    return lines.filter((line) => line !== undefined).join("\n");
  }

  lines.push(
    "Priority, in this order. A later step never overrides an earlier one:",
    "1. Ground rules. If one applies, it chooses the message type. A rule that says to send buttons after one product is picked means messageType button. Do not send that product back as a list.",
    "2. The connected action result. One product is not a catalog. Do not ask the customer to select it again.",
    "3. WhatsApp shape. Use only the JSON shapes above.",
    "4. If no ground rule applies, and the tool result is a list of products, plans, or services, send a list. Do not hide those choices in one paragraph.",
    `- 1 to ${LIMITS.button.max} short choices: messageType button. Each title is at most ${LIMITS.button.title} characters.`,
    `- More than ${LIMITS.button.max} choices, or any choice that needs a price or detail: messageType list. Row title is the name only. Put the price or detail in description.`,
    '- Example: {"messageType":"list","text":"Here are the plans.\\nTap View plans.","listButton":"View plans","sections":[{"title":"Plans","rows":[{"id":"free","title":"Free Forever","description":"₹0/month · 1 account"},{"id":"pro","title":"Professional","description":"₹999/month · 3 accounts"}]}]}',
    "WhatsApp rules you must follow, or the message is rejected:",
    `- text is required and at most ${LIMITS.body} characters.`,
    `- header at most ${LIMITS.headerText} characters. footer at most ${LIMITS.footer} characters.`,
    `- button: 1 to ${LIMITS.button.max} choices. Each title at most ${LIMITS.button.title} characters. Ids unique.`,
    `- list: at most ${LIMITS.list.maxRows} rows, section title ${LIMITS.list.sectionTitle}, row title ${LIMITS.list.rowTitle}, description ${LIMITS.list.rowDescription}, menu label ${LIMITS.list.button}.`,
    `- cta_url: one https link that already appears in the business website or retrieved knowledge. Label at most ${LIMITS.carousel.displayText} characters. Never invent a URL.`,
    `- One photo: messageType image and imageUrl. Never use carousel for a single image. Carousel is rejected unless it has ${LIMITS.carousel.minCards} to 4 cards.`,
    `- Two or more photos: messageType carousel. One card per https image already in the tool result. Each card is exactly {"imageUrl":"...","text":"..."}. Card text at most ${LIMITS.carousel.cardBody} characters. Do not invent a link.`,
    "- Do not mix buttons with a link button. Do not repeat titles or ids.",
    "- Use messageType text only when there is nothing to choose.",
  );

  return lines.filter((line) => line !== undefined).join("\n");
};
