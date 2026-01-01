const mongoose = require("mongoose");

const { model, Schema, models } = mongoose;

const propertySchema = new Schema(
  {
    propertyName: {
      type: String,
      required: [true, "Property name is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    propertyType: {
      type: String,
      enum: ["house", "apartment", "land", "commercial"],
      required: [true, "Property type is required"],
    },
    listingType: {
      type: String,
      enum: ["for sale", "for rent"],
      required: [true, "Listing type is required"],
    },
    fullAddress: {
      type: String,
      required: [true, "Full address is required"],
    },
    city: {
      type: String,
      required: [true, "City name is required"],
    },
    state: {
      type: String,
      required: [true, "State name is required"],
    },
    price: {
      type: String,
      required: [true, "Price is required"],
    },
    bedrooms: {
      type: Number,
      required: [true, "Bedroom count is required"],
    },
    bathrooms: {
      type: Number,
      required: [true, "Bathroom count is required"],
    },
    yearBuilt: {
      type: String,
      required: [true, "Year built is required"],
    },
    areaInMeter: {
      type: String,
      required: [true, "Area in meter is required"],
    },
    areaInSqMeter: {
      type: String,
      required: [true, "Area in square meters is required"],
    },
    amenities: [
      {
        type: String,
      },
    ],
    media: [
      {
        type: String,
        fileType: { type: String, enum: ["image", "video"] },
      },
    ],
    category: {
      type: String,
      enum: ["residential", "commercial", "industrial", "land"],
      required: [true, "Category is required"], 
    },
  },
  {
    timestamps: true,
  }
);

const Property = models.Property || model("Property", propertySchema);

module.exports = Property;
