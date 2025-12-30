const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: [true, "Sender id is required"] },
    reciverId: { type: String, required: [true, "Reciver id is required"] },
    message: { type: String, required: true },
    status: { type: String, enum: ["unread", "read"], default: "unread" },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("notification", notificationSchema);

module.exports = { Notification };
