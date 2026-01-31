const { mailSender } = require("../Helpers/emailSender");
const { deleteCloudinaryAsset } = require("../Helpers/uploadCloudinary");
const { Amenity } = require("../Schema/aminities.schema");
const { buyerQuery } = require("../Schema/buyer.query.schema");
const { Conversation } = require("../Schema/conversation.schema");
const { Message } = require("../Schema/message.schema");
const { Notification } = require("../Schema/notification.schema");
const { notificationPreference } = require("../Schema/notifications.schema");
const { Property } = require("../Schema/property.schema");
const { restrictedUser } = require("../Schema/restricted.users.schema");
const { plan } = require("../Schema/subscription.schema");
const { UserRating } = require("../Schema/user.rating.schema");
const { user } = require("../Schema/user.schema");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");
const mongoose = require("mongoose");

const dashboardAnalytics = asyncHandler(async (req, res, next) => {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59
  );

  const [activeListings, totalBuyers, totalPaidSellers, activePlans] =
    await Promise.all([
      Property.countDocuments(),
      user.countDocuments({ role: "buyer" }),
      user.countDocuments({
        role: "seller",
        "subscription.status": "active",
      }),
      plan.find({ "pricing.status": "active" }).lean(),
    ]);

  const planBreakdown = activePlans.map((p) => ({
    key: p.key,
    name: p.name,
    sellers: 0,
  }));

  const planBreakdownAgg = await user.aggregate([
    {
      $match: {
        role: "seller",
        "subscription.status": "active",
      },
    },
    {
      $group: {
        _id: "$subscription.planKey",
        sellers: { $sum: 1 },
      },
    },
  ]);

  planBreakdownAgg.forEach((p) => {
    const planItem = planBreakdown.find((pl) => pl.key === p._id);
    if (planItem) {
      planItem.sellers = p.sellers;
    }
  });

  const revenueAgg = await user.aggregate([
    {
      $match: {
        role: "seller",
        "subscription.status": "active",
      },
    },
    {
      $lookup: {
        from: "plans",
        localField: "subscription.planKey",
        foreignField: "key",
        as: "plan",
      },
    },
    { $unwind: "$plan" },
    {
      $addFields: {
        price: {
          $cond: [
            { $eq: ["$subscription.billingCycle", "yearly"] },
            "$plan.pricing.yearly.amount",
            "$plan.pricing.monthly.amount",
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$price" },
      },
    },
  ]);

  const monthlyRevenue = revenueAgg[0]?.totalRevenue || 0;

  const lastMonthRevenueAgg = await user.aggregate([
    {
      $match: {
        role: "seller",
        "subscription.status": "active",
        createdAt: {
          $gte: startOfLastMonth,
          $lte: endOfLastMonth,
        },
      },
    },
    {
      $lookup: {
        from: "plans",
        localField: "subscription.planKey",
        foreignField: "key",
        as: "plan",
      },
    },
    { $unwind: "$plan" },
    {
      $addFields: {
        price: {
          $cond: [
            { $eq: ["$subscription.billingCycle", "yearly"] },
            "$plan.pricing.yearly.amount",
            "$plan.pricing.monthly.amount",
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$price" },
      },
    },
  ]);

  const lastMonthRevenue = lastMonthRevenueAgg[0]?.totalRevenue || 0;

  const revenueGrowthPercentage =
    lastMonthRevenue === 0
      ? 100
      : Math.round(
          ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        );

  const newSubscriptionsThisMonth = await user.countDocuments({
    role: "seller",
    "subscription.status": "active",
    createdAt: { $gte: startOfMonth },
  });

  const newSubscriptionsLastMonth = await user.countDocuments({
    role: "seller",
    "subscription.status": "active",
    createdAt: {
      $gte: startOfLastMonth,
      $lte: endOfLastMonth,
    },
  });

  const inquiriesToday = await buyerQuery.countDocuments({
    createdAt: { $gte: startOfToday },
  });

  const latestInquiries = await buyerQuery
    .find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("buyer", "firstName lastName")
    .populate("propertyId", "title")
    .lean();

  const subscriptionChart = {
    labels: planBreakdown.map((p) => p.name),
    data: planBreakdown.map((p) => p.sellers),
  };

  const revenueComparisonChart = {
    labels: ["Last Month", "This Month"],
    data: [lastMonthRevenue, monthlyRevenue],
  };

  return res.status(200).json(
    new apiSuccess(200, "Dashboard analytics fetched successfully", {
      stats: {
        activeListings,
        paidSellers: totalPaidSellers,
        registeredBuyers: totalBuyers,
        monthlyRevenue,
        activePlans: activePlans.length,
        inquiriesToday,
      },

      revenue: {
        thisMonth: monthlyRevenue,
        lastMonth: lastMonthRevenue,
        growthPercentage: revenueGrowthPercentage,
      },

      plans: {
        breakdown: planBreakdown,
      },

      subscriptions: {
        newThisMonth: newSubscriptionsThisMonth,
        newLastMonth: newSubscriptionsLastMonth,
      },

      charts: {
        subscriptionDistribution: subscriptionChart,
        revenueComparison: revenueComparisonChart,
      },

      inquiries: latestInquiries.map((q) => ({
        buyerName: `${q.buyer.firstName} ${q.buyer.lastName}`,
        property: q.propertyId?.title,
        message: q.message,
        time: q.createdAt,
      })),
    })
  );
});

const userDirectory = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    order = "desc",
    roleType,
    sellerType,
  } = req.query;

  const skip = (page - 1) * limit;
  const sortOrder = order === "asc" ? 1 : -1;

  let query = {};

  if (roleType === "buyer") {
    query.role = "buyer";
  }

  if (roleType === "seller") {
    query.role = "seller";
  }

  if (sellerType === "paid") {
    query.role = "seller";
    query["subscription.status"] = "active";
  }

  if (sellerType === "unpaid") {
    query.role = "seller";
    query.$or = [
      { "subscription.status": { $ne: "active" } },
      { subscription: { $exists: false } },
    ];
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phoneNumber: { $regex: search, $options: "i" } },
    ];
  }

  const [users, totalFiltered, stats] = await Promise.all([
    user
      .find(query)
      .select(
        "firstName lastName email role isVerifiedAccount profilePicture phoneNumber subscription createdAt"
      )
      .sort({ [sortBy]: sortOrder })
      .skip(Number(skip))
      .limit(Number(limit)),

    user.countDocuments(query),

    {
      totalUsers: await user.countDocuments(),
      totalBuyers: await user.countDocuments({ role: "buyer" }),
      totalSellers: await user.countDocuments({ role: "seller" }),
      totalPaidSellers: await user.countDocuments({
        role: "seller",
        "subscription.status": "active",
      }),
    },
  ]);

  res.status(200).json(
    new apiSuccess(200, "Successfully retrieved user directory", {
      stats,
      pagination: {
        page: Number(page),
        totalPages: Math.ceil(totalFiltered / limit),
        totalResults: totalFiltered,
      },
      data: users,
    })
  );
});

