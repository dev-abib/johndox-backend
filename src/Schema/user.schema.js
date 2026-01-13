const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First Name is requried "],
    },
    lastName: {
      type: String,
      required: [true, "Last Name is requried "],
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
    },
    role: {
      type: String,
      required: [true, "user role is required"],
      enum: ["buyer", "seller"],
      message: "Role must be one of the following:  user, or moderator",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    isVerifiedAccount: {
      type: Boolean,
      default: false,
    },
    isOtpVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    termsAndConditions: {
      type: String,
      default: null,
    },
    lastSeen: {
      type: Number,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    socketId: {
      type: String,
      default: null,
    },
    sessionDuration: {
      type: String,
    },
    rating: {
      type: String,
      default: null,
    },
    identity_document: {
      type: String,
      default:null
    }
  },
  {
    timestamps: true,
  }
);

const user = models.user || model("user", userSchema);

module.exports = {
  user,
};
