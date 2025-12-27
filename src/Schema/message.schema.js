const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const messageSchema = new Schema(
  {
    senderId: {
      type: mongoose.Schema.ObjectId,
      ref: "user",
    },
    reciverId: {
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
  },
  {
    timestamps: true,
  }
);

const message = models.message || model("message", userSchema);

module.exports = {
  message,
};
