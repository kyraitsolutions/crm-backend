import { WHATSAPP_INTERACTIVE_LIMITS as LIMITS } from "../../../whatsapp/messages/constants/whatsapp-interactive.constant.js";
import { section } from "./prompt-utils.js";

export const whatsappPrompt = (interactive: boolean) => {
  if (!interactive) {
    return section("WhatsApp", [
      "Interactive replies are off. Use messageType text only.",
    ]);
  }
  return section("WhatsApp", [
    "Choose the shape from the customer's intent and the data you have. Do not send buttons or a list for a normal answer.",
    "If a skill or ground rule names buttons after a colon, those titles are the buttons. buttons: Buy, Price means Buy and Price.",
    "If that same instruction says a photo tap with more than one image is a carousel, send those real image URLs as cards and the buttons named in that sentence.",
    "Defaults when no skill or ground rule names a shape:",
    "- A normal answer: text.",
    "- Several records to choose from: list. Row title is the name. Price or detail goes in description.",
    `- 1 to ${LIMITS.button.max} short choices: button.`,
    "- One real photo: image. Two or more real photos: carousel. Never use a carousel for a single image.",
    "- A link only when that https URL is already in the business website, knowledge, or action result.",
    "Use real ids, names, prices, variants, and image URLs from the action result. Do not invent them.",
    "Limits. A reply outside these is rejected:",
    `- text at most ${LIMITS.body} characters. Use \\n between lines inside the JSON string.`,
    `- button: 1 to ${LIMITS.button.max}. Title at most ${LIMITS.button.title} characters. Ids unique. Prefer the record id plus the title, such as prod_001_price.`,
    `- list: at most ${LIMITS.list.maxRows} rows. Row title at most ${LIMITS.list.rowTitle}. Description at most ${LIMITS.list.rowDescription}. Menu label at most ${LIMITS.list.button}.`,
    `- carousel: ${LIMITS.carousel.minCards} to ${LIMITS.carousel.maxCards} cards. Card text at most ${LIMITS.carousel.cardBody}.`,
    `- link label at most ${LIMITS.carousel.displayText} characters.`,
  ]);
};
