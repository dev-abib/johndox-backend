const express = require("express");
const { authguard } = require("../../middleware/authGuard");
const { chatUpload } = require("../../middleware/chat.upload.middleware");
const { validateChatMediaSizes } = require("../../middleware/validateChatMediaSizes");
const { sendChatMessage, getConversations, getChatMessages, markConversationSeen } = require("../../Controller/message.controller");
const router = express.Router();




router.post(
  "/chat/send/:receiverId",
  authguard,
  chatUpload.single("file"),
  validateChatMediaSizes,
  sendChatMessage
);

router.get("/chat/conversations", authguard, getConversations);
router.get("/chat/messages/:chatUserId", authguard, getChatMessages);
router.patch("/chat/seen/:otherUserId", authguard, markConversationSeen);

module.exports = router;
