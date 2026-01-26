const express = require("express");
const { authguard } = require("../../middleware/authGuard");

const { uploadMedia } = require("../../middleware/multer.middleware");
const { upsertContactHero, getContactUsHero } = require("../../Controller/contact.cms.controller");

const router = express.Router();

router
  .route("/upsert-contact-us-hero")
  .post(uploadMedia.single("bgImg"), upsertContactHero);

router.route("/get-contact-us-hero").get(getContactUsHero);


module.exports = router;