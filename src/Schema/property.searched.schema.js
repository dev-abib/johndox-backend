const mongoose = require("mongoose");

const { model, Schema, models } = mongoose;

const SavedSearchSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    filters: {
      city: { type: String },
      priceMin: { type: Number },
      priceMax: { type: Number },
      propertyType: { type: String },
      beds: { type: Number },
      baths: { type: Number },
    },

    alertsEnabled: {
      type: Boolean,
      default: true,
    },

    frequency: {
      type: String,
      enum: ["instant", "daily", "weekly"],
      default: "daily",
    },

    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const savedSearch =
  models.savedSearch || model("savedSearch", SavedSearchSchema);

module.exports = {
  savedSearch,
};
