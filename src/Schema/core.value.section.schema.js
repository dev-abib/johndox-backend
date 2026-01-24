const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const coreValueSectionSchema = new Schema(
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

const coreValueSection =
  models.coreValueSection || model("coreValueSection", coreValueSectionSchema);

module.exports = {
  coreValueSection,
};
