const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { chatUpload } = require("../../middleware/chat.upload.middleware");
const {
  validateChatMediaSizes,
} = require("../../middleware/validateChatMediaSizes");
const {
  upsertPricingPageCms,
  getPricingPageCms,
  addFaq,
  updateFaq,
  deleteFaq,
  getFaqs,
} = require("../../Controller/pricing.controller");
const {
  createPlan,
  listPlans,
  getPlan,
  updatePlan,
  syncPlanToStripe,
  adminUpdatePlanPrice,
  deletePlan,
} = require("../../Controller/admin.subscription.plan");

const router = express.Router();

router.route("/upsert-pricing-page-cms").post(upsertPricingPageCms);

router.route("/get-pricing-page-cms").get(getPricingPageCms);

router.route("/add-faq").post(addFaq);

router.route("/update-faq/:faqId").put(updateFaq);

router.route("/delete-faq/:faqId").delete(deleteFaq);

router.route("/get-faq").get(getFaqs);

router.route("/add-plan").post(createPlan);

router.route("/get-all-plan").get(listPlans);

router.route("/get-single-plan/:planKey").get(getPlan);

router.put("/update-plan/:planKey").put(updatePlan);

router.route("/sync-plan/:planKey").post(syncPlanToStripe);

router.route("/update-plan-price/:planKey").post(adminUpdatePlanPrice);

router.route("delete-plan:/planKey").delete(deletePlan);

module.exports = router;
