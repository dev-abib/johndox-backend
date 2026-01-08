const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { uploadMedia } = require("../../middleware/multer.middleware");

const {
  addProperty,
  getMyProperty,
  getAllproperties,
  getAllProperties,
  requestATour,
  toggleFavouriteListing,
  getMyFavouritesListing,
  createSavedSearch,
  getMySavedSearches,
  upsertPropertyHero,
  getPropertyHero,
} = require("../../Controller/property.controller");
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
router.route("/all-listings").get(getAllProperties);

// request a property tour
router.route("/request-a-tour").post(authguard, requestATour);

router
  .route("/toggle-favourite-listing/:propertyId")
  .post(authguard, toggleFavouriteListing);

router
  .route("/get-my-favourite-listing")
  .get(authguard, getMyFavouritesListing);

router.route("/saved-search").post(authguard, createSavedSearch);

router.route("/get-saved-search").get(authguard, getMySavedSearches);

router
  .route("/upsert-property-hero")
  .post(uploadMedia.single("bgImg"), upsertPropertyHero);

router.route("/get-property-hero").get(getPropertyHero);

module.exports = router;
