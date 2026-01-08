const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const propertyHeroSchema = new Schema(
  {
    title: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
    bgImg: {
      type: String,
      default: null,
    },
    propertyType: {
      type: [String],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const propertyHero =
  models.propertyHero || model("propertyHero", propertyHeroSchema);

module.exports = {
  propertyHero,
};
