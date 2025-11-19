import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teamMemberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    accountsId: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    }],
    teamMemberName: {
        type: String,
        required: true,
        trim: true
    },
    teamMemberEmail: {
        type: String,
        required: true,
        trim: true
    },
    teamMemberPhone: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        default: true,
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
teamSchema.index({ userId: 1 });
teamSchema.index({ teamMemberId: 1 });
teamSchema.index({ accountsId: 1 });
teamSchema.index({ teamMemberName: 1 });
teamSchema.index({ teamMemberEmail: 1 });
teamSchema.index({ teamMemberPhone: 1 });
teamSchema.index({ status: 1 });
teamSchema.index({ createdAt: -1 });


const Team = mongoose.model.Team || mongoose.model("Team", teamSchema);

export { Team }