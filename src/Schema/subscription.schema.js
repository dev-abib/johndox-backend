const mongoose = require("mongoose");
const { model, models, Schema } = mongoose;

const planSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_-]+$/, 
    },
    name: { type: String, required: true },
    description: { type: String, default: null },

    isFree: { type: Boolean, default: false },
    isPopular: { type: Boolean, default: false },
    trialDays: { type: Number, default: 0 },

    features: [{ type: String }],

    limits: {
      activeListing: { type: Number, default: 0 },
      featuredPerMonth: { type: Number, default: 0 },
    },

    pricing: {
      stripeProductId: { type: String, default: null },
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

    archivedAt: { type: Date, default: null }, // optional helpful field
  },
  { timestamps: true }
);

const plan = models.plan || model("plan", planSchema);
module.exports = { plan };
