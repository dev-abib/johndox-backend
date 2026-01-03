const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { uploadMedia } = require("../../middleware/multer.middleware");

const { addProperty, getMyProperty, getAllproperties } = require("../../Controller/property.controller");
const { validateMediaSizes } = require("../../middleware/validate.media.sizes");

const { Router } = express;
const router = Router();

// add new listing
router.route("/add-new-property").post(
  authguard,
  uploadMedia.fields([
    { name: "photos", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  validateMediaSizes,
  addProperty
);

// get my listing
router.route("/my-listings").get(authguard, getMyProperty);

// get all listing
router.route("/all-listings").get( getAllproperties);

module.exports = router;
