const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { chatUpload } = require("../../middleware/chat.upload.middleware");
const {
  validateChatMediaSizes,
} = require("../../middleware/validateChatMediaSizes");
const { createCheckoutSession, stripeWebhook } = require("../../Controller/billing.controller");


const router = express.Router();

router.post("/checkout", authguard, createCheckoutSession);
router.get("/checkout/session/:sessionId", authguard, verifyCheckoutSession);

router.post("/portal", authguard, createCustomerPortalSession);

router.post("/cancel", authguard, cancelSubscription);
router.post("/resume", authguard, resumeSubscription);
router.post("/change-plan", authguard, changePlan);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);




module.exports = router;
