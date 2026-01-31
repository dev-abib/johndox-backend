const express = require("express");
const { dashboardAnalytics, getSingleUser, userDirectory, sendMailToUser,  banUnbannedUser, getFavoritesListingById } = require("../../Controller/admin.cms.controller");

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

module.exports = router;
