const express = require("express");
const { dashboardAnalytics, getSingleUser, userDirectory, sendMailToUser,  banUnbannedUser } = require("../../Controller/admin.cms.controller");

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


module.exports = router;
