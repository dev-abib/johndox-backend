const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const sellerHeroSchema = new Schema(
  {
    title: {
      type: String,
      default: null,
    },
    subtitle: {
      type: String,
      default: null,
    },
    btnTxt: {
      type: String,
      default: null,
    },
    bgImg: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const sellerHero = models.sellerHero || model("sellerHero", sellerHeroSchema);

module.exports = {
  sellerHero,
};
