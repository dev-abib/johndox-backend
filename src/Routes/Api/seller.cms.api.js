const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { upsertSellerHero, getSellerHero, createUpdateWhySellWithUs, addWhyWhySellWithUsItems, deleteWhySellWithUsItem, updateWhySellWithUsItems, getWhySellWithUs } = require("../../Controller/seller.cms.controller");
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



module.exports = router;
