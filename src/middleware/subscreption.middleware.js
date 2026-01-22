const { user:User } = require("../Schema/user.schema");
const { apiError } = require("../Utils/api.error");


const requireActiveSubscription = async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) return next(new apiError(401, "Unauthorized"));

  const user = await User.findById(userId).select("subscription role");
  if (!user) return next(new apiError(404, "User not found"));


  if (user.role === "buyer") return next();

  const status = user.subscription?.status || "free";

  if (["active", "trialing"].includes(status)) return next();

  if (status === "past_due")
    return next(
      new apiError(402, "Payment failed. Please update your payment method.")
    );

  return next(
    new apiError(403, "Subscription required. Please subscribe to continue.")
  );
};

module.exports = { requireActiveSubscription };
