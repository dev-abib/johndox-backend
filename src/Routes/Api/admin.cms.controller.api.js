const express = require("express");
const { dashboardAnalytics, getSingleUser, userDirectory } = require("../../Controller/admin.cms.controller");

const router = express.Router();

router.route("/get-dashboard-analytics").get(dashboardAnalytics);

// get user directory 
router.route("/get-user-directory").get(userDirectory);

// get single user
router.route("/get-user/:userId").get( getSingleUser);

module.exports = router;
