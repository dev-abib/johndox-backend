const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const pricingPageCmsSchema = new Schema(
  {
    mainTitle: {
      type: String,
      default: null,
    },
    subTitle: {
      type: String,
      default: null,
    },
    discountAmount: {
      type: String,
      default: null,
    },
    faqTitle: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const pricingPageCms =
  models.pricingPageCmsSchema ||
  model("pricingPageCmsSchema", pricingPageCmsSchema);
module.exports = {
  pricingPageCms,
};
