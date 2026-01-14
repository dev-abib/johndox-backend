const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const termsAndConditionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    features: [
      {
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const termsAndCondition =
  models.termsAndCondition ||
  model("termsAndCondition", termsAndConditionSchema);

module.exports = { termsAndConditionSchema };
