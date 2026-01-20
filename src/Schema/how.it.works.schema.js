const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const howItWorkItemsSchema = new Schema(
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

const howItWorkItems =
  models.howItWorkItems || model("howItWorkItems", howItWorkItemsSchema);
  
module.exports = {
  howItWorkItems,
};
