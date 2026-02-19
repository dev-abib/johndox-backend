const mongoose = require("mongoose");
const { model, models, Schema } = mongoose;

const siteSettingSchema = new Schema(
  {
    title: { type: String },
    name: { type: String },
    phoneNumber: { type: String },
    systemDetails: { type: String },
    siteLogo: { type: String },
    address: { type: String },
    email: { type: String },
    openingHour: { type: String },
    copyrightTxt: { type: String },
    faviconIcon: { type: String },
    footerLogo: { type: String },
    infoNumber: { type: String },
    infoMsg: { type: String },
    infCompany: { type: String },
    location: {
      geo: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [], // Set default to empty array
        },
      },
      lat: { type: Number, default: undefined },
      lng: { type: Number, default: undefined },
    },
    socialLinks: {
      facebook: String,
      instagram: String,
      linkedin: String,
      x: String,
      youtube: String,
      whatsapp: String,
      telegram: String,
    },
  },
  { timestamps: true }
);

// Create the geospatial index for location.geo
siteSettingSchema.index({ "location.geo": "2dsphere" });

// Ensure the model is only created once
const siteSettingModel =
  models.siteSettings || model("siteSettings", siteSettingSchema);

module.exports = { siteSettingModel };
