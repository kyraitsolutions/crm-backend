import { Schema, model } from "mongoose";

const chatbotSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: false },
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


const chatbotSettingSchema = new Schema({
  chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
  welcomeMessage: {
    type: String,
    default: "Hello! How can I help you today?",
  },
  fallbackMessage: {
    type: String,
    default:
      "I apologize, but I didn't understand that. Could you please rephrase your question?",
  },
  showWelcomeMessage: {
    type: Boolean,
    default: true,
  },
  thankyouMessage:{
    type: String,
    default:
      "It's been a pleasure chatting with you today, Please take a moment to drop us your rating",
  },
  waitingMessage:{
    type: String,
    default:
      "Please wait while we connect you to our support representative",
  },
  enableTypingIndicator: {
    type: Boolean,
    default: true,
  },
  enableWidgetMessage:{
    type: Boolean,
    default: true,
  },
  widgetMessageOnline:{
    content:{
      type:String,
      default:"Hey there!"
    },
    subHeading:{
      type:String,
      default:"How can we help you?"
    }
  },
  widgetMessageOffline:{
    content:{
      type:String,
      default:"We're offline"
    },
    subHeading:{
      type:String,
      default:"Leave a message"
    }
  },
  widgetPosition:{
    type: String, enum: ["left-bottom", "right-bottom"], default:"right-bottom"
  },
  language:{
    type:String, enum:["english","hindi"]
  },
  enableRantingAndFeedback:{
    type: Boolean,
    default: true,
  },
  ratingAndFeedback:{
    rating:{
      type:Number,
      emum:[1,2,3,4,5],
      default:5
    },
    feedback:{
      type:String,
    }
  },
  chat_transcript:{
    type:Boolean,
    default:true,
  },
  enableVoiceNote:{
    type:Boolean,
    default:false,
  },
  responseInterval:{
    type:Number,
    enum:[0,1,2],
    default:0
  },
  theme: {

  }
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
  });

// const chatbotKnowledgeSourceSchema = new Schema({
//   chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
//   source: { type: String, required: true },
//   type: { type: String, enum: ["file", "text", "website"], required: true },
//   data: { type: String, required: true },
//   name: { type: String, required: true },
// });

// const chatbotKnowledgeChunkSchema = new Schema({
//   chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
//   sourceId: {
//     type: Schema.Types.ObjectId,
//     ref: "ChatbotKnowledgeSource",
//     required: true,
//   },
//   text: { type: String, required: true },
//   embedding: { type: [Number], required: true },
// });

// const chatbotSuggestedQuestionSchema = new Schema({
//   chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true },
//   question: { type: String, required: true },
// });







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
        type: { type: String, enum: ["text", "image", "video", "audio"] },
        content: String,
        date: String,
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
    nodes: [chatbotNodesSchema],
    edges: [chatbotEdgesSchema],
  },
  { timestamps: true }
);

export const ChatbotFlowModel = model("ChatbotFlow", chatbotFlowSchema);

export const ChatbotModel = model("Chatbot", chatbotSchema);

// export const ChatbotKnowledgeSourceModel = model(
//   "ChatbotKnowledgeSource",
//   chatbotKnowledgeSourceSchema
// );
// export const ChatbotKnowledgeChunkModel = model(
//   "ChatbotKnowledgeChunk",
//   chatbotKnowledgeChunkSchema
// );
// export const ChatbotSuggestedQuestionModel = model(
//   "ChatbotSuggestedQuestion",
//   chatbotSuggestedQuestionSchema
// );
export const ChatbotSettingModel = model(
  "ChatbotConversationSetting",
  chatbotSettingSchema
);
