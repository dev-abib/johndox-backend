const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { upsertSellerHero, getSellerHero } = require("../../Controller/seller.cms.controller");
const { uploadMedia } = require("../../middleware/multer.middleware");

const router = express.Router();

router
  .route("/upsert-sellers-hero")
  .post(uploadMedia.single("bgImg"), upsertSellerHero);

router.route("/get-sellers-hero").get(getSellerHero);



module.exports = router;
