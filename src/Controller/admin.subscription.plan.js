const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const { plan: Plan } = require("../Schema/subscription.schema");
const { user: User } = require("../Schema/user.schema");
const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");

const ensureRecurringPrice = async ({ productId, planDoc, cycle }) => {
  const current = planDoc.pricing?.[cycle];
  if (!current) return;

  if (current.stripePriceId) return;

  const interval = cycle === "yearly" ? "year" : "month";
  const amount = Number(current.amount || 0);
  if (amount <= 0) return; // allow free or unset (skip)

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(amount * 100),
    currency: (current.currency || "USD").toLowerCase(),
    recurring: { interval },
    metadata: { planKey: planDoc.key, billingCycle: cycle },
  });

  planDoc.pricing[cycle].stripePriceId = price.id;
};

/**
 * POST /admin/plans
 * body: { key, name, description, isFree, isPopular, trialDays, features, limits, pricing }
 */
const createPlan = asyncHandler(async (req, res, next) => {
  const payload = req.body || {};
  const key = String(payload.key || "")
    .trim()
    .toLowerCase();

  if (!key) return next(new apiError(400, "key is required"));
  if (!/^[a-z0-9_-]+$/.test(key))
    return next(new apiError(400, "Invalid key format"));
  if (!payload.name) return next(new apiError(400, "name is required"));

  const exists = await Plan.findOne({ key });
  if (exists) return next(new apiError(409, "Plan key already exists"));

  const planDoc = await Plan.create({
    key,
    name: payload.name,
    description: payload.description || null,
    isFree: Boolean(payload.isFree),
    isPopular: Boolean(payload.isPopular),
    trialDays: Number(payload.trialDays || 0),
    features: Array.isArray(payload.features) ? payload.features : [],
    limits: payload.limits || { activeListing: 0, featuredPerMonth: 0 },
    pricing: {
      stripeProductId: null,
      monthly: payload.pricing?.monthly || {
        amount: 0,
        currency: "USD",
        stripePriceId: null,
      },
      yearly: payload.pricing?.yearly || {
        amount: 0,
        currency: "USD",
        stripePriceId: null,
      },
      status: "active",
    },
  });

  // Stripe product
  const product = await stripe.products.create({
    name: planDoc.name,
    description: planDoc.description || undefined,
    metadata: { planKey: planDoc.key },
  });

  planDoc.pricing.stripeProductId = product.id;

  // Stripe prices (if amounts > 0)
  await ensureRecurringPrice({
    productId: product.id,
    planDoc,
    cycle: "monthly",
  });
  await ensureRecurringPrice({
    productId: product.id,
    planDoc,
    cycle: "yearly",
  });

  await planDoc.save();

  return res
    .status(201)
    .json(new apiSuccess(201, "Plan created", { plan: planDoc }));
});

/**
 * GET /admin/plans
 */
const listPlans = asyncHandler(async (req, res) => {
  const plans = await Plan.find().sort({ createdAt: -1 });
  return res.status(200).json(new apiSuccess(200, "Plans fetched", { plans }));
});

/**
 * GET /admin/plans/:planKey
 */
const getPlan = asyncHandler(async (req, res, next) => {
  const planKey = String(req.params.planKey || "").toLowerCase();
  const planDoc = await Plan.findOne({ key: planKey });
  if (!planDoc) return next(new apiError(404, "Plan not found"));
  return res
    .status(200)
    .json(new apiSuccess(200, "Plan fetched", { plan: planDoc }));
});

/**
 * PUT /admin/plans/:planKey
 * Updates non-price fields (and Stripe product info)
 */
const updatePlan = asyncHandler(async (req, res, next) => {
  const planKey = String(req.params.planKey || "").toLowerCase();
  const updates = req.body || {};

  const planDoc = await Plan.findOne({ key: planKey });
  if (!planDoc) return next(new apiError(404, "Plan not found"));

  if (updates.name != null) planDoc.name = updates.name;
  if (updates.description != null) planDoc.description = updates.description;
  if (updates.isFree != null) planDoc.isFree = Boolean(updates.isFree);
  if (updates.isPopular != null) planDoc.isPopular = Boolean(updates.isPopular);
  if (updates.trialDays != null) planDoc.trialDays = Number(updates.trialDays);
  if (updates.features != null)
    planDoc.features = Array.isArray(updates.features) ? updates.features : [];
  if (updates.limits != null) planDoc.limits = updates.limits;

  // optionally allow toggling status
  if (
    updates.pricing?.status &&
    ["active", "inactive"].includes(updates.pricing.status)
  ) {
    planDoc.pricing.status = updates.pricing.status;
    if (updates.pricing.status === "inactive") planDoc.archivedAt = new Date();
    if (updates.pricing.status === "active") planDoc.archivedAt = null;
  }

  await planDoc.save();

  // Update Stripe product (safe)
  const productId = planDoc.pricing?.stripeProductId;
  if (productId) {
    await stripe.products.update(productId, {
      name: planDoc.name,
      description: planDoc.description || undefined,
      metadata: { planKey: planDoc.key },
    });
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "Plan updated", { plan: planDoc }));
});

/**
 * POST /admin/plans/:planKey/sync
 * Ensures Stripe product exists + creates missing prices if needed
 */
