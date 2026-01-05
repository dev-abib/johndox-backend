const mongoose = require("mongoose");
const { model, models, Schema } = mongoose;

const messageSchema = new Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },

    message: { type: String, default: "" },

    fileUrl: { type: String, default: "" },
    fileType: {
      type: String,
      enum: ["", "image", "video", "pdf"],
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "delivered", "seen"],
      default: "pending",
      index: true,
    },

    deliveredAt: { type: Date, default: null },
    seenAt: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, status: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

const Message = models.message || model("message", messageSchema);
module.exports = { Message };
