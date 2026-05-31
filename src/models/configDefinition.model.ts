import mongoose, { Schema, Types } from "mongoose";

const configValueSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    color: {
      type: String,
      default: "#6B7280",
    },

    order: {
      type: Number,
      default: 0,
    },

    system: {
      type: Boolean,
      default: false,
    },

    editable: {
      type: Boolean,
      default: true,
    },

    deletable: {
      type: Boolean,
      default: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: true,
  },
);

const configDefinitionSchema = new Schema(
  {
    organizationId: {
      type: Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    scope: {
      type: String,
      default: "organization",
    },

    module: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    configType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    values: {
      type: [configValueSchema],
      default: [],
    },

    createdBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_, ret) {
        delete (ret as any).__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

configDefinitionSchema.index(
  {
    organizationId: 1,
    module: 1,
    configType: 1,
  },
  {
    unique: true,
    name: "organization_module_config_unique",
  },
);

const ConfigDefinition = mongoose.model(
  "ConfigDefinition",
  configDefinitionSchema,
);

export default ConfigDefinition;
