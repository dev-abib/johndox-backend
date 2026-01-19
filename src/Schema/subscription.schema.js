const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const planSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ["starter", "professional", "enterprise"],
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 0,
    },
    features: [
      {
        type: String,
      },
    ],
    limits: {
      activeListing: {
        type: Number,
        default: 0,
      },
      featuredPerMonth: { type: Number, default: 0 },
    },
    pricing: {
      monthly: {
        amount: { type: Number, default: 0 },
        currency: { type: String, default: "USD" },
        stripePriceId: { type: String, default: null },
      },
      yearly: {
        amount: { type: Number, default: 0 },
        currency: { type: String, default: "USD" },
        stripePriceId: { type: String, default: null },
      },
      status: { type: String, enum: ["active", "inactive"], default: "active" },
    },
  },
  {
    timestamps: true,
  }
);

const plan = models.plan || model("plan", planSchema);

module.exports = {
  plan,
};
