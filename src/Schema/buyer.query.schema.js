const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const buyerQuerySchema = new Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Buyer user id is required"],
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Seller user id is required"],
    },
    message: {
      type: String,
      required: [true, "buyer phone number is required"],
    },
    buyerPhoneNumber: {
      type: String,
      default: null,
    },
    buyerVisitingDate: {
      type: String,
      default: null,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property id is required"],
    },
  },
  {
    timestamps: true,
  }
);

const buyerQuery = models.buyerQuery || model("buyerQuery", buyerQuerySchema);

module.exports = {
  buyerQuery,
};
