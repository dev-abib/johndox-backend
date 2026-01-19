const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const amenitiesSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Aminites name is required"],
    },
  },
  {
    timestamps: true,
  }
);
