const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const notificationPreferenceSchema = new Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Author info is required"],
      unique: [true, "user id must be unique"],
      default: null,
    },
    propertyAlert: {
      type: Boolean,
      default: true,
    },
    messageNotifications: {
      type: Boolean,
      default: true,
    },
    priceUpdates: {
      type: Boolean,
      default: false,
    },
    listingActivity: {
      type: Boolean,
      default: false,
    },
    promotionsAndOffer: {
      type: Boolean,
      default: false,
    },
    emailNotifications: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const notificationPreference =
  models.notificationPreference ||
  model("notificationPreference", notificationPreferenceSchema);

module.exports = {
  notificationPreference,
};
