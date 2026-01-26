const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const ContactQuerySchema = new Schema(
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
      required: [true, "Phone number  is required"],
    },
    subject: {
      type: String,
      required: [true, "Email subject is required"],
    },
    message: {
      type: String,
      required: [true, "Message field  is required"],
    },
  },
  {
    timestamps: true,
  }
);

const ContactQuery =
  models.ContactQuery || model("ContactQuery", ContactQuerySchema);
module.exports = {
  ContactQuery,
};
