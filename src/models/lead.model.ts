import { model, Schema } from "mongoose";


const leadSchema=new Schema({
    accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    leadSourceId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true,refPath: "leadSource" },
    leadSource: { type: String, enum: ["Chatbot", "Webform"], required: true },
    
    guestId:{type:String, required:true},
    contactInfo: {
        fullName:{type:String}, // computed field
        emails: {type:String},
        phones:{type:String},
    },

    salesPipeline: {
        leadPageSource: {
            type: String,
            required:true
        },
        stage: {
            type: String,
            enum: ['prospect', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost'],
            default: 'prospect'
        },
        priority: { type: String, enum: ['hot', 'warm', 'cold'], default: 'cold' },
        probability: { type: Number, min: 0, max: 100 },
        expectedCloseDate: Date,
        lostReason: String,
        note:{type:String},
    },
},{
    timestamps: true,
    versionKey: false,
        toJSON: {
            transform(_, ret:any) {
                delete (ret as any)._id;
                delete (ret as any).__v;
                return ret;
            }
        }
})


const leadChatReponseSchema = new Schema({
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    message:{type:String, required:true},
    type:{type:String,enum:['user','bot']},
},{
    timestamps:true,
    versionKey: false,
        toJSON: {
            transform(_, ret) {
                delete (ret as any)._id;
                delete (ret as any).__v;
                return ret;
            }
        }
})



leadSchema.index({ accountId: 1 });
leadSchema.index({ leadSource: 1 });

leadChatReponseSchema.index({leadId:1})


export const Lead = model(
    "Lead",
    leadSchema
);
export const LeadChatReponseSchema = model(
    "LeadChatReponseSchema",
    leadChatReponseSchema
);
