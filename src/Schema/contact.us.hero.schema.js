const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const contactUsHeroSchema = new Schema(
  {
    title: {
      type: String,
      default: null,
    },
    subtitle: {
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

const contactUsHero =
  models.contactUsHeroSchema ||
  model("contactUsHeroSchema", contactUsHeroSchema);

module.exports = { contactUsHero };
