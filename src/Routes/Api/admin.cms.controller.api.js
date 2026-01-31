const express = require("express");
const {
  dashboardAnalytics,
  getSingleUser,
  userDirectory,
  sendMailToUser,
  banUnbannedUser,
  getFavoritesListingById,
  upsertAmenity,
  getAllAmenities,
  deleteAmenity,
} = require("../../Controller/admin.cms.controller");

const router = express.Router();

router.route("/get-dashboard-analytics").get(dashboardAnalytics);

// get user directory
router.route("/get-user-directory").get(userDirectory);

// get single user
router.route("/get-user/:userId").get(getSingleUser);

// send admin mail
router.route("/send-mail-to-user/:userId").post(sendMailToUser);

// ban user
router.route("/ban-unbanned-user/:userId").post(banUnbannedUser);

// get favorite listing by user id
router
  .route("/get-favorite-listing-by-id/:userId")
  .get(getFavoritesListingById);

// upsert amenities
router.route("/upsert-amenities").post(upsertAmenity);

// get all amenities
router.route("/get-all-amenities").get(getAllAmenities);

// delete amenities
router.route("/delete-amenities/:name").delete(deleteAmenity);

module.exports = router;
