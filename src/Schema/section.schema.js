const mongoose = require("mongoose");

const {model, models , Schema} = mongoose

const sectionItemSchema =  new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true },
  },
  { timestamps: true }
);

const sectionSchema = mongoose.Schema(
  {
    sectionTitle: { type: String, required: true },
    sectionSubtitle: { type: String, required: true },
    items: [sectionItemSchema],
  },
  {
    timestamps: true,
  }
);

const serviceSection =
  models.serviceSection || model("serviceSection", sectionSchema);

  module.exports = { serviceSection };