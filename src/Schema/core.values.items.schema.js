const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const coreValueItemsSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
      required: true,
    },
    iconImg: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const coreValueItems =
  models.coreValueItems || model("coreValueItemsSchema", coreValueItemsSchema);
  
module.exports = {
  coreValueItems,
};
