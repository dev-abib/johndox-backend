const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const paymentSchema = new Schema(
  {
    stripeInvoiceId: { type: String, unique: true, index: true },
    stripeSubscriptionId: { type: String, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "user", index: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    planKey: { type: String, default: null },

    paidAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

const Payment = models.Payment || model("Payment", paymentSchema);
module.exports = { Payment };
