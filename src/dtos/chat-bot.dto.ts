import { TCreateChatBot } from "../types";

export class CreateChatBotDto {
  name: string;
  description:string
  config: {
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
    language: "english" | "hindi";
    enableRantingAndFeedback: boolean;
    ratingAndFeedback: {
      rating: number;
      feedback?: string;
    };
    chat_transcript: boolean;
    enableVoiceNote: boolean;
    responseInterval: 0 | 1 | 2;
    initiateChatbot: "immediate" | "action" | "";
    showBranding: boolean;
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

  constructor(data: TCreateChatBot) {
    this.name = data.name;
    this.description=data.description;
    this.config = {
      enableTypingIndicator: data.config?.enableTypingIndicator ?? true,
      enableWidgetMessage: data.config?.enableWidgetMessage ?? true,
      widgetMessageOnline: {
        content: data.config?.widgetMessageOnline?.content ?? "Hey there!",
        subHeading:
          data.config?.widgetMessageOnline?.subHeading ??
          "How can we help you?",
      },
      widgetMessageOffline: {
        content: data.config?.widgetMessageOffline?.content ?? "We're offline",
        subHeading:
          data.config?.widgetMessageOffline?.subHeading ?? "Leave a message",
      },
      language: data.config?.language ?? "english",
      enableRantingAndFeedback:
        data.config?.enableRantingAndFeedback ?? true,
      ratingAndFeedback: {
        rating: data.config?.ratingAndFeedback?.rating ?? 5,
        feedback: data.config?.ratingAndFeedback?.feedback ?? "",
      },
      chat_transcript: data.config?.chat_transcript ?? true,
      enableVoiceNote: data.config?.enableVoiceNote ?? false,
      responseInterval: data.config?.responseInterval ?? 0,
      initiateChatbot: data.config?.initiateChatbot ?? "immediate",
      showBranding: data.config?.showBranding ?? true,
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
        data.conversation?.welcomeMessage ??
        "Hello! How can I help you today?",
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
export class ResponseChatBotDto {
  id:string;
  name: string;
  description:string
  config: {
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
    language: "english" | "hindi";
    enableRantingAndFeedback: boolean;
    ratingAndFeedback: {
      rating: number;
      feedback?: string;
    };
    chat_transcript: boolean;
    enableVoiceNote: boolean;
    responseInterval: 0 | 1 | 2;
    initiateChatbot: "immediate" | "action" | "";
    showBranding: boolean;
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
    this.id=data._id;
    this.name = data.name;
    this.description=data.description;
    this.config = {
      enableTypingIndicator: data.config?.enableTypingIndicator ?? true,
      enableWidgetMessage: data.config?.enableWidgetMessage ?? true,
      widgetMessageOnline: {
        content: data.config?.widgetMessageOnline?.content ?? "Hey there!",
        subHeading:
          data.config?.widgetMessageOnline?.subHeading ??
          "How can we help you?",
      },
      widgetMessageOffline: {
        content: data.config?.widgetMessageOffline?.content ?? "We're offline",
        subHeading:
          data.config?.widgetMessageOffline?.subHeading ?? "Leave a message",
      },
      language: data.config?.language ?? "english",
      enableRantingAndFeedback:
        data.config?.enableRantingAndFeedback ?? true,
      ratingAndFeedback: {
        rating: data.config?.ratingAndFeedback?.rating ?? 5,
        feedback: data.config?.ratingAndFeedback?.feedback ?? "",
      },
      chat_transcript: data.config?.chat_transcript ?? true,
      enableVoiceNote: data.config?.enableVoiceNote ?? false,
      responseInterval: data.config?.responseInterval ?? 0,
      initiateChatbot: data.config?.initiateChatbot ?? "immediate",
      showBranding: data.config?.showBranding ?? true,
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
      welcomeMessage:data.conversation?.welcomeMessage,
      fallbackMessage:data.conversation?.fallbackMessage,
      showWelcomeMessage: data.conversation?.showWelcomeMessage,
      thankyouMessage:data.conversation?.thankyouMessage,
      waitingMessage:data.conversation?.waitingMessage,
    };
  }
}
