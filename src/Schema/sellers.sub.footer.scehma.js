const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const sellerSubFooterSchema = new Schema(
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

const sellerSubFooter =
  models.sellerSubFooter || model("sellerSubFooter", sellerSubFooterSchema);
module.exports = { sellerSubFooter };
