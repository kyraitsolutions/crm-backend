export class ThemeDto {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  bubbleStyle?: "rounded" | "square";

  constructor(data: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    bubbleStyle?: "rounded" | "square";
  }) {
    this.primaryColor = data.primaryColor;
    this.backgroundColor = data.backgroundColor;
    this.textColor = data.textColor;
    this.bubbleStyle = data.bubbleStyle;
  }
}

export class KnowledgeSourceDto {
  sourceType: "file" | "text" | "website";
  name: string;
  description?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
  sourceUrl?: string;
  extractedText: string;
  language?: string;

  constructor(data: {
    sourceType: "file" | "text" | "website";
    name: string;
    description?: string;
    filePath?: string;
    mimeType?: string;
    fileSize?: number;
    sourceUrl?: string;
    extractedText: string;
    language?: string;
  }) {
    this.sourceType = data.sourceType;
    this.name = data.name;
    this.description = data.description;
    this.filePath = data.filePath;
    this.mimeType = data.mimeType;
    this.fileSize = data.fileSize;
    this.sourceUrl = data.sourceUrl;
    this.extractedText = data.extractedText;
    this.language = data.language;
  }
}

export class ConversationSettingDto {
  model: string;
  temperature?: number;
  systemPrompt: string;
  welcomeMessage?: string;
  fallbackMessage?: string;
  enableTypingIndicator?: boolean;
  collectUserInfo?: boolean;
  theme?: ThemeDto;

  constructor(data: {
    model: string;
    temperature?: number;
    systemPrompt: string;
    welcomeMessage?: string;
    fallbackMessage?: string;
    enableTypingIndicator?: boolean;
    collectUserInfo?: boolean;
    theme?: ThemeDto;
  }) {
    this.model = data.model;
    this.temperature = data.temperature;
    this.systemPrompt = data.systemPrompt;
    this.welcomeMessage = data.welcomeMessage;
    this.fallbackMessage = data.fallbackMessage;
    this.enableTypingIndicator = data.enableTypingIndicator;
    this.collectUserInfo = data.collectUserInfo;
    this.theme = data.theme ? new ThemeDto(data.theme) : undefined;
  }
}

export class SuggestedQuestionDto {
  question: string;

  constructor(data: { question: string }) {
    this.question = data.question;
  }
}

export class ChatbotDto {
  id: string;
  name: string;
  userId: string;
  accountId?: string;
  knowledgeSources?: KnowledgeSourceDto[];
  conversationSettings: ConversationSettingDto;
  suggestedQuestions?: SuggestedQuestionDto[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    userId: string;
    accountId?: string;
    knowledgeSources?: KnowledgeSourceDto[];
    conversationSettings: ConversationSettingDto;
    suggestedQuestions?: SuggestedQuestionDto[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.userId = data.userId;
    this.accountId = data.accountId;
    this.knowledgeSources = data.knowledgeSources?.map(
      (k) => new KnowledgeSourceDto(k)
    );
    this.conversationSettings = new ConversationSettingDto(
      data.conversationSettings
    );
    this.suggestedQuestions = data.suggestedQuestions?.map(
      (q) => new SuggestedQuestionDto(q)
    );
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class CreateChatbotDto {
  name: string;
  userId: string;
  accountId?: string;
  knowledgeSources?: KnowledgeSourceDto[];
  conversationSettings: ConversationSettingDto;
  suggestedQuestions?: SuggestedQuestionDto[];

  constructor(data: {
    name: string;
    userId: string;
    accountId?: string;
    knowledgeSources?: KnowledgeSourceDto[];
    conversationSettings: ConversationSettingDto;
    suggestedQuestions?: SuggestedQuestionDto[];
  }) {
    this.name = data.name;
    this.userId = data.userId;
    this.accountId = data.accountId;
    this.knowledgeSources = data.knowledgeSources?.map(
      (k) => new KnowledgeSourceDto(k)
    );
    this.conversationSettings = new ConversationSettingDto(
      data.conversationSettings
    );
    this.suggestedQuestions = data.suggestedQuestions?.map(
      (q) => new SuggestedQuestionDto(q)
    );
  }
}
