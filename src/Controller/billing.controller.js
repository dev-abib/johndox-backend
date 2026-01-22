// src/Controller/billing.controller.js

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const { user: User } = require("../Schema/user.schema");
const { plan: Plan } = require("../Schema/subscription.schema");
const { StripeEvent } = require("../Schema/strip.event.schema");

const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { Payment } = require("../Schema/stripe.payment.schema");

/** Helpers */
const toDateFromUnix = (unixSeconds) =>
  unixSeconds ? new Date(unixSeconds * 1000) : null;

const getPriceIdForPlan = (plan, billingCycle) => {
  return billingCycle === "yearly"
    ? plan?.pricing?.yearly?.stripePriceId
    : plan?.pricing?.monthly?.stripePriceId;
};

// Save invoice to Payment collection for dashboard revenue
const upsertPaymentFromInvoice = async (invoice) => {
  try {
    const u = await User.findOne({
      "subscription.stripeSubscriptionId": invoice.subscription,
    }).select("_id subscription");

    if (!u) return;

    const paidUnix = invoice.status_transitions?.paid_at || invoice.created; // unix seconds

    await Payment.updateOne(
      { stripeInvoiceId: invoice.id },
      {
        $setOnInsert: {
          stripeInvoiceId: invoice.id,
          stripeSubscriptionId: invoice.subscription,
          userId: u._id,
          amount: (invoice.amount_paid || 0) / 100, // cents -> dollars
          currency: invoice.currency || "usd",
          billingCycle: u.subscription?.billingCycle || "monthly",
          planKey: u.subscription?.planKey || null,
          paidAt: new Date(paidUnix * 1000),
        },
      },
      { upsert: true }
    );
  } catch (e) {
    // Do not crash webhook flow for payment logging
    console.error("Payment upsert error:", e.message);
  }
};

/**
 * POST /billing/checkout
 * body: { planKey, billingCycle }
 */
const createCheckoutSession = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const { planKey, billingCycle } = req.body;

  if (!userId) return next(new apiError(401, "Unauthorized"));
  if (!planKey) return next(new apiError(400, "planKey is required"));
  if (!["monthly", "yearly"].includes(billingCycle)) {
    return next(new apiError(400, "billingCycle must be monthly or yearly"));
  }

  const user = await User.findById(userId);
  if (!user) return next(new apiError(404, "User not found"));

  const plan = await Plan.findOne({ key: String(planKey).toLowerCase() });
  if (!plan) return next(new apiError(404, "Plan not found"));

  if (plan.pricing?.status !== "active") {
    return next(new apiError(400, "This plan is inactive"));
  }

  // ✅ Free plan -> no Stripe checkout needed
  if (plan.isFree) {
    user.subscription = user.subscription || {};
    user.subscription.planKey = plan.key;
    user.subscription.billingCycle = billingCycle;
    user.subscription.status = "active";
    user.subscription.stripeSubscriptionId = null;
    user.subscription.currentPeriodEnd = null;
    user.subscription.activatedAt = new Date();
    await user.save();

    return res.status(200).json(
      new apiSuccess(200, "Free plan activated", {
        mode: "free",
        redirectUrl: `${process.env.FRONTEND_URL}/billing/success?free=1`,
      })
    );
  }

  const priceId = getPriceIdForPlan(plan, billingCycle);
  if (!priceId)
    return next(new apiError(400, "Plan price not synced to Stripe"));

  user.subscription = user.subscription || {};

  // ✅ Create Stripe customer if missing
  let customerId = user.subscription.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      metadata: { userId: String(user._id) },
    });
    customerId = customer.id;
    user.subscription.stripeCustomerId = customerId;
    await user.save();
  }

  // ✅ Block checkout if user already has a subscription
  if (
    user.subscription.stripeSubscriptionId &&
    ["active", "trialing", "past_due"].includes(user.subscription.status)
  ) {
    return next(
      new apiError(
        400,
        "You already have a subscription. Use change-plan instead."
      )
    );
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],

    success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/billing/cancel?session_id={CHECKOUT_SESSION_ID}`,

    subscription_data:
      plan.trialDays > 0 ? { trial_period_days: plan.trialDays } : undefined,

    metadata: {
      userId: String(user._id),
      planKey: plan.key,
      billingCycle,
    },
  });

  return res.status(200).json(
    new apiSuccess(200, "Checkout session created", {
      url: session.url,
      sessionId: session.id,
    })
  );
});

/**
 * GET /billing/checkout/session/:sessionId
 * Used by frontend on success page to confirm payment.
 */
const verifyCheckoutSession = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const { sessionId } = req.params;

  if (!userId) return next(new apiError(401, "Unauthorized"));
  if (!sessionId) return next(new apiError(400, "sessionId is required"));

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "payment_intent"],
  });

  // ✅ Ensure session belongs to this user
  const metaUserId = session.metadata?.userId;
  if (String(metaUserId) !== String(userId)) {
    return next(new apiError(403, "Forbidden (session mismatch)"));
  }

  return res.status(200).json(
    new apiSuccess(200, "Session fetched", {
      payment_status: session.payment_status,
      status: session.status,
      subscription: session.subscription
        ? {
            id: session.subscription.id,
            status: session.subscription.status,
            current_period_end: session.subscription.current_period_end,
          }
        : null,
    })
  );
});

/**
 * POST /billing/portal
 * Create Stripe customer portal session to manage payment methods/cancel/invoices
 */
const createCustomerPortalSession = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) return next(new apiError(401, "Unauthorized"));

  const user = await User.findById(userId);
  if (!user) return next(new apiError(404, "User not found"));

  const customerId = user.subscription?.stripeCustomerId;
  if (!customerId) return next(new apiError(400, "Stripe customer not found"));

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/billing`,
  });

  return res
    .status(200)
    .json(new apiSuccess(200, "Portal session created", { url: portal.url }));
});

