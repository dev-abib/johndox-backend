const mongoose = require("mongoose");
const { Schema } = mongoose;

const amenitiesSchema = new Schema(
  {
    name: {
      type: String,
      default: null,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Amenity =
  mongoose.models.Amenity || mongoose.model("Amenity", amenitiesSchema);
module.exports = {
  Amenity,
};
