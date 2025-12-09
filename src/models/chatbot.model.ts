import { Schema, model } from "mongoose";

const chatbotSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: false },
    status: { type: Boolean, default: true },
    config: {
      enableTypingIndicator: {
        type: Boolean,
        default: true,
      },
      enableWidgetMessage: {
        type: Boolean,
        default: true,
      },
      widgetMessageOnline: {
        content: {
          type: String,
          default: "Hey there!",
        },
        subHeading: {
          type: String,
          default: "How can we help you?",
        },
      },
      widgetMessageOffline: {
        content: {
          type: String,
          default: "We're offline",
        },
        subHeading: {
          type: String,
          default: "Leave a message",
        },
      },
      language: {
        type: String,
        enum: ["english", "hindi"],
      },
      enableRantingAndFeedback: {
        type: Boolean,
        default: true,
      },
      ratingAndFeedback: {
        rating: {
          type: Number,
          emum: [1, 2, 3, 4, 5],
          default: 5,
        },
        feedback: {
          type: String,
        },
      },
      chat_transcript: {
        type: Boolean,
        default: true,
      },
      enableVoiceNote: {
        type: Boolean,
        default: false,
      },
      responseInterval: {
        type: Number,
        enum: [0, 1, 2],
        default: 0,
      },
      initiateChatbot: {
        type: String,
        enum: ["immediate", "action", ""],
      },
      showBranding: {
        type: Boolean,
        default: true,
      },
    },
    theme: {
      brandColor: { type: String, required: true },
      contrastColor: { type: String, required: true },
      backgroundColor: { type: String, required: true },
      messageColor: { type: String, required: true },
      userMessageColor: { type: String, required: true },
      typeface: { type: String, required: true },
      fontSize: { type: Number, required: true },
      fontWeight: { type: String, required: true },
      avatarStyle: { type: String, required: true },
      avatarUrl: { type: String, default: "" },
      showAvatar: { type: Boolean, default: true },
      roundedCorners: { type: Boolean, default: true },
      borderWidth: { type: Number, default: 1 },
      borderColor: { type: String, default: "#e2e8f0" },
      widgetPosition: { type: String, default: "bottom-right" },
      showLauncher: { type: Boolean, default: true },
      launcherLabel: { type: String, default: "" },
      launcherSize: { type: Number, default: 56 },
      messageAlignment: { type: String, default: "left" },
      showTimestamps: { type: Boolean, default: true },
      animationStyle: { type: String, default: "slide" },
      shadowIntensity: { type: Number, default: 20 },
      opacity: { type: Number, default: 100 },
      customCSS: { type: String, default: "" },
    },
    conversation: {
      welcomeMessage: {
        type: String,
        default: "Hello! How can I help you today?",
      },
      fallbackMessage: {
        type: String,
        default:
          "I apologize, but I didn't understand that. Could you please rephrase your question?",
      },
      showWelcomeMessage: { type: Boolean, default: true },
      thankyouMessage: {
        type: String,
        default:
          "It's been a pleasure chatting with you today, Please take a moment to drop us your rating",
      },
      waitingMessage: {
        type: String,
        default:
          "Please wait while we connect you to our support representative",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

const chatbotNodesSchema = new Schema({
  id: String, // use UUID (from frontend)
  // chatbotId: ObjectId,          // ref → chatbots._id
  type: { type: String, enum: ["chat", "form"] },
  position: { x: Number, y: Number },
  width: Number,
  height: Number,
  selected: Boolean,
  dragging: Boolean,
  data: {
    label: String,
    value: String,
    elements: [
      {
        id: String,
        type: {
          type: String,
          enum: ["text", "image", "video", "audio", "option"],
        },
        content: String,
        date: String,

        // Option-specific fields
        choices: [String],
        title: String,
      },
    ],
  },
});

const chatbotEdgesSchema = new Schema({
  id: String,
  source: String,
  animated: Boolean,
  target: String,
  sourceHandle: { type: String, default: null },
  targetHandle: { type: String, default: null },
});

const chatbotFlowSchema = new Schema(
  {
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
    nodes: [chatbotNodesSchema],
    edges: [chatbotEdgesSchema],
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// index on this table
chatbotFlowSchema.index({ accountId: 1, chatbotId: 1 });

export const ChatbotFlowModel = model("ChatbotFlow", chatbotFlowSchema);

export const ChatbotModel = model("Chatbot", chatbotSchema);
