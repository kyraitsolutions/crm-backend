import { TCreateChatBot } from "../types";

// ----------- ChatBot List DTO -----------
export class ChatBotListDto {
  id: string;
  name: string;
  userId: string;
  accountId?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: any) {
    this.id = data._id;
    this.name = data.name;
    this.userId = data.userId;
    this.accountId = data.accountId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

// ----------- ChatBot Detail DTO -----------
export class ChatBotDetailDto {
  id: string;
  name: string;
  userId: string;
  accountId?: string;
  createdAt: Date;
  updatedAt: Date;

  description?: string;

  knowledgeSources: {
    _id: string;
    source: string;
    type: "file" | "text" | "website";
    data: string;
    name: string;
  }[];

  suggestedQuestions: string[];

  conversationSettings?: {
    model: string;
    temperature: number;
    prompt: string;
    showWelcomeMessage: boolean;
    welcomeMessage: string;
    fallbackMessage: string;
    enableTypingIndicator: boolean;
    collectUserInfo: boolean;
    theme?: Record<string, any>;
  };

  constructor(data: any) {
    this.id = data._id;
    this.name = data.name;
    this.userId = data.userId;
    this.accountId = data.accountId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.description = data.description ?? "";

    this.knowledgeSources = (data.knowledgeSources || []).map((src: any) => ({
      _id: src._id,
      source: src.source,
      type: src.type,
      data: src.data,
      name: src.name,
    }));

    this.suggestedQuestions = (data.suggestedQuestions || []).map(
      (q: any) => q.question
    );

    if (data.conversationSettings) {
      this.conversationSettings = {
        model: data.conversationSettings.model ?? "gemini-pro",
        temperature: data.conversationSettings.temperature ?? 0.7,
        prompt: data.conversationSettings.prompt ?? "",
        showWelcomeMessage:
          data.conversationSettings.showWelcomeMessage ?? true,
        welcomeMessage:
          data.conversationSettings.welcomeMessage ??
          "Hello! How can I help you today?",
        fallbackMessage:
          data.conversationSettings.fallbackMessage ??
          "I apologize, but I didn’t understand that.",
        enableTypingIndicator:
          data.conversationSettings.enableTypingIndicator ?? true,
        collectUserInfo: data.conversationSettings.collectUserInfo ?? true,
        theme: data.conversationSettings.theme ?? {},
      };
    }
  }
}

// ----------- Create ChatBot DTO -----------
export class CreateChatBotDto {
  name: string;
  description?: string;

  knowledgeSources: {
    source: string;
    type: "file" | "text" | "website";
    data: string;
    name: string;
  }[];

  suggestedQuestions?: string[];

  conversationSettings?: {
    model: string;
    temperature: number;
    prompt: string;
    showWelcomeMessage: boolean;
    welcomeMessage: string;
    fallbackMessage: string;
    enableTypingIndicator: boolean;
    collectUserInfo: boolean;
    theme?: Record<string, any>;
  };

  constructor(data: TCreateChatBot) {
    this.name = data.name;
    this.description = data.description ?? "";

    this.knowledgeSources = Array.isArray(data.knowledgeSources) && data.knowledgeSources.length
      ? data.knowledgeSources.map((src: any) => ({
          source: src.source || "",
          type: src.type || "text",
          data: src.data || "",
          name: src.name || "",
        }))
      : [];

    this.suggestedQuestions = data.suggestedQuestions ?? [];

    this.conversationSettings = {
      model: data.conversation?.model ?? "gemini-pro",
      temperature: Number(data.conversation?.temperature ?? 0.7),
      prompt: data.conversation?.prompt ?? "",
      showWelcomeMessage: data.conversation?.showWelcomeMessage ?? true,
      welcomeMessage:
        data.conversation?.welcomeMessage ??
        "Hello! How can I help you today?",
      fallbackMessage:
        data.conversation?.fallbackMessage ??
        "I apologize, but I didn’t understand that.",
      enableTypingIndicator: data.conversation?.enableTypingIndicator ?? true,
      collectUserInfo: data.conversation?.collectUserInfo ?? true,
      theme: data.conversation?.theme ?? {},
    };
  }
}
