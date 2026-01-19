// routes/terms.and.conditions.routes.js
const express = require("express");
const {
  getTermsAndConditionsCms,
  upsertTermsAndConditionsCms,
  addSection,
  updateSectionById,
  deleteSectionById,
} = require("../../Controller/common.cms.controller");

const router = express.Router();

router.get("/get-terms-and-conditions", getTermsAndConditionsCms);

router.put("/upsert-terms-and-conditions", upsertTermsAndConditionsCms);

router.post("/add-terms-and-conditions-sections", addSection);

router.put("/update-terms-and-conditions/:sectionId", updateSectionById);

router.delete("/delete-terms-and-conditions/:sectionId", deleteSectionById);

module.exports = router;
