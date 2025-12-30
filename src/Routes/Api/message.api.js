// external dependencies
const express = require("express");
const { registerUserController } = require("../../Controller/user.controller");
const { uploadImages } = require("../../middleware/multer.middleware");
const { authguard } = require("../../middleware/authGuard");
const {
  sendMessages,
  getMessage,
} = require("../../Controller/message.controller");

// extracting router from express
const { Router } = express;
const router = Router();

//  send message
router.route("/send-message/:senderId/:receiverId").post(sendMessages);

//  get message
router.route("/get-message/:senderId/:receiverId").get(getMessage);

module.exports = router;
