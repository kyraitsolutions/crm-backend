type TBuildMessageSearchTextPayload = {
  body?: {
    text?: string;
  };

  interactive?: any;

  template?: {
    name?: string;
    language?: string;
    components?: any[];
  };

  question?: {
    text?: string;
  };

  media?: {
    image?: {
      caption?: string;
    };

    video?: {
      caption?: string;
    };

    document?: {
      caption?: string;
    };
  };
};

export const buildMessageSearchText = (
  payload: TBuildMessageSearchTextPayload,
) => {
  const texts: string[] = [];

  if (payload?.body?.text) {
    texts.push(payload.body.text);
  }

  if (payload?.question?.text) {
    texts.push(payload.question.text);
  }

  if (payload?.media?.image?.caption) {
    texts.push(payload.media.image.caption);
  }

  if (payload?.media?.video?.caption) {
    texts.push(payload.media.video.caption);
  }

  if (payload?.media?.document?.caption) {
    texts.push(payload.media.document.caption);
  }

  const interactive = payload?.interactive;

  if (interactive?.header?.text) {
    texts.push(interactive.header.text);
  }

  if (interactive?.body?.text) {
    texts.push(interactive.body.text);
  }

  if (interactive?.footer?.text) {
    texts.push(interactive.footer.text);
  }

  // buttons
  if (Array.isArray(interactive?.action?.buttons)) {
    interactive.action.buttons.forEach((button: any) => {
      if (button?.reply?.title) {
        texts.push(button.reply.title);
      }
    });
  }

  // sections
  if (Array.isArray(interactive?.action?.sections)) {
    interactive.action.sections.forEach((section: any) => {
      if (section?.title) {
        texts.push(section.title);
      }

      if (Array.isArray(section?.rows)) {
        section.rows.forEach((row: any) => {
          if (row?.title) {
            texts.push(row.title);
          }

          if (row?.description) {
            texts.push(row.description);
          }
        });
      }
    });
  }

  if (payload?.template?.name) {
    texts.push(payload.template.name);
  }

  if (Array.isArray(payload?.template?.components)) {
    payload.template.components.forEach((component: any) => {
      if (component?.text) {
        texts.push(component.text);
      }
    });
  }

  return texts
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};
