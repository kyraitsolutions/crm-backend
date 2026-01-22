import {
  TChatbotEdge,
  TChatbotNode,
  TCreateChatBot,
  TCreateChatBotFlow,
} from "../types";

// create chatbot dto
export class CreateChatBotDto {
  name: string;
  description: string;
  status: boolean;
  config: {
    enableWidgetMessage: boolean;
    language: "english" | "hindi";
    enableRantingAndFeedback: boolean;
    ratingAndFeedback: {
      rating: number;
      feedback: string;
    };
    chat_transcript: boolean;
    enableVoiceNote: boolean;
    responseInterval: 0 | 1 | 2;
    initiateChatbot: "immediate" | "action";
    showBranding: boolean;
    autoOpenAfterSeconds: number | null;
    brandLabelText: string;
    enableBrandLabel: boolean;
    showTypingIndicator: boolean;
  };
  theme: {
    brandColor: string;
    contrastColor: string;
    backgroundColor: string;
    messageColor: string;
    userMessageColor: string;
    typeface: string;
    fontSize: number;
    fontWeight: string;
    avatarStyle: string;
    avatarUrl?: string;
    showAvatar: boolean;
    roundedCorners: boolean;
    borderWidth: number;
    borderColor: string;
    widgetPosition: string;
    showLauncher: boolean;
    launcherLabel: string;
    launcherSize: number;
    messageAlignment: string;
    showTimestamps: boolean;
    animationStyle: string;
    shadowIntensity: number;
    opacity: number;
    customCSS: string;
  };
  conversation: {
    welcomeMessage: string;
    fallbackMessage: string;
    showWelcomeMessage: boolean;
    thankyouMessage: string;
    waitingMessage: string;
  };

  constructor(data: TCreateChatBot) {
    this.name = data.name;
    this.description = data.description;
    this.status = data.status;
    this.config = {
      showTypingIndicator: data.config?.showTypingIndicator ?? true,
      enableWidgetMessage: data.config?.enableWidgetMessage ?? true,
      language: data.config?.language ?? "english",
      enableRantingAndFeedback: data.config?.enableRantingAndFeedback ?? true,
      ratingAndFeedback: {
        rating: data.config?.ratingAndFeedback?.rating ?? 0,
        feedback: data.config?.ratingAndFeedback?.feedback ?? "",
      },
      chat_transcript: data.config?.chat_transcript ?? true,
      enableVoiceNote: data.config?.enableVoiceNote ?? false,
      responseInterval: (data.config?.responseInterval as any) ?? 0,
      initiateChatbot: data.config?.initiateChatbot || "immediate",
      showBranding: data.config?.showBranding ?? true,
      autoOpenAfterSeconds: data.config?.autoOpenAfterSeconds ?? null,
      brandLabelText: data.config?.brandLabelText ?? "",
      enableBrandLabel: data.config?.enableBrandLabel ?? true,
    };
    this.theme = {
      brandColor: data.theme?.brandColor ?? "#3b5d50",
      contrastColor: data.theme?.contrastColor ?? "#fefefe",
      backgroundColor: data.theme?.backgroundColor ?? "#ffffff",
      messageColor: data.theme?.messageColor ?? "#f1f5f9",
      userMessageColor: data.theme?.userMessageColor ?? "#3b5d50",
      typeface: data.theme?.typeface ?? "Inter",
      fontSize: data.theme?.fontSize ?? 14,
      fontWeight: data.theme?.fontWeight ?? "normal",
      avatarStyle: data.theme?.avatarStyle ?? "bubble",
      avatarUrl: data.theme?.avatarUrl ?? "",
      showAvatar: data.theme?.showAvatar ?? true,
      roundedCorners: data.theme?.roundedCorners ?? true,
      borderWidth: data.theme?.borderWidth ?? 1,
      borderColor: data.theme?.borderColor ?? "#e2e8f0",
      widgetPosition: data.theme?.widgetPosition ?? "bottom-right",
      showLauncher: data.theme?.showLauncher ?? true,
      launcherLabel: data.theme?.launcherLabel ?? "",
      launcherSize: data.theme?.launcherSize ?? 56,
      messageAlignment: data.theme?.messageAlignment ?? "left",
      showTimestamps: data.theme?.showTimestamps ?? true,
      animationStyle: data.theme?.animationStyle ?? "slide",
      shadowIntensity: data.theme?.shadowIntensity ?? 20,
      opacity: data.theme?.opacity ?? 100,
      customCSS: data.theme?.customCSS ?? "",
    };
    this.conversation = {
      welcomeMessage:
        data.conversation?.welcomeMessage ?? "Hello! How can I help you today?",
      fallbackMessage:
        data.conversation?.fallbackMessage ??
        "I apologize, but I didn't understand that. Could you please rephrase your question?",
      showWelcomeMessage: data.conversation?.showWelcomeMessage ?? true,
      thankyouMessage:
        data.conversation?.thankyouMessage ??
        "It's been a pleasure chatting with you today, Please take a moment to drop us your rating",
      waitingMessage:
        data.conversation?.waitingMessage ??
        "Please wait while we connect you to our support representative",
    };
  }
}

