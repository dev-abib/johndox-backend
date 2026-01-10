const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const categorySectionSchema = new Schema(
  {
    title: {
      type: String,
    },
    subTitle: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const categorySection =
  models.categorySection || model("categorySection", categorySectionSchema);

module.exports = {
  categorySection,
};
