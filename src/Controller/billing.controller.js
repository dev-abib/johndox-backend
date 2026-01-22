const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const { user: User } = require("../Schema/user.schema");
const { plan: Plan } = require("../Schema/subscription.schema");
const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");

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

  // ✅ block checkout for inactive plans
  if (plan.pricing?.status !== "active") {
    return next(new apiError(400, "This plan is inactive"));
  }

  const priceId =
    billingCycle === "yearly"
      ? plan.pricing?.yearly?.stripePriceId
      : plan.pricing?.monthly?.stripePriceId;

  if (!priceId)
    return next(new apiError(400, "Plan price not synced to Stripe"));

  // ✅ ensure subscription object exists
  if (!user.subscription) user.subscription = {};

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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/billing/success`,
    cancel_url: `${process.env.FRONTEND_URL}/billing/cancel`,
    metadata: {
      userId: String(user._id),
      planKey: plan.key,
      billingCycle,
    },
  });

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Checkout session created", { url: session.url })
    );
});

/**
 * POST /billing/webhook
 * IMPORTANT: must be express.raw({ type: "application/json" })
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

  try {
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
        });
      }
    }

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

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object;
      await User.updateOne(
        { "subscription.stripeSubscriptionId": invoice.subscription },
        { "subscription.status": "active" }
      );
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object;
      await User.updateOne(
        { "subscription.stripeSubscriptionId": invoice.subscription },
        { "subscription.status": "past_due" }
      );
    }

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

    return res.status(200).json(new apiSuccess(200, null, { received: true }));
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Webhook handler error", error: err.message });
  }
};

module.exports = { createCheckoutSession, stripeWebhook };
