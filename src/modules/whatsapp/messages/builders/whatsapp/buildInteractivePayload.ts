import { WHATSAPP_INTERACTIVE_LIMITS as LIMITS } from "../../constants/whatsapp-interactive.constant.js";

export class BuildInteractivePayload {
  static build(payload: any) {
    const interactive = payload?.interactive ?? payload;
    return {
      type: "interactive",
      interactive: this.shape(interactive),
    };
  }

  private static shape(interactive: any) {
    if (!interactive || typeof interactive !== "object") {
      throw new Error("Interactive payload is required.");
    }

    const type = String(interactive.type || "").trim();
    
    if (type === "button" && this.isCtaUrlAction(interactive.action)) {
      return this.shapeCtaUrl({ ...interactive, type: "cta_url" });
    }

    switch (type) {
      case "button":
        return this.shapeButton(interactive);
      case "list":
        return this.shapeList(interactive);
      case "carousel":
        return this.shapeCarousel(interactive);
      case "cta_url":
        return this.shapeCtaUrl(interactive);
      default:
        return this.shapeGeneric(interactive);
    }
  }

  private static shapeButton(interactive: any) {
    const buttons = (interactive.action?.buttons || [])
      .map((button: any) => this.shapeReplyButton(button))
      .filter(Boolean)
      .slice(0, LIMITS.button.max);

    if (!buttons.length) {
      throw new Error("WhatsApp buttons require at least 1 reply button.");
    }

    return this.omitEmpty({
      type: "button",
      header: this.shapeHeader(interactive.header),
      body: this.shapeBody(interactive.body?.text, LIMITS.body),
      footer: this.shapeFooter(interactive.footer),
      action: { buttons },
    });
  }

  private static shapeList(interactive: any) {
    const sections = [];
    let rowCount = 0;

    for (const section of interactive.action?.sections || []) {
      if (sections.length >= LIMITS.list.maxSections) break;
      if (rowCount >= LIMITS.list.maxRows) break;

      const remaining = LIMITS.list.maxRows - rowCount;
      const rows = (section.rows || [])
        .map((row: any) => this.shapeListRow(row))
        .filter(Boolean)
        .slice(0, remaining);

      if (!rows.length) continue;
      sections.push({
        ...(this.clip(section.title, LIMITS.list.sectionTitle)
          ? { title: this.clip(section.title, LIMITS.list.sectionTitle) }
          : {}),
        rows,
      });
      rowCount += rows.length;
    }

    if (!sections.length) {
      throw new Error("WhatsApp lists require at least 1 row.");
    }

    return this.omitEmpty({
      type: "list",
      header: this.shapeHeader(interactive.header),
      body: this.shapeBody(interactive.body?.text, LIMITS.body),
      footer: this.shapeFooter(interactive.footer),
      action: {
        button: this.clip(interactive.action?.button, LIMITS.list.button) || "Options",
        sections,
      },
    });
  }

  private static shapeCarousel(interactive: any) {
    const cards = (interactive.action?.cards || [])
      .map((card: any, index: number) => this.shapeCarouselCard(card, index))
      .filter(Boolean)
      .slice(0, LIMITS.carousel.maxCards);

    if (cards.length < LIMITS.carousel.minCards) {
      throw new Error("WhatsApp carousels require between 2 and 10 cards.");
    }

    return this.omitEmpty({
      type: "carousel",
      body: this.shapeBody(interactive.body?.text, LIMITS.body),
      action: { cards },
    });
  }

  private static shapeCarouselCard(card: any, index: number) {
    const header = this.shapeHeader(card?.header, { mediaOnly: true });
    if (!header) return null;

    const bodyText = this.clip(card?.body?.text, LIMITS.carousel.cardBody);
    const type = String(card?.type || card?.action?.name || "cta_url").trim();
    const action = this.shapeCarouselAction(card?.action);
    if (!action) return null;

    return this.omitEmpty({
      card_index: Number.isFinite(card?.card_index) ? Number(card.card_index) : index,
      type,
      header,
      ...(bodyText ? { body: { text: bodyText } } : {}),
      action,
    });
  }

