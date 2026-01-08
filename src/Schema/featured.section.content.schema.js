const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const featuredSectionSchema = new Schema(
  {
    title: {
      type: String,
      default: null,
    },
    subtitle: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const featuredCms =
  models.featuredCms || model("featuredCms", featuredSectionSchema);

module.exports = { featuredCms };