// get single user
const getSingleUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const isExistedUser = await user
    .findById(userId)
    .select(
      "-password -otp -otpExpiresAt -refreshToken -resetToken -socketId -sessionDuration"
    );

  if (!isExistedUser) {
    return next(
      new apiError(404, "this account didn't exist or removed", null, false)
    );
  }

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Successfully retrieved user information",
        isExistedUser,
        false
      )
    );
});

const verifyUserAccount = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const User = await user.findById(userId);

  if (!User) {
    return next(
      new apiError(404, "User not found, account deleted or removed by admin")
    );
  }

  let isVerified;

  if (User?.isVerifiedAccount) {
    User.isVerifiedAccount = false;
    isVerified = false;
  } else {
    User.isVerifiedAccount = true;
    isVerified = true;
  }

  await User.save();

  await mailSender({
    type: "account-verification-status",
    emailAddress: User.email,
    data: {
      name: `${User.firstName}${User.lastName}`,
      email: User.email,
      isVerified,
    },
    subject: `Your Account Has Been ${isVerified ? "Verified" : "Unverified"}`,
  });

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        `Account ${isVerified ? "verified" : "verification removed"} successfully`
      )
    );
});

const deleteUserAccount = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new apiError(400, "Invalid user id"));
  }

  const existingUser = await user.findById(userId).lean();
  if (!existingUser) {
    return next(new apiError(404, "User not found"));
  }

  await restrictedUser.create({
    name: `${existingUser.firstName} ${existingUser.lastName}`,
    email: existingUser.email,
    phoneNumber: existingUser.phoneNumber || null,
  });

  const cloudinaryAssets = [];
  if (existingUser.profilePicture)
    cloudinaryAssets.push(existingUser.profilePicture);
  if (existingUser.identity_document)
    cloudinaryAssets.push(existingUser.identity_document);

  const properties = await Property.find(
    { author: userId },
    { media: 1 }
  ).lean();
  properties.forEach((property) => {
    property.media?.forEach((media) => {
      if (media?.url) cloudinaryAssets.push(media.url);
    });
  });

  await Promise.allSettled(
    [...new Set(cloudinaryAssets)].map((url) => deleteCloudinaryAsset(url))
  );

  await Promise.all([
    Property.deleteMany({ author: userId }),
    Message.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
    Conversation.deleteMany({ participants: userId }),
    Notification.deleteMany({
      $or: [{ senderId: userId }, { reciverId: userId }],
    }),
    notificationPreference.deleteOne({ author: userId }),
    buyerQuery.deleteMany({ $or: [{ buyer: userId }, { seller: userId }] }),
    UserRating.deleteMany({ $or: [{ rater: userId }, { receiver: userId }] }),
    plan.updateMany({ userId }, { $set: { userId: null } }),
  ]);

  await user.findByIdAndDelete(userId);

  const isMailSent = await mailSender({
    type: "account-delete",
    emailAddress: existingUser?.email,
    data: {
      name: `${existingUser?.firstName} ${existingUser?.lastName}`,
      email: existingUser?.email,
    },
    subject: "Your account has been deleted due to policy violations",
  });

  if (isMailSent) {
    return res
      .status(200)
      .json(
        new apiSuccess(
          200,
          "User account and all related data deleted successfully, and a notification email has been sent to the user."
        )
      );
  }

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "User account and all related data deleted successfully."
      )
    );
});

const sendMailToUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { subject, message } = req.body;

  if (!subject) {
    return next(new apiError(400, "Email subject is required"));
  }

  if (!message) {
    return next(new apiError(400, "Message field is required"));
  }

  const User = await user.findById(userId);

  if (!User) {
    return next(new apiError(404, "user not found"));
  }

  const { email, firstName, lastName } = User;

  const isMailSent = await mailSender({
    type: "admin-mail",
    emailAdress: email,
    data: { email, subject, firstName, lastName, message },
    subject: subject,
  });

  if (!isMailSent) {
    return next(new apiError(500, "Can't send mail at the moment"));
  }

  res.status(200).json(new apiSuccess(200, "Successfully sent admin mail"));
});

const banUnbannedUser = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new apiError(400, "user id is required"));
  }
  const User = await user.findById(userId);

  const BannedUser = User.isBanned;

  if (BannedUser) {
    User.isBanned = false;
    await User.save();

    const isMailSent = await mailSender({
      type: "account-unbanned",
      emailAdress: User?.email,
      data: {
        name: `${User?.firstName} ${User?.lastName}`,
        email: User?.email,
      },
      subject: `Account re activation confirmation`,
    });

    if (isMailSent) {
      return res
        .status(200)
        .json(
          new apiSuccess(
            200,
            "Successfully removed ban from user , and sent warning mail."
          )
        );
    }
    return res
      .status(200)
      .json(new apiSuccess(200, "Successfully removed ban from user"));
  } else {
    User.isBanned = true;
    await User.save();

    const isMailSent = await mailSender({
      type: "account-banned",
      emailAdress: User?.email,
      data: {
        name: `${User?.firstName} ${User?.lastName}`,
        email: User?.email,
      },
      subject: `Terms and privacy Policy violation`,
    });

    if (isMailSent) {
      return res
        .status(200)
        .json(
          new apiSuccess(
            200,
            "Successfully  banned user, and sent confirmation mail."
          )
        );
    }
    return res
      .status(200)
      .json(new apiSuccess(200, "Successfully  banned user"));
  }
});

const getFavoritesListingById = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "10", 10), 1),
    100
  );
  const skip = (page - 1) * limit;

  const filter = { favourites: userId };

  const [favoriteListings, total] = await Promise.all([
    Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-author -favourites")
      .lean(),
    Property.countDocuments(filter),
  ]);

  if (total === 0) {
    return next(
      new apiError(
        404,
        "Currently this user doesn't have any favorite listing",
        null,
        false
      )
    );
  }

  return res.status(200).json(
    new apiSuccess(
      200,
      "Successfully retrieved all favorite listings",
      {
        listings: favoriteListings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      true
    )
  );
});

const upsertAmenity = asyncHandler(async (req, res, next) => {
  console.log(req);

  const { name, oldName } = req.body;

  if (!name) {
    return next(new apiError(400, "Amenity name is required"));
  }

  let isExist;

  if (oldName) {
    isExist = await Amenity.findOne({
      name: { $regex: `^${oldName}$`, $options: "i" },
    });
  }

  if (isExist) {
    isExist.name = name;
    await isExist.save();
    return res
      .status(200)
      .json(new apiSuccess(200, "Amenity updated successfully", isExist, true));
  }

  let amenity;

  amenity = await Amenity.create({ name });

  amenity.save();
  return res
    .status(200)
    .json(new apiSuccess(200, "Amenity saved successfully", amenity, true));
});

const getAllAmenities = asyncHandler(async (req, res) => {
  const amenities = await Amenity.find().sort({ createdAt: -1 }).lean();

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Amenities retrieved successfully", amenities, true)
    );
});

const deleteAmenity = asyncHandler(async (req, res, next) => {
  const { name } = req.params;

  const amenity = await Amenity.findOneAndDelete({ name: name });

  if (!amenity) {
    return next(new apiError(404, "Amenity not found"));
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "Amenity deleted successfully", null, true));
});

module.exports = {
  dashboardAnalytics,
  userDirectory,
  getSingleUser,
  deleteUserAccount,
  verifyUserAccount,
  sendMailToUser,
  banUnbannedUser,
  getFavoritesListingById,
  upsertAmenity,
  getAllAmenities,
  deleteAmenity,
};
