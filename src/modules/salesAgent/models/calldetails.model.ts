import mongoose, { Document, Schema, Types } from "mongoose";

export type CallDirection = "inbound" | "outbound";

export type CallStatus =
    | "queued"
    | "initiated"
    | "ringing"
    | "in-progress"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer"
    | "canceled";

export type CallOutcome =
    | "booked"
    | "transferred"
    | "resolved"
    | "missed"
    | "voicemail"
    | "spam"
    | "support"
    | "sales"
    | "unknown";

export interface ICallRecording extends Document{
    accountId:Types.ObjectId;
    callSid:string;
    recordingSid:string;
    recordingUrl:string;
    duration:number;
    channels:number;
    status:string;
    source:string;
}
export interface ICall extends Document {
    // Multi Tenant
    accountId: Types.ObjectId;

    // CRM Relations
    leadId?: Types.ObjectId;
    contactId?: Types.ObjectId;
    assignedUserId?: Types.ObjectId;

    // Twilio
    callSid: string;
    parentCallSid?: string;

    // Phone Numbers
    from: string;
    to: string;
    caller?: string;
    called?: string;
    callerName?: string;

    // Call Info
    direction: CallDirection;
    status: CallStatus;
    outcome?: CallOutcome;

    // Timing
    initiatedAt?: Date;
    ringingAt?: Date;
    answeredAt?: Date;
    endedAt?: Date;

    duration?: number;
    talkTime?: number;
    ringDuration?: number;
    holdDuration?: number;
    // AI
    aiHandled: boolean;
    transferred: boolean;
    transferredTo?: string;

    transcript?: string;
    summary?: string;

    intent?: string;
    sentiment?: "positive" | "neutral" | "negative";

    modelName?: string;
    language?: string;

    // Cost
    price?: number;
    currency?: string;

    // Network
    sipResponseCode?: number;
    answeredBy?: string;

    // Geo
    callerCountry?: string;
    callerState?: string;
    callerCity?: string;
    callerZip?: string;

    calledCountry?: string;
    calledState?: string;
    calledCity?: string;
    calledZip?: string;

    // Misc
    tags: string[];
    notes?: string;

    metadata?: Record<string, any>;

    createdAt: Date;
    updatedAt: Date;
}


const callRecordingSchema=new Schema<ICallRecording>(
    {
        accountId:{type:Schema.Types.ObjectId,ref:"Account",required:true,index:true},
        callSid:{type:String,required:true,index:true},
        recordingSid: { type: String, required: true, unique: true },
        recordingUrl: String,
        duration: Number,
        channels: Number,
        status: String,
        source: String,
    },{
        timestamps: true,
    }
)

const callSchema = new Schema<ICall>(
    {
        // Multi Tenant
        accountId: {
            type: Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            index: true,
        },

        // CRM Relations
        leadId: {
            type: Schema.Types.ObjectId,
            ref: "Lead",
            default: null,
        },

        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            default: null,
        },

        assignedUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Twilio
        callSid: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        parentCallSid: {
            type: String,
            default: null,
        },

        // Phone Numbers
        from: {
            type: String,
            required: true,
            index: true,
        },

        to: {
            type: String,
            required: true,
            index: true,
        },

        caller: {
            type: String,
            default: null,
        },

        called: {
            type: String,
            default: null,
        },

        callerName: {
            type: String,
            default: null,
        },

        // Call Info
        direction: {
            type: String,
            enum: ["inbound", "outbound"],
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: [
                "queued",
                "initiated",
                "ringing",
                "in-progress",
                "completed",
                "busy",
                "failed",
                "no-answer",
                "canceled",
            ],
            default: "queued",
            index: true,
        },

        outcome: {
            type: String,
            enum: [
                "booked",
                "transferred",
                "resolved",
                "missed",
                "voicemail",
                "spam",
                "support",
                "sales",
                "unknown",
            ],
            default: "unknown",
        },

        // Timing
        initiatedAt: Date,
        ringingAt: Date,
        answeredAt: Date,
        endedAt: Date,

        duration: {
            type: Number,
            default: 0,
        },

        talkTime: {
            type: Number,
            default: 0,
        },

        ringDuration: {
            type: Number,
            default: 0,
        },

        holdDuration: {
            type: Number,
            default: 0,
        },
        // AI
        aiHandled: {
            type: Boolean,
            default: false,
        },

        transferred: {
            type: Boolean,
            default: false,
        },

        transferredTo: String,

        transcript: String,

        summary: String,

        intent: String,

        sentiment: {
            type: String,
            enum: ["positive", "neutral", "negative"],
            default: "neutral",
        },

        modelName: String,

        language: {
            type: String,
            default: "en-IN",
        },

        // Cost
        price: Number,

        currency: {
            type: String,
            default: "USD",
        },

        // Network
        sipResponseCode: Number,

        answeredBy: String,

        // Geo
        callerCountry: String,
        callerState: String,
        callerCity: String,
        callerZip: String,

        calledCountry: String,
        calledState: String,
        calledCity: String,
        calledZip: String,

        // Misc
        tags: {
            type: [String],
            default: [],
        },

        notes: String,

        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
callSchema.index({ accountId: 1, createdAt: -1 });
callSchema.index({ accountId: 1, status: 1 });
callSchema.index({ accountId: 1, direction: 1 });
callSchema.index({ accountId: 1, leadId: 1 });
callSchema.index({ accountId: 1, contactId: 1 });
callSchema.index({ accountId: 1, assignedUserId: 1 });
callSchema.index({ accountId: 1, from: 1 });
callSchema.index({ accountId: 1, to: 1 });

export const CallRecording = mongoose.model<ICallRecording>("CallRecording", callRecordingSchema);
export const Call = mongoose.model<ICall>("Call", callSchema);