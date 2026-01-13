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
  setFeaturedProperties,
  getFeaturedProperties,
  upsertFeaturedSection,
  featuredSectionCms,
  upsertCategory,
  getCategorySection,
  deleteCategory,
  createServiceSection,
  getSectionData,
  deleteItemFromSection,
  updateItemsInSection,
  createOrUpdateSection,
  addOrUpdateItems,
  upsertListPropertySection,
  getListPropertySections,
  loanEstimator,
  updateProperty,
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

// update property details
router.route("/update-property/:propertyId").put(
  authguard,
  uploadMedia.fields([
    { name: "photos", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]), 
  validateMediaSizes, 
  updateProperty 
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

router.route("/set-feature-properties").post(setFeaturedProperties);

router.route("/get-featured-properties").get(getFeaturedProperties);

router.route("/add-category").post(uploadMedia.single("bgImg"), upsertCategory);

router
  .route("/update-category/:categoryId")
  .post(uploadMedia.single("bgImg"), upsertCategory);

router.route("/get-category-section").get(getCategorySection);

router.route("/delete-category/:categoryId").delete(deleteCategory);

router.route("/create-or-update-section").post(createOrUpdateSection);

// Add or Update Items in the Section
router.route("/add-or-update-items").post(addOrUpdateItems);

// Delete an Item from the Section by itemId
router.route("/delete-item/:itemId").delete(deleteItemFromSection);

// Get the Section Data
router.route("/section-service-section").get(getSectionData);

router.post("/upsert-list-property-section", upsertListPropertySection);

router.route("/list-property-sections").get(getListPropertySections);

router.route("/price-estimator").post(loanEstimator);

module.exports = router;
