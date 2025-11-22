import mongoose from "mongoose";

const teamTeamMembersSchema = new mongoose.Schema({
    orgId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    roleId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: true
    },
    status: {
        type: Boolean,
        default: true,
    },
    inviteStatus:{
        type:String,
        enum:['PENDING','ACCEPTED','DECLINED'],
        default:'PENDING'
    },

}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_, ret) {
            delete (ret as any).__v;
            return ret;
        },
    },
});

// Indexes for better performance
teamTeamMembersSchema.index({ userId: 1 });
teamTeamMembersSchema.index({ teamMemberId: 1 });
teamTeamMembersSchema.index({ accountsId: 1 });
teamTeamMembersSchema.index({ teamMemberName: 1 });
teamTeamMembersSchema.index({ teamMemberEmail: 1 });
teamTeamMembersSchema.index({ teamMemberPhone: 1 });
teamTeamMembersSchema.index({ status: 1 });
teamTeamMembersSchema.index({ createdAt: -1 });



const teamMemberAccountLeadsSchema = new mongoose.Schema({
    teamMemberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TeamMember',
        required: true
    },
    accountsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    leadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true
    },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform(_, ret) {
            delete (ret as any).__v;
            return ret;
        }
    },
});

teamMemberAccountLeadsSchema.index({ teamMemberId: 1 });
teamMemberAccountLeadsSchema.index({ accountsId: 1 });
teamMemberAccountLeadsSchema.index({ leadId: 1 });



const TeamMember = mongoose.model.TeamMember || mongoose.model("TeamMember", teamTeamMembersSchema);
const TeamMemberAccountLeads = mongoose.model.TeamMemberAccountLeads || mongoose.model("TeamMemberAccountLeads", teamMemberAccountLeadsSchema);

export { TeamMember, TeamMemberAccountLeads };