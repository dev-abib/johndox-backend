const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const stripeEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String, default: null },
  },
  { timestamps: true }
);

const StripeEvent =
  models.StripeEvent || model("StripeEvent", stripeEventSchema);
module.exports = { StripeEvent };
