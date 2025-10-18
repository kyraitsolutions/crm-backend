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
    temperature:string;
    prompt:string;
    showWelcomeMessage?: boolean;
    welcomeMessage?: string;
    emailCapture?: boolean;
    phoneNumberCapture?: boolean;
    fallbackMessage?: string;
    enableTypingIndicator?:boolean;
    collectUserInfo:boolean;
    theme?: Record<string, any>;
  };

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
      temperature:data.conversation.temperature??"",
      prompt: data.conversation.promt ?? "",
      showWelcomeMessage: data.conversation?.showWelcomeMessage,
      welcomeMessage: data.conversation?.welcomeMessage,
      fallbackMessage: data.conversation?.fallbackMessage,
      enableTypingIndicator:data.conversation?.enableTypingIndicator,
      collectUserInfo:data.conversation.collectUserInfo,
      theme: data.conversation.theme ?? {},
    };
  }
}
