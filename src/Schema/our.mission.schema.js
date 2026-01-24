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

const OurMissionSectionSchema = new Schema(
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
    featureItems: {
      type: [featureItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const OurMissionSection =
  models.OurMissionSection ||
  model("OurMissionSection", OurMissionSectionSchema);

module.exports = OurMissionSection;
