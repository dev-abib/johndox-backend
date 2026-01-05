const mongoose = require("mongoose");
const { Schema, model, models } = mongoose;

const userRatingSchema = new Schema(
  {
    rater: { type: Schema.Types.ObjectId, ref: "user", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "user", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null },
  },
  { timestamps: true }
);

userRatingSchema.index({ rater: 1, receiver: 1 }, { unique: true });

const UserRating = models.UserRating || model("UserRating", userRatingSchema);

module.exports = { UserRating };
