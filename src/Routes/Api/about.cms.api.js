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
  createBuyerSellerCommunitySection,
  updateBuyerSellerCommunitySection,
  deleteBuyerSellerCommunitySection,
  getAllBuyerSellerCommunitySections,
  getBuyerSellerCommunitySectionById,
  deleteFeatureItem,
  updateFeatureItem,
  addFeatureItem,
  updateSectionMetadata,
  getOrInitializeCommunity,
} = require("../../Controller/about.cms.controller");
const { createUpdateHowItWorks } = require("../../Controller/seller.cms.controller");

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


module.exports = router;