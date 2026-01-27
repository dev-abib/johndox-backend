const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const {
  upsertSellerHero,
  getSellerHero,
  createUpdateWhySellWithUs,
  addWhyWhySellWithUsItems,
  deleteWhySellWithUsItem,
  updateWhySellWithUsItems,
  getWhySellWithUs,
  createUpdateHowItWorks,
  addHowItWorksItems,
  deleteHowItWorksItem,
  updateHowItWorksItems,
  getHowItWorks,
  upsertSellerSubFooter,
  getSellerSubFooter,
  getSellerStatic,
} = require("../../Controller/seller.cms.controller");
const { uploadMedia } = require("../../middleware/multer.middleware");

const router = express.Router();

router
  .route("/upsert-sellers-hero")
  .post(uploadMedia.single("bgImg"), upsertSellerHero);

router.route("/get-sellers-hero").get(getSellerHero);

router.route("/upsert-why-sell-with-us").post(createUpdateWhySellWithUs);

// Add or Update Items in the Section
router
  .route("/add-why-sell-with-us-featured-items")
  .post(uploadMedia.single("iconImg"), addWhyWhySellWithUsItems);

// Delete an Item from the Section by itemId
router
  .route("/delete-why-sell-with-us-featured-items/:itemId")
  .delete(deleteWhySellWithUsItem);

// update items

router
  .route("/update-why-sell-with-us-featured-items/:itemId")
  .post(uploadMedia.single("iconImg"), updateWhySellWithUsItems);

// Get the Section Data
router.route("/get-why-sell-with-us-section").get(getWhySellWithUs);

router.route("/upsert-how-it-works").post(createUpdateHowItWorks);

// Add or Update Items in the Section
router
  .route("/add-how-it-works-items")
  .post(uploadMedia.single("iconImg"), addHowItWorksItems);

// Delete an Item from the Section by itemId
router.route("/delete-how-it-works-items/:itemId").delete(deleteHowItWorksItem);

// update items

router
  .route("/update-how-it-works-items/:itemId")
  .post(uploadMedia.single("iconImg"), updateHowItWorksItems);

// Get the Section Data
router.route("/get-how-it-works-section").get(getHowItWorks);

router.post("/upsert-seller-sub-footer", upsertSellerSubFooter);

router.route("/get-seller-sub-footer").get(getSellerSubFooter);

router.route("/get-seller-statics").get(getSellerStatic);

module.exports = router;
