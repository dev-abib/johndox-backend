const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const whySellWithTerraLinkSchema  = new Schema(
  {
    sectionTitle: {
      type: String,
      default: null,
    },
    sectionSubTitle: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const whySellWithTerraLink =
  models.whySellWithTerraLink ||
  model("whySellWithTerraLink", whySellWithTerraLinkSchema);

module.exports = {
  whySellWithTerraLink,
};
