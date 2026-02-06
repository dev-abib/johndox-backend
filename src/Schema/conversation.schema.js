const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const conversationSchema = new Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    ],
    participantsKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "message",
      default: null,
    },
    lastMessageText: { type: String, default: "" },
    lastMessageType: {
      type: String,
      enum: ["text", "image", "video", "pdf", "mixed", ""],
      default: "",
    },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessageSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    unreadCount: { type: Map, of: Number, default: {} },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

const Conversation =
  models.conversation || model("conversation", conversationSchema);
module.exports = { Conversation };
