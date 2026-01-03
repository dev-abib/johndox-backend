const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { uploadMedia } = require("../../middleware/multer.middleware");

const { addProperty } = require("../../Controller/property.controller");
const { validateMediaSizes } = require("../../middleware/validate.media.sizes");

const { Router } = express;
const router = Router();

router.route("/add-new-property").post(
  authguard,
  uploadMedia.fields([
    { name: "photos", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  validateMediaSizes,
  addProperty
);

module.exports = router;
