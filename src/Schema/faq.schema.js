const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const faqSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const faq = models.faqSchema || model("faq", faqSchema);

module.exports = {
  faq,
};