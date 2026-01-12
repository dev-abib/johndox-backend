const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const listPropertySectionSchema = new Schema(
  {
    title: {
      type: String,
      default: null,
    },
    subtitle: {
      type: String,
      default: null,
    },
    extraTxt: {
      type: String,
      default: null,
    },
    btnTxt: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const listPropertySection =
  models.listPropertySectionSchema ||
  model("listPropertySection", listPropertySectionSchema);
module.exports = { listPropertySection };
