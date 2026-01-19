const mongoose = require("mongoose");

const { model, models, Schema } = mongoose;

const userSchema = new Schema(
  {
    firstName: { type: String, required: [true, "First Name is requried "] },
    lastName: { type: String, required: [true, "Last Name is requried "] },
    email: { type: String, required: [true, "Email address is required"] },
    role: {
      type: String,
      required: [true, "user role is required"],
      enum: ["buyer", "seller"],
      message: "Role must be one of the following:  user, or moderator",
    },
    password: { type: String, required: [true, "Password is required"] },

    isVerifiedAccount: { type: Boolean, default: false },
    isOtpVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    refreshToken: { type: String, default: null },
    resetToken: { type: String, default: null },
    profilePicture: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    termsAndConditions: { type: String, default: null },
    lastSeen: { type: Number, default: null },
    isOnline: { type: Boolean, default: false },
    socketId: { type: String, default: null },
    sessionDuration: { type: String },
    rating: { type: String, ref: "UserRating", default: null },
    identity_document: { type: mongoose.Schema.Types.ObjectId, default: null },

    activeListings: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalLeads: { type: Number, default: 0 },
    unreadMessages: { type: Number, default: 0 },

    subscription: {
      planKey: {
        type: String,
        enum: ["starter", "professional", "enterprise"],
        default: "starter",
      },
      billingCycle: {
        type: String,
        enum: ["monthly", "yearly"],
        default: "monthly",
      },
      status: {
        type: String,
        enum: [
          "free",
          "trialing",
          "active",
          "past_due",
          "canceled",
          "incomplete",
        ],
        default: "free",
      },
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      currentPeriodEnd: { type: Number, default: null }, 
    },
  },
  { timestamps: true }
);

const user = models.user || model("user", userSchema);

module.exports = { user };
