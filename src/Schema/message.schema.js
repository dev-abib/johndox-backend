const mongoose = require("mongoose");
const { model, models, Schema } = mongoose;

const messageSchema = new Schema(
  {
    senderId: {
      type: mongoose.Schema.ObjectId,
      ref: "user",
      required: [true, "Sender ID is required"],
    },
    receiverId: {
      type: mongoose.Schema.ObjectId,
      ref: "user",
      required: [true, "Receiver ID is required"],
    },
    message: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
    },
    fileType: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["pending", "delivered", "seen"],
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
