const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const {
  updateSection,
  deleteSection,
  getTermsAndConditionsCms,
  addTermsAndConditionsCms,
} = require("../../Controller/common.cms.controller");
const router = express.Router();

router.route("/upsert-terms-and-conditions").post(addTermsAndConditionsCms);

router.route("/update-section/:title").put(updateSection);

router.route("/delete-section/:title").delete(deleteSection);

router.route("/get-terms-and-conditions").get(getTermsAndConditionsCms);

module.exports = router;
