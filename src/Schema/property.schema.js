const mongoose = require("mongoose");

const { model, Schema, models } = mongoose;

const propertySchema = new Schema(
  {
    author: {
      type: mongoose.Schema.ObjectId,
      required: [true, "Author information is required"],
      ref: "user",
    },

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

    amenities: [{ type: String, trim: true }],

    media: {
      type: [
        {
          url: { type: String, required: [true, "Media URL is required"] },
          fileType: {
            type: String,
            enum: ["image", "video"],
            required: [true, "Media fileType is required"],
          },
        },
      ],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length > 0;
        },
        message: "At least one media is required",
      },
    },

    category: {
      type: String,
      enum: ["residential", "commercial", "industrial", "land"],
      required: [true, "Category is required"],
      index: true,
    },

    location: {
      geo: {
        type: {
          type: String,
          enum: ["Point"],
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
        },
      },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    views: {
      type: Number,
      default: 0,
    },

    favourites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
  },
  { timestamps: true }
);

propertySchema.index({ "location.geo": "2dsphere" });

const Property = models.Property || model("Property", propertySchema);

module.exports = { Property };