/**
 * GET /billing/me
 * fetch current subscription info from DB
 */
const getMySubscription = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) return next(new apiError(401, "Unauthorized"));

  const user = await User.findById(userId).select(
    "subscription email firstName lastName"
  );
  if (!user) return next(new apiError(404, "User not found"));

  const plan = await Plan.findOne({
    key: user.subscription?.planKey || "starter",
  });

  return res.status(200).json(
    new apiSuccess(200, "Subscription fetched", {
      subscription: user.subscription || null,
      plan: plan || null,
    })
  );
});

/**
 * POST /billing/cancel
 * Cancels Stripe subscription at period end (recommended) or immediately
 * body: { immediately?: boolean }
 */
const cancelSubscription = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const { immediately = false } = req.body || {};

  if (!userId) return next(new apiError(401, "Unauthorized"));

  const user = await User.findById(userId);
  if (!user) return next(new apiError(404, "User not found"));

  const subId = user.subscription?.stripeSubscriptionId;
  if (!subId) return next(new apiError(400, "No active Stripe subscription"));

  let updated;

  if (immediately) {
    updated = await stripe.subscriptions.cancel(subId);
  } else {
    updated = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    });
  }

  user.subscription.status = updated.status;
  user.subscription.currentPeriodEnd = updated.current_period_end;
  await user.save();

  return res.status(200).json(
    new apiSuccess(200, "Subscription cancel updated", {
      cancel_at_period_end: updated.cancel_at_period_end,
      status: updated.status,
      currentPeriodEnd: updated.current_period_end,
    })
  );
});

/**
 * POST /billing/resume
 * Resumes if cancel_at_period_end = true (before period ends)
 */
const resumeSubscription = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  if (!userId) return next(new apiError(401, "Unauthorized"));

  const user = await User.findById(userId);
  if (!user) return next(new apiError(404, "User not found"));

  const subId = user.subscription?.stripeSubscriptionId;
  if (!subId) return next(new apiError(400, "No Stripe subscription found"));

  const updated = await stripe.subscriptions.update(subId, {
    cancel_at_period_end: false,
  });

  user.subscription.status = updated.status;
  user.subscription.currentPeriodEnd = updated.current_period_end;
  await user.save();

  return res.status(200).json(
    new apiSuccess(200, "Subscription resumed", {
      status: updated.status,
      currentPeriodEnd: updated.current_period_end,
    })
  );
});

/**
 * POST /billing/change-plan
 * body: { planKey, billingCycle, prorationBehavior?: "create_prorations"|"none" }
 */