  private static isCtaUrlAction(action: any) {
    return Boolean(
      action &&
        typeof action === "object" &&
        (action.name === "cta_url" ||
          action.parameters?.url ||
          action.parameters?.display_text),
    );
  }

  private static shapeCarouselAction(action: any) {
    if (!action || typeof action !== "object") return null;

    if (this.isCtaUrlAction(action)) {
      const displayText = this.clip(
        action.parameters?.display_text,
        LIMITS.carousel.displayText,
      );
      const url = String(action.parameters?.url || "").trim();
      if (!displayText || !url) return null;
      
      return {
        name: "cta_url",
        parameters: {
          display_text: displayText,
          url,
        },
      };
    }

    const buttons = (action.buttons || [])
      .map((button: any) => this.shapeReplyButton(button))
      .filter(Boolean)
      .slice(0, LIMITS.button.max);

    if (!buttons.length) return null;
    return { buttons };
  }

  private static shapeCtaUrl(interactive: any) {
    const displayText = this.clip(
      interactive.action?.parameters?.display_text,
      LIMITS.carousel.displayText,
    );
    const url = String(interactive.action?.parameters?.url || "").trim();
    if (!displayText || !url) {
      throw new Error("WhatsApp URL buttons require display text and a URL.");
    }

    return this.omitEmpty({
      type: "cta_url",
      header: this.shapeHeader(interactive.header),
      body: this.shapeBody(interactive.body?.text, LIMITS.body),
      footer: this.shapeFooter(interactive.footer),
      action: {
        name: "cta_url",
        parameters: { display_text: displayText, url },
      },
    });
  }

  private static shapeGeneric(interactive: any) {
    return this.omitEmpty({
      type: interactive.type,
      header: this.shapeHeader(interactive.header),
      body: this.shapeBody(interactive.body?.text, LIMITS.body),
      footer: this.shapeFooter(interactive.footer),
      action: interactive.action,
    });
  }

  private static shapeReplyButton(button: any) {
    const reply = button?.reply || button?.quick_reply || {};
    const id = this.clip(reply.id, LIMITS.button.id);
    const title = this.clip(reply.title, LIMITS.button.title);
    if (!id || !title) return null;
    return {
      type: "reply",
      reply: { id, title },
    };
  }

  private static shapeListRow(row: any) {
    const id = this.clip(row?.id, LIMITS.list.rowId);
    const title = this.clip(row?.title, LIMITS.list.rowTitle);
    if (!id || !title) return null;
    const description = this.clip(row?.description, LIMITS.list.rowDescription);
    return {
      id,
      title,
      ...(description ? { description } : {}),
    };
  }

  private static shapeHeader(header: any, options?: { mediaOnly?: boolean }) {
    if (!header || typeof header !== "object") return undefined;
    const type = String(header.type || "").trim();

    if (type === "text" && !options?.mediaOnly) {
      const text = this.clip(header.text, LIMITS.headerText);
      return text ? { type: "text", text } : undefined;
    }

    if (type === "image" && (header.image?.id || header.image?.link)) {
      return {
        type: "image",
        image: header.image.id
          ? { id: header.image.id }
          : { link: header.image.link },
      };
    }

    if (type === "video" && (header.video?.id || header.video?.link)) {
      return {
        type: "video",
        video: header.video.id
          ? { id: header.video.id }
          : { link: header.video.link },
      };
    }

    if (type === "document" && (header.document?.id || header.document?.link)) {
      return {
        type: "document",
        document: header.document.id
          ? { id: header.document.id }
          : { link: header.document.link },
      };
    }

    return undefined;
  }

  private static shapeBody(text: unknown, max: number) {
    const body = this.clip(text, max);
    return body ? { text: body } : undefined;
  }

  private static shapeFooter(footer: any) {
    const text = this.clip(footer?.text, LIMITS.footer);
    return text ? { text } : undefined;
  }

  private static clip(value: unknown, max: number) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.slice(0, max);
  }

  private static omitEmpty(value: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(value).filter(([, item]) => item !== undefined && item !== null),
    );
  }
}
