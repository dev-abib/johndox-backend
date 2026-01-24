const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const categorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    title: {
      type: String,
      required: true,
    },
    bgImg: {
      type: String,
      required: [true, "background image is required"],
    },
    iconImg: {
      type: String,
      required: [true, "icon image is required"],
    }
  },
  {
    timestamps: true,
  }
);

const Category = models.Category || model("Category", categorySchema);

module.exports = {
  Category,
};
