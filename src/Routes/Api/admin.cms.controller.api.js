const express = require("express");
const { dashboardAnalytics } = require("../../Controller/admin.cms.controller");

const router = express.Router();

router.route("/get-dashboard-analytics").get(dashboardAnalytics);

module.exports = router;
