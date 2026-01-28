const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const propertyViewSchema = new Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    ipAddress: { type: String, default: null },
    viewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const PropertyView =
  models.PropertyView || model("PropertyView", propertyViewSchema);

module.exports = { PropertyView };
