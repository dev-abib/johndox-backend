const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { chatUpload } = require("../../middleware/chat.upload.middleware");
const { validateChatMediaSizes } = require("../../middleware/validateChatMediaSizes");

const router = express.Router();






module.exports = router;
