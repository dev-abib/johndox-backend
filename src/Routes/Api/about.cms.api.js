const express = require("express");
const { authguard } = require("../../middleware/authGuard");

const { uploadMedia } = require("../../middleware/multer.middleware");
const {
  upsertAboutHero,
  getAboutHero,
  crateUpdateCoreValueSection,
  addCoreValueItems,
  deleteCoreValueItems,
  updateCoreValueItems,
  getCoreValue,
  deleteFeatureItem,
  updateFeatureItem,
  addFeatureItem,
  updateSectionMetadata,
  getOrInitializeCommunity,
  deleteOurMissionFeatureItem,
  updateOurMissionFeatureItem,
  addOurMissionFeatureItem,
  updateOurMissionSectionDetails,
  getOurMissionSection,
  createOurMissionSection,
} = require("../../Controller/about.cms.controller");

const router = express.Router();

router
  .route("/upsert-about-hero")
  .post(uploadMedia.single("bgImg"), upsertAboutHero);

router.route("/get-about-hero").get(getAboutHero);

router.route("/upsert-core-value-cms").post(crateUpdateCoreValueSection);

// Add or Update Items in the Section
router
  .route("/add-core-value-items")
  .post(uploadMedia.single("iconImg"), addCoreValueItems);

// Delete an Item from the Section by itemId
router.route("/delete-core-value/:itemId").delete(deleteCoreValueItems);

// update items
router
  .route("/update-core-value-items/:itemId")
  .post(uploadMedia.single("iconImg"), updateCoreValueItems);

// Get the Section Data
router.route("/get-core-value-section").get(getCoreValue);

router.get("/community", getOrInitializeCommunity);

router.patch("/community/metadata", updateSectionMetadata);

router.post("/community/features", addFeatureItem);

router.patch("/community/features/:featureId", updateFeatureItem);

router.delete("/community/features/:featureId", deleteFeatureItem);


router.route("/get-our-mission-section").get(getOurMissionSection);

router
  .route("/our-mission")
  .post(uploadMedia.single("bgImg"), createOurMissionSection);

router
  .route("/our-mission")
  .patch(uploadMedia.single("bgImg"), updateOurMissionSectionDetails);

router.route("/our-mission/features").post(addOurMissionFeatureItem);

router
  .route("/our-mission/features/:featureId")
  .patch(updateOurMissionFeatureItem);

router
  .route("/our-mission/features/:featureId")
  .delete(deleteOurMissionFeatureItem);


module.exports = router;