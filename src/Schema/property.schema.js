const mongoose = require("mongoose");

const { model, Schema, models } = mongoose;

const propertySchema = new Schema(
  {
    bedrooms: {
      type: String,
      required: [true, "bed rooms count is required"],
    },
  },
  {
    timestamps: true,
  }
);

const property = models.property || model("property", propertySchema);

module.exports = {};
