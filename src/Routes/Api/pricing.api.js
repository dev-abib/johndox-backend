const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { chatUpload } = require("../../middleware/chat.upload.middleware");
const {
  validateChatMediaSizes,
} = require("../../middleware/validateChatMediaSizes");
const {
  upsertPricingPageCms,
  getPricingPageCms,
} = require("../../Controller/pricing.controller");

const router = express.Router();

router.route("/upsert-pricing-page-cms").post(upsertPricingPageCms);

router.route("/get-pricing-page-cms").get(getPricingPageCms);

module.exports = router;
