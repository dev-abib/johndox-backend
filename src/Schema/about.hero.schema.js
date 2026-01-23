const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const aboutHeroSchema = new Schema(
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

const aboutHero = models.aboutHero || model("aboutHero", aboutHeroSchema);

module.exports = {
  aboutHero,
};
