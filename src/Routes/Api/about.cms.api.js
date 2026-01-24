const express = require("express");
const { authguard } = require("../../middleware/authGuard");

const { uploadMedia } = require("../../middleware/multer.middleware");
const {
  upsertAboutHero,
  getAboutHero,
} = require("../../Controller/about.cms.controller");

const router = express.Router();

router
  .route("/upsert-about-hero")
  .post(uploadMedia.single("bgImg"), upsertAboutHero);

router.route("/get-about-hero").get(getAboutHero);


module.exports = router;