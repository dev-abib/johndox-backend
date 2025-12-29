const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const messageSchema = new Schema(
  {
    senderId: {
      type: mongoose.Schema.ObjectId,
      ref: "user",
    },
    receiverId: {
      type: mongoose.Schema.ObjectId,
      ref: "user",
    },
    message: {
      type: String,
    },
    fileUrl: {
      type: String,
    },
    fileType: { type: String },
    isRead: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "delivered"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const Message = models.message || model("message", messageSchema);

module.exports = {
  Message,
};
