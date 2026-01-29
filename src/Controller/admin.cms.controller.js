const { buyerQuery } = require("../Schema/buyer.query.schema");
const { Property } = require("../Schema/property.schema");
const { plan } = require("../Schema/subscription.schema");
const { user } = require("../Schema/user.schema");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");


const dashboardAnalytics = asyncHandler(async (req, res) => {
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

  /* -------------------- BASIC STATS -------------------- */
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

  /* -------------------- PLAN BREAKDOWN -------------------- */
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

  /* -------------------- REVENUE (THIS MONTH) -------------------- */
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

  /* -------------------- LAST MONTH REVENUE -------------------- */
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

  /* -------------------- SUBSCRIPTIONS -------------------- */
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

  /* -------------------- INQUIRIES -------------------- */
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

  /* -------------------- CHART READY DATA -------------------- */
  const subscriptionChart = {
    labels: planBreakdown.map((p) => p.name),
    data: planBreakdown.map((p) => p.sellers),
  };

  const revenueComparisonChart = {
    labels: ["Last Month", "This Month"],
    data: [lastMonthRevenue, monthlyRevenue],
  };

  /* -------------------- RESPONSE -------------------- */
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


module.exports = {
  dashboardAnalytics,
};
