const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { chatUpload } = require("../../middleware/chat.upload.middleware");
const {
  validateChatMediaSizes,
} = require("../../middleware/validateChatMediaSizes");
const { createCheckoutSession, stripeWebhook } = require("../../Controller/billing.controller");


const router = express.Router();

router.route("/checkout").post(createCheckoutSession);

router
  .route("/webhook")
  .post(express.raw({ type: "application/json" }), stripeWebhook);



module.exports = router;
