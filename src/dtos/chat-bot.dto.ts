// ----------- ChatBot List DTO -----------
import { TCreateChatBot } from "../types";

export class CreateChatBotDto {
  name: string;

  // Chatbot settings
  welcomeMessage: string;
  fallbackMessage: string;
  showWelcomeMessage: boolean;
  thankyouMessage: string;
  waitingMessage: string;
  enableTypingIndicator: boolean;
  enableWidgetMessage: boolean;

  widgetMessageOnline: {
    content: string;
    subHeading: string;
  };

  widgetMessageOffline: {
    content: string;
    subHeading: string;
  };

  widgetPosition: "left-bottom" | "right-bottom";
  language: "english" | "hindi";
  enableRantingAndFeedback: boolean;

  ratingAndFeedback: {
    rating: number;
    feedback?: string;
  };

  chat_transcript: boolean;
  enableVoiceNote: boolean;
  responseInterval: 0 | 1 | 2;
  theme?: Record<string, any>;

  constructor(data: TCreateChatBot) {
    // Basic chatbot info
    this.name = data.name; 

    this.welcomeMessage =
      data. ?? "Hello! How can I help you today?";
    this.fallbackMessage =
      data.fallbackMessage ??
      "I apologize, but I didn't understand that. Could you please rephrase your question?";
    this.showWelcomeMessage =
      data.showWelcomeMessage ?? true;
    this.thankyouMessage =
      data.thankyouMessage ??
      "It's been a pleasure chatting with you today, Please take a moment to drop us your rating";
    this.waitingMessage =
      data.waitingMessage ??
      "Please wait while we connect you to our support representative";
    this.enableTypingIndicator =
      data.enableTypingIndicator ?? true;
    this.enableWidgetMessage =
      data.enableWidgetMessage ?? true;

    this.widgetMessageOnline = {
      content: data.widgetMessageOnline?.content ?? "Hey there!",
      subHeading:
        data.widgetMessageOnline?.subHeading ?? "How can we help you?",
    };

    this.widgetMessageOffline = {
      content: data.widgetMessageOffline?.content ?? "We're offline",
      subHeading:
        data.widgetMessageOffline?.subHeading ?? "Leave a message",
    };

    this.widgetPosition = data.widgetPosition ?? "right-bottom";
    this.language = data.language ?? "english";
    this.enableRantingAndFeedback =
      data.enableRantingAndFeedback ?? true;

    this.ratingAndFeedback = {
      rating: data.ratingAndFeedback?.rating ?? 5,
      feedback: data.ratingAndFeedback?.feedback ?? "",
    };

    this.chat_transcript = data.chat_transcript ?? true;
    this.enableVoiceNote = data.enableVoiceNote ?? false;
    this.responseInterval = data.responseInterval ?? 0;
    this.theme = data.theme ?? {};
  }
}


// export class ChatBotListDto {
//   id: string;
//   name: string;
//   userId: string;
//   accountId?: string;
//   createdAt: Date;
//   updatedAt: Date;

//   constructor(data: any) {
//     this.id = data._id;
//     this.name = data.name;
//     this.userId = data.userId;
//     this.accountId = data.accountId;
//     this.createdAt = data.createdAt;
//     this.updatedAt = data.updatedAt;
//   }
// }

// // ----------- ChatBot Detail DTO -----------
// export class ChatBotDetailDto {
//   id: string;
//   name: string;
//   userId: string;
//   accountId?: string;
//   createdAt: Date;
//   updatedAt: Date;

//   description?: string;

//   knowledgeSources: {
//     _id: string;
//     source: string;
//     type: "file" | "text" | "website";
//     data: string;
//     name: string;
//   }[];

//   suggestedQuestions: string[];

//   conversationdata?: {
//     model: string;
//     temperature: number;
//     prompt: string;
//     showWelcomeMessage: boolean;
//     welcomeMessage: string;
//     fallbackMessage: string;
//     enableTypingIndicator: boolean;
//     collectUserInfo: boolean;
//     theme?: Record<string, any>;
//   };

//   constructor(data: any) {
//     this.id = data._id;
//     this.name = data.name;
//     this.userId = data.userId;
//     this.accountId = data.accountId;
//     this.createdAt = data.createdAt;
//     this.updatedAt = data.updatedAt;
//     this.description = data.description ?? "";

//     this.knowledgeSources = (data.knowledgeSources || []).map((src: any) => ({
//       _id: src._id,
//       source: src.source,
//       type: src.type,
//       data: src.data,
//       name: src.name,
//     }));

//     this.suggestedQuestions = (data.suggestedQuestions || []).map(
//       (q: any) => q.question
//     );

//     if (data.conversationdata) {
//       this.conversationdata = {
//         model: data.conversationdata.model ?? "gemini-pro",
//         temperature: data.conversationdata.temperature ?? 0.7,
//         prompt: data.conversationdata.prompt ?? "",
//         showWelcomeMessage:
//           data.conversationdata.showWelcomeMessage ?? true,
//         welcomeMessage:
//           data.conversationdata.welcomeMessage ??
//           "Hello! How can I help you today?",
//         fallbackMessage:
//           data.conversationdata.fallbackMessage ??
//           "I apologize, but I didn’t understand that.",
//         enableTypingIndicator:
//           data.conversationdata.enableTypingIndicator ?? true,
//         collectUserInfo: data.conversationdata.collectUserInfo ?? true,
//         theme: data.conversationdata.theme ?? {},
//       };
//     }
//   }
// }

// // ----------- Create ChatBot DTO -----------
// export class CreateChatBotDto {
//   name: string;
//   description?: string;

//   knowledgeSources: {
//     source: string;
//     type: "file" | "text" | "website";
//     data: string;
//     name: string;
//   }[];

//   suggestedQuestions?: string[];

//   conversationdata?: {
//     model: string;
//     temperature: number;
//     prompt: string;
//     showWelcomeMessage: boolean;
//     welcomeMessage: string;
//     fallbackMessage: string;
//     enableTypingIndicator: boolean;
//     collectUserInfo: boolean;
//     theme?: Record<string, any>;
//   };

//   constructor(data: TCreateChatBot) {
//     this.name = data.name;
//     this.description = data.description ?? "";

//     this.knowledgeSources = Array.isArray(data.knowledgeSources) && data.knowledgeSources.length
//       ? data.knowledgeSources.map((src: any) => ({
//           source: src.source || "",
//           type: src.type || "text",
//           data: src.data || "",
//           name: src.name || "",
//         }))
//       : [];

//     this.suggestedQuestions = data.suggestedQuestions ?? [];

//     this.conversationdata = {
//       model: data.conversation?.model ?? "gemini-pro",
//       temperature: Number(data.conversation?.temperature ?? 0.7),
//       prompt: data.conversation?.prompt ?? "",
//       showWelcomeMessage: data.conversation?.showWelcomeMessage ?? true,
//       welcomeMessage:
//         data.conversation?.welcomeMessage ??
//         "Hello! How can I help you today?",
//       fallbackMessage:
//         data.conversation?.fallbackMessage ??
//         "I apologize, but I didn’t understand that.",
//       enableTypingIndicator: data.conversation?.enableTypingIndicator ?? true,
//       collectUserInfo: data.conversation?.collectUserInfo ?? true,
//       theme: data.conversation?.theme ?? {},
//     };
//   }
// }
