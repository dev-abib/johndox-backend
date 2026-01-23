const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { chatUpload } = require("../../middleware/chat.upload.middleware");
const {
  validateChatMediaSizes,
} = require("../../middleware/validateChatMediaSizes");
const {
  createCheckoutSession,
  resumeSubscription,
  changePlan,
  cancelSubscription,
  createCustomerPortalSession,
  verifyCheckoutSession,
  getMySubscription,
} = require("../../Controller/billing.controller");

const router = express.Router();

router.post("/checkout", authguard, createCheckoutSession);
router.get("/checkout/session/:sessionId", authguard, verifyCheckoutSession);

router.post("/portal", authguard, createCustomerPortalSession);

router.post("/cancel", authguard, cancelSubscription);
router.post("/resume", authguard, resumeSubscription);
router.post("/change-plan", authguard, changePlan);
router.route("/billing/me").get(authguard, getMySubscription);

module.exports = router;
