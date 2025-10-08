import { TCreateChatBot } from "../types";

export class CreateChatBotDto {
  name: string;
  description?: string;
  knowledgeBase: {
    url?: string;
    files?: string[];
    manual?: string;
    type?: number | null;
  };
  suggestions?: string[];
  conversation?: {
    showWelcomeMessage?: boolean;
    welcomeMessage?: string;
    emailCapture?: boolean;
    phoneNumberCapture?: boolean;
    fallbackMessage?: string;
  };
  theme?: Record<string, any>;

  constructor(data: TCreateChatBot) {
    this.name = data.name;
    this.description = data.description ?? "";
    this.knowledgeBase = {
      url: data.knowledgeBase?.url,
      files: data.knowledgeBase?.files,
      manual: data.knowledgeBase?.manual,
      type: data.knowledgeBase?.type ?? null,
    };
    this.suggestions = data.suggestions ?? [];
    this.conversation = {
      showWelcomeMessage: data.conversation?.showWelcomeMessage,
      welcomeMessage: data.conversation?.welcomeMessage,
      emailCapture: data.conversation?.emailCapture,
      phoneNumberCapture: data.conversation?.phoneNumberCapture,
      fallbackMessage: data.conversation?.fallbackMessage,
    };
    this.theme = data.theme ?? {};
  }
}