// create chatbot flow dto
export class CreateChatBotFlowDto {
  accountId: string;
  chatbotId: string;
  nodes: TChatbotNode[];
  edges: TChatbotEdge[];

  constructor(data: TCreateChatBotFlow) {
    this.accountId = data.accountId;
    this.chatbotId = data.chatbotId;

    // Nodes
    this.nodes = (data.nodes ?? []).map((node) => ({
      id: node.id,
      type: node.type ?? "chat",
      position: {
        x: node.position?.x ?? 0,
        y: node.position?.y ?? 0,
      },
      width: node.width ?? 250,
      height: node.height ?? 100,
      selected: node.selected ?? false,
      dragging: node.dragging ?? false,
      data: {
        label: node.data?.label ?? "",
        value: node.data?.value ?? "",
        elements: (node.data?.elements ?? []).map((el) => ({
          id: el.id,
          type: el.type ?? "text",
          content: el.content ?? "",
          date: el.date ?? new Date().toISOString(),
        })),
      },
    }));

    // Edges
    this.edges = (data.edges ?? []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.animated ?? false,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    }));
  }
}

// response chatbot dto
export class ResponseChatBotDto {
  id: string;
  name: string;
  description: string;
  status: boolean;
  config: {
    enableWidgetMessage: boolean;
    language: "english" | "hindi";
    enableRantingAndFeedback: boolean;
    ratingAndFeedback: {
      rating: number;
      feedback: string;
    };
    chat_transcript: boolean;
    enableVoiceNote: boolean;
    responseInterval: 0 | 1 | 2;
    initiateChatbot: "immediate" | "action";
    showBranding: boolean;
    autoOpenAfterSeconds: number | null;
    brandLabelText: string;
    enableBrandLabel: boolean;
    showTypingIndicator: boolean;
  };

  theme: {
    brandColor: string;
    contrastColor: string;
    backgroundColor: string;
    messageColor: string;
    userMessageColor: string;
    typeface: string;
    fontSize: number;
    fontWeight: string;
    avatarStyle: string;
    avatarUrl?: string;
    showAvatar?: boolean;
    roundedCorners?: boolean;
    borderWidth?: number;
    borderColor?: string;
    widgetPosition?: string;
    showLauncher?: boolean;
    launcherLabel?: string;
    launcherSize?: number;
    messageAlignment?: string;
    showTimestamps?: boolean;
    animationStyle?: string;
    shadowIntensity?: number;
    opacity?: number;
    customCSS?: string;
  };
  conversation: {
    welcomeMessage: string;
    fallbackMessage: string;
    showWelcomeMessage: boolean;
    thankyouMessage: string;
    waitingMessage: string;
  };

