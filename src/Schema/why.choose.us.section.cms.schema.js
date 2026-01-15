const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const whyChooseUsSectionSchema = new Schema(
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

const whyChooseUsSection =
  models.whyChooseUsSectionSchema || model("whyChooseUsSection");

module.exports = {
  whyChooseUsSection,
};
