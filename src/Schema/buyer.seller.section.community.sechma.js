const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const buyerSellerCommunitySectionSchema = new Schema(
  {
    sectionTitle: {
      type: String,
    },
    sectionSubTitle: {
      type: String,
    },
    featureItem: [
      {
        title: {
          type: String,
        },
        subTitle: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

const buyerSellerCommunitySection =
  models.buyerSellerCommunitySection ||
  model("buyerSellerCommunitySection", buyerSellerCommunitySectionSchema);

module.exports = {
  buyerSellerCommunitySection,
};
