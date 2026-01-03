const mongoose = require("mongoose");

const { model, Schema, models } = mongoose;

const propertySchema = new Schema(
  {
    propertyName: {
      type: String,
      required: [true, "Property name is required"],
      trim: true,
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
      index: true,
    },

    state: {
      type: String,
      required: [true, "State name is required"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      index: true,
    },

    bedrooms: {
      type: Number,
      required: [true, "Bedroom count is required"],
      min: [0, "Bedrooms cannot be negative"],
    },

    bathrooms: {
      type: Number,
      required: [true, "Bathroom count is required"],
      min: [0, "Bathrooms cannot be negative"],
    },

    yearBuilt: {
      type: Number,
      required: [true, "Year built is required"],
    },

    areaInMeter: {
      type: Number,
      required: [true, "Area in meter is required"],
    },

    areaInSqMeter: {
      type: Number,
      required: [true, "Area in square meters is required"],
    },

    amenities: [
      {
        type: String,
        trim: true,
      },
    ],

    media: [
      {
        url: { type: String, required: true },
        fileType: { type: String, enum: ["image", "video"], required: true },
      },
    ],

    category: {
      type: String,
      enum: ["residential", "commercial", "industrial", "land"],
      required: [true, "Category is required"],
      index: true,
    },
  },
  { timestamps: true }
);

const Property = models.Property || model("Property", propertySchema);

module.exports = { Property };
