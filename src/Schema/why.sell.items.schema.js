const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const whySellItemSchema = new Schema(
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

const whySellItems =
  models.whySellItems || model("whySellItems", whySellItemSchema);
  
module.exports = {
  whySellItems,
};
