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

router.post("/add-plan", createPlan);

router.get("/get-all-plan", listPlans);

router.get("/get-single-plan/:planKey", getPlan);

router.put("/update-plan/:planKey", updatePlan);

router.post("/sync-plan/:planKey", syncPlanToStripe);

router.post("/update-plan-price/:planKey", adminUpdatePlanPrice);

router.delete("/delete-plan/:planKey", deletePlan);


module.exports = router;