const changePlan = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const { planKey, billingCycle, prorationBehavior = "none" } = req.body;

  if (!userId) return next(new apiError(401, "Unauthorized"));
  if (!planKey) return next(new apiError(400, "planKey is required"));
  if (!["monthly", "yearly"].includes(billingCycle)) {
    return next(new apiError(400, "billingCycle must be monthly or yearly"));
  }

  const user = await User.findById(userId);
  if (!user) return next(new apiError(404, "User not found"));

  const plan = await Plan.findOne({ key: String(planKey).toLowerCase() });
  if (!plan) return next(new apiError(404, "Plan not found"));
  if (plan.pricing?.status !== "active") {
    return next(new apiError(400, "This plan is inactive"));
  }

  // ✅ Free plan change: cancel Stripe sub at period end + activate free locally
  if (plan.isFree) {
    if (user.subscription?.stripeSubscriptionId) {
      await stripe.subscriptions.update(
        user.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );
    }

    user.subscription.planKey = plan.key;
    user.subscription.billingCycle = billingCycle;
    user.subscription.status = "active";
    await user.save();

    return res
      .status(200)
      .json(
        new apiSuccess(200, "Switched to free plan", { planKey: plan.key })
      );
  }

  const priceId = getPriceIdForPlan(plan, billingCycle);
  if (!priceId)
    return next(new apiError(400, "Plan price not synced to Stripe"));

  const subId = user.subscription?.stripeSubscriptionId;
  if (!subId)
    return next(
      new apiError(400, "No active Stripe subscription (use checkout)")
    );

  const sub = await stripe.subscriptions.retrieve(subId);

  // ✅ SAFEST for single-plan subscription: update first item
  const item = sub.items?.data?.[0];
  if (!item?.id) return next(new apiError(400, "Subscription item not found"));

  const updated = await stripe.subscriptions.update(subId, {
    items: [{ id: item.id, price: priceId }],
    proration_behavior: prorationBehavior, // "none" recommended
  });

  user.subscription.planKey = plan.key;
  user.subscription.billingCycle = billingCycle;
  user.subscription.status = updated.status;
  user.subscription.currentPeriodEnd = updated.current_period_end;
  await user.save();

  return res.status(200).json(
    new apiSuccess(200, "Plan changed successfully", {
      planKey: plan.key,
      status: updated.status,
      currentPeriodEnd: updated.current_period_end,
    })
  );
});

/**
 * POST /billing/webhook
 * IMPORTANT: use express.raw({type:"application/json"})
 */
const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Idempotency guard
  try {
    const already = await StripeEvent.findOne({ eventId: event.id });
    if (already) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    await StripeEvent.create({ eventId: event.id, type: event.type });
  } catch (e) {
    if (String(e.message || "").includes("duplicate key")) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    return res.status(500).json({
      message: "StripeEvent save error",
      error: e.message,
    });
  }

  try {
    // 1) Checkout completed -> write subscription info
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const planKey = session.metadata?.planKey;
      const billingCycle = session.metadata?.billingCycle;

      const subscriptionId = session.subscription;
      if (userId && subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        await User.findByIdAndUpdate(userId, {
          "subscription.planKey": String(planKey).toLowerCase(),
          "subscription.billingCycle": billingCycle,
          "subscription.status": sub.status,
          "subscription.stripeSubscriptionId": sub.id,
          "subscription.currentPeriodEnd": sub.current_period_end,
          "subscription.activatedAt": new Date(), // ✅ for dashboard growth
        });
      }
    }

    // 2) Subscription updated
    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      await User.updateOne(
        { "subscription.stripeSubscriptionId": sub.id },
        {
          "subscription.status": sub.status,
          "subscription.currentPeriodEnd": sub.current_period_end,
        }
      );
    }

    // 3) Subscription deleted
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      await User.updateOne(
        { "subscription.stripeSubscriptionId": sub.id },
        {
          "subscription.status": "canceled",
          "subscription.currentPeriodEnd": sub.current_period_end,
        }
      );
    }

    // 4) Invoice succeeded -> active + store revenue
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;

      await upsertPaymentFromInvoice(invoice);

      await User.updateOne(
        { "subscription.stripeSubscriptionId": invoice.subscription },
        { "subscription.status": "active" }
      );
    }

    // 5) Invoice failed -> past_due
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      await User.updateOne(
        { "subscription.stripeSubscriptionId": invoice.subscription },
        { "subscription.status": "past_due" }
      );
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    return res.status(500).json({
      message: "Webhook handler error",
      error: err.message,
    });
  }
};

module.exports = {
  createCheckoutSession,
  verifyCheckoutSession,
  createCustomerPortalSession,
  getMySubscription,
  cancelSubscription,
  resumeSubscription,
  changePlan,
  stripeWebhook,
};
