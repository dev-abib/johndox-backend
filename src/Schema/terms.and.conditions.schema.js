// Schema/terms.and.conditions.schema.js
const mongoose = require("mongoose");
const { model, models, Schema } = mongoose;

const sectionSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Section title is required"],
      trim: true,
    },
    content: { type: String, required: [true, "Content is required"] },
    titleKey: { type: String, required: true, lowercase: true, trim: true },
  },
  { _id: true }
);

const termsAndConditionsSchema = new Schema(
  {
    pageTitle: { type: String, trim: true },
    sections: [sectionSchema],
  },
  { timestamps: true }
);

termsAndConditionsSchema.index({ "sections.titleKey": 1 });

const TermsAndCondition =
  models.TermsAndCondition ||
  model("TermsAndCondition", termsAndConditionsSchema);

module.exports = { TermsAndCondition };
