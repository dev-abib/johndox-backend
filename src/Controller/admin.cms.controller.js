const { buyerQuery } = require("../Schema/buyer.query.schema");
const { Property } = require("../Schema/property.schema");
const { plan } = require("../Schema/subscription.schema");
const { user } = require("../Schema/user.schema");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");

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

module.exports = {
  dashboardAnalytics,
  userDirectory,
  getSingleUser,
};
