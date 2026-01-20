const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const howItWorksSectionSchema = new Schema(
  {
    sectionTitle: {
      type: String,
      default: null,
    },
    sectionSubTitle: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const howItWorksSection =
  models.howItWorksSection ||
  model("howItWorksSection", howItWorksSectionSchema);

module.exports = {
  howItWorksSection,
};
