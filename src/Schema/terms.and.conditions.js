const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const termsAndConditionsSchema = new Schema(
  {
    pageTitle: {
      type: String,
      required: [true, "Page title is required"],
    },
    sections: [
      {
        title: {
          type: String,
          required: [true, "Section title is required"],
        },
        content: {
          type: String,
          required: [true, "Content is required"],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const TermsAndCondition =
  models.TermsAndCondition ||
  model("TermsAndCondition", termsAndConditionsSchema);

module.exports = { TermsAndCondition };
