const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const featureItemSchema = new Schema({
  title: {
    type: String,
    trim: true,
    required: [true, "Feature title is required"],
  },
  subTitle: {
    type: String,
    trim: true,
    required: [true, "Feature subtitle is required"],
  },
});

const buyerSellerCommunitySchema = new Schema(
  {
    sectionTitle: {
      type: String,
      trim: true,
    },
    sectionSubTitle: {
      type: String,
      trim: true,
    },

    featureItems: {
      type: [featureItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);


buyerSellerCommunitySchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await models.BuyerSellerCommunity.countDocuments();
    if (count > 0) {
      return next(
        new Error("Only one BuyerSellerCommunity document is allowed")
      );
    }
  }
  next();
});

const BuyerSellerCommunity =
  models.BuyerSellerCommunity ||
  model("BuyerSellerCommunity", buyerSellerCommunitySchema);

  module.exports = BuyerSellerCommunity;