  constructor(data: any) {
    this.id = data._id;
    this.name = data.name;
    this.description = data.description;
    this.status = data.status;
    this.config = {
      showTypingIndicator: data.config?.showTypingIndicator ?? true,
      enableWidgetMessage: data.config?.enableWidgetMessage ?? true,
      language: data.config?.language ?? "english",
      enableRantingAndFeedback: data.config?.enableRantingAndFeedback ?? true,
      ratingAndFeedback: {
        rating: data.config?.ratingAndFeedback?.rating ?? 0,
        feedback: data.config?.ratingAndFeedback?.feedback ?? "",
      },
      chat_transcript: data.config?.chat_transcript ?? true,
      enableVoiceNote: data.config?.enableVoiceNote ?? false,
      responseInterval: (data.config?.responseInterval as any) ?? 0,
      initiateChatbot: data.config?.initiateChatbot || "immediate",
      showBranding: data.config?.showBranding ?? true,
      autoOpenAfterSeconds: data.config?.autoOpenAfterSeconds ?? null,
      brandLabelText: data.config?.brandLabelText ?? "",
      enableBrandLabel: data.config?.enableBrandLabel ?? true,
    };
    this.theme = {
      brandColor: data.theme?.brandColor ?? "#3b5d50",
      contrastColor: data.theme?.contrastColor ?? "#fefefe",
      backgroundColor: data.theme?.backgroundColor ?? "#ffffff",
      messageColor: data.theme?.messageColor ?? "#f1f5f9",
      userMessageColor: data.theme?.userMessageColor ?? "#3b5d50",
      typeface: data.theme?.typeface ?? "Inter",
      fontSize: data.theme?.fontSize ?? 14,
      fontWeight: data.theme?.fontWeight ?? "normal",
      avatarStyle: data.theme?.avatarStyle ?? "bubble",
      avatarUrl: data.theme?.avatarUrl ?? "",
      showAvatar: data.theme?.showAvatar ?? true,
      roundedCorners: data.theme?.roundedCorners ?? true,
      borderWidth: data.theme?.borderWidth ?? 1,
      borderColor: data.theme?.borderColor ?? "#e2e8f0",
      widgetPosition: data.theme?.widgetPosition ?? "bottom-right",
      showLauncher: data.theme?.showLauncher ?? true,
      launcherLabel: data.theme?.launcherLabel ?? "",
      launcherSize: data.theme?.launcherSize ?? 56,
      messageAlignment: data.theme?.messageAlignment ?? "left",
      showTimestamps: data.theme?.showTimestamps ?? true,
      animationStyle: data.theme?.animationStyle ?? "slide",
      shadowIntensity: data.theme?.shadowIntensity ?? 20,
      opacity: data.theme?.opacity ?? 100,
      customCSS: data.theme?.customCSS ?? "",
    };
    this.conversation = {
      welcomeMessage: data.conversation?.welcomeMessage,
      fallbackMessage: data.conversation?.fallbackMessage,
      showWelcomeMessage: data.conversation?.showWelcomeMessage,
      thankyouMessage: data.conversation?.thankyouMessage,
      waitingMessage: data.conversation?.waitingMessage,
    };
  }
}

// response chatbot flow dto
export class ResponseChatBotFlowDto {
  id: string;
  nodes: TChatbotNode[];
  edges: TChatbotEdge[];
  update?: boolean;
  docs?: ResponseChatBotFlowDto;

  constructor(data: any) {
    this.id = data.id;
    this.update = data.update;
    // Nodes
    this.nodes = (data.nodes ?? []).map((node: TChatbotNode) => ({
      id: node.id,
      type: node.type ?? "chat",
      position: {
        x: node.position?.x ?? 0,
        y: node.position?.y ?? 0,
      },
      width: node.width ?? 250,
      height: node.height ?? 100,
      selected: node.selected ?? false,
      dragging: node.dragging ?? false,
      data: {
        label: node.data?.label ?? "",
        value: node.data?.value ?? "",
        elements: (node.data?.elements ?? []).map((el) => ({
          id: el.id,
          type: el.type ?? "text",
          content: el.content ?? "",
          choices: el.choices ?? [],
          date: el.date ?? new Date().toISOString(),
        })),
      },
    }));
    // Edges
    this.edges = (data.edges ?? []).map((edge: TChatbotEdge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: edge.animated ?? false,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
    }));
  }
}

export class ChatBotListDto {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  status: boolean;

  constructor(data: any) {
    this.id = data._id;
    this.name = data.name;
    this.description = data.description;
    this.createdAt = data.createdAt;
    this.status = data.status;
  }
}

// chatbot dto with flow
export class ChatbotWithFlowDto extends CreateChatBotDto {
  flow: {
    nodes: TChatbotNode[];
    edges: TChatbotEdge[];
  };

  constructor(data: any) {
    super(data);
    const flow = data.flow ?? {};
    this.flow = {
      nodes: (flow.nodes ?? []).map((node: TChatbotNode) => ({
        id: node.id,
        type: node.type ?? "chat",
        position: {
          x: node.position?.x ?? 0,
          y: node.position?.y ?? 0,
        },
        width: node.width ?? 250,
        height: node.height ?? 100,
        selected: node.selected ?? false,
        dragging: node.dragging ?? false,
        data: {
          label: node.data?.label ?? "",
          value: node.data?.value ?? "",
          elements: (node.data?.elements ?? []).map((el) => ({
            id: el.id,
            type: el.type ?? "text",
            content: el.content ?? "",
            choices: el.choices ?? [],
            date: el.date ?? new Date().toISOString(),
          })),
        },
      })),
      edges: (flow.edges ?? []).map((edge: TChatbotEdge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edge.animated ?? false,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
      })),
    };
  }
}
