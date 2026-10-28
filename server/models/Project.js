import mongoose from "mongoose";
import { nanoid } from "nanoid";

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "editor", "viewer"],
      default: "editor",
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    template: {
      type: String,
      enum: ["empty", "html-css-js", "react", "node", "express", "mern", "python", "java", "cpp", "nextjs"],
      default: "empty",
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    members: { type: [memberSchema], default: [] },

    inviteCode: { type: String, unique: true, default: () => nanoid(8) },
    inviteEnabled: { type: Boolean, default: true },
    inviteExpiresAt: { type: Date, default: null }, // null = never expires

    visibility: {
      type: String,
      enum: ["private", "invite"],
      default: "invite",
    },

    maxMembers: { type: Number, default: 4, min: 1, max: 4 },

    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    settings: {
      theme: { type: String, default: "dark-modern" },
      tabSize: { type: Number, default: 2 },
      autoSave: { type: Boolean, default: true },
      autoSaveDelayMs: { type: Number, default: 1200 },
      // Stored as-is for this MVP (see git.service.js's documented caveat
      // about embedded-credential URLs belonging in a secrets manager
      // in a production build).
      gitRemoteUrl: { type: String, default: "" },
    },

    lastEditedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1, updatedAt: -1 });
projectSchema.index({ "members.user": 1 });

projectSchema.methods.isMember = function isMember(userId) {
  const uid = userId.toString();
  return (
    this.owner.toString() === uid ||
    this.members.some((m) => m.user.toString() === uid)
  );
};

projectSchema.methods.roleOf = function roleOf(userId) {
  const uid = userId.toString();
  if (this.owner.toString() === uid) return "owner";
  const member = this.members.find((m) => m.user.toString() === uid);
  return member ? member.role : null;
};

projectSchema.methods.regenerateInvite = function regenerateInvite() {
  this.inviteCode = nanoid(8);
  return this.inviteCode;
};

export default mongoose.model("Project", projectSchema);
