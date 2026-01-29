const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const restrictedUserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email address is required"],
    },
    name: {
      type: String,
      required: [true, "Restricted user name is required"],
    },
    phoneNumber: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const restrictedUser =
  models.restrictedUser || model("restrictedUser", restrictedUserSchema);

module.exports = {
  restrictedUser,
};