const syncPlanToStripe = asyncHandler(async (req, res, next) => {
  const planKey = String(req.params.planKey || "").toLowerCase();

  const planDoc = await Plan.findOne({ key: planKey });
  if (!planDoc) return next(new apiError(404, "Plan not found"));

  let productId = planDoc.pricing?.stripeProductId;

  if (!productId) {
    const product = await stripe.products.create({
      name: planDoc.name,
      description: planDoc.description || undefined,
      metadata: { planKey: planDoc.key },
    });

    productId = product.id;
    planDoc.pricing.stripeProductId = productId;
  } else {
    await stripe.products.update(productId, {
      name: planDoc.name,
      description: planDoc.description || undefined,
      metadata: { planKey: planDoc.key },
    });
  }

  await ensureRecurringPrice({ productId, planDoc, cycle: "monthly" });
  await ensureRecurringPrice({ productId, planDoc, cycle: "yearly" });

  await planDoc.save();

  return res.status(200).json(
    new apiSuccess(200, "Plan synced to Stripe", {
      planKey: planDoc.key,
      stripeProductId: planDoc.pricing.stripeProductId,
      monthlyPriceId: planDoc.pricing.monthly.stripePriceId,
      yearlyPriceId: planDoc.pricing.yearly.stripePriceId,
    })
  );
});

/**
 * PUT /admin/plans/:planKey/price
 * body: { billingCycle, amount, currency, migrateExisting=true/false }
 */
const adminUpdatePlanPrice = asyncHandler(async (req, res, next) => {
  const planKey = String(req.params.planKey || "").toLowerCase();
  const { billingCycle, amount, currency, migrateExisting = true } = req.body;

  if (!["monthly", "yearly"].includes(billingCycle)) {
    return next(new apiError(400, "billingCycle must be monthly or yearly"));
  }

  const planDoc = await Plan.findOne({ key: planKey });
  if (!planDoc) return next(new apiError(404, "Plan not found"));

  const productId = planDoc.pricing?.stripeProductId;
  if (!productId)
    return next(new apiError(400, "stripeProductId missing. Sync plan first."));

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0)
    return next(new apiError(400, "amount must be > 0"));

  const oldPriceId = planDoc.pricing?.[billingCycle]?.stripePriceId || null;
  const interval = billingCycle === "yearly" ? "year" : "month";

  const newPrice = await stripe.prices.create({
    product: productId,
    unit_amount: Math.round(numAmount * 100),
    currency: (currency || "USD").toLowerCase(),
    recurring: { interval },
    metadata: { planKey: planDoc.key, billingCycle },
  });

  // Deactivate old price (recommended)
  if (oldPriceId) await stripe.prices.update(oldPriceId, { active: false });

  let migratedCount = 0;

  if (migrateExisting) {
    const users = await User.find({
      "subscription.planKey": planKey,
      "subscription.billingCycle": billingCycle,
      "subscription.status": { $in: ["active", "trialing", "past_due"] },
      "subscription.stripeSubscriptionId": { $ne: null },
    }).select("subscription.stripeSubscriptionId");

    for (const u of users) {
      const subId = u.subscription?.stripeSubscriptionId;
      if (!subId) continue;

      const sub = await stripe.subscriptions.retrieve(subId);

      // Safer: choose item that belongs to this product (not just first)
      const item =
        sub.items?.data?.find((it) => it.price?.product === productId) ||
        sub.items?.data?.[0];
      if (!item?.id) continue;

      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: newPrice.id }],
        proration_behavior: "none",
      });

      migratedCount++;
    }
  }

  planDoc.pricing[billingCycle].amount = numAmount;
  planDoc.pricing[billingCycle].currency =
    currency || planDoc.pricing[billingCycle].currency || "USD";
  planDoc.pricing[billingCycle].stripePriceId = newPrice.id;

  await planDoc.save();

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Plan price updated. Existing subscribers will be charged new price from next billing cycle.",
        { migratedCount, newPriceId: newPrice.id, oldPriceId }
      )
    );
});

/**
 * DELETE /admin/plans/:planKey
 * Soft delete (inactive). Safe behavior:
 * - Always mark plan inactive in DB
 * - If plan has active subscribers: DO NOT deactivate Stripe prices/product (avoid renewal issues)
 * - If no active subscribers: deactivate Stripe product/prices
 */
const deletePlan = asyncHandler(async (req, res, next) => {
  const planKey = String(req.params.planKey || "").toLowerCase();

  const planDoc = await Plan.findOne({ key: planKey });
  if (!planDoc) return next(new apiError(404, "Plan not found"));

  // mark inactive
  planDoc.pricing.status = "inactive";
  planDoc.archivedAt = new Date();
  await planDoc.save();

  // check if any active subscribers exist
  const activeSubCount = await User.countDocuments({
    "subscription.planKey": planKey,
    "subscription.status": { $in: ["active", "trialing", "past_due"] },
    "subscription.stripeSubscriptionId": { $ne: null },
  });

  const productId = planDoc.pricing?.stripeProductId;
  const monthlyPriceId = planDoc.pricing?.monthly?.stripePriceId;
  const yearlyPriceId = planDoc.pricing?.yearly?.stripePriceId;

  if (activeSubCount === 0) {
    if (monthlyPriceId)
      await stripe.prices.update(monthlyPriceId, { active: false });
    if (yearlyPriceId)
      await stripe.prices.update(yearlyPriceId, { active: false });
    if (productId) await stripe.products.update(productId, { active: false });
  }

  return res.status(200).json(
    new apiSuccess(200, "Plan deactivated", {
      planKey,
      activeSubCount,
      stripeDeactivated: activeSubCount === 0,
    })
  );
});

module.exports = {
  createPlan,
  listPlans,
  getPlan,
  updatePlan,
  syncPlanToStripe,
  adminUpdatePlanPrice,
  deletePlan,
};
