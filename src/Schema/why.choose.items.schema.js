const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const whyChooseUsItemsSchema = new Schema(
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

const whyChooseUsItems =
                    models.whyChooseUsItems || model("whyChooseUsItems", whyChooseUsItemsSchema);
  
module.exports = {
  whyChooseUsItems,
};
