const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const supportMessageSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
    },
    message: {
      type: String,
      required: [true, "Message filed is required"],
    },
  },
  {
    timestamps: true,
  }
);


const supportMessage = models.support || model("support", supportMessageSchema);

module.exports = {
  supportMessage,
};
