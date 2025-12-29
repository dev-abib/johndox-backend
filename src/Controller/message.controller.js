// src/Controller/message.controller.js
const { Message } = require("../Schema/message.schema");
const { user } = require("../Schema/user.schema");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");
const { getIo } = require("../Utils/socketInstance");
const redisClient = require("../Utils/redis");
const { isUserOnline, getUserSockets } = require("../Utils/users.status");

const sendMessages = asyncHandler(async (req, res, next) => {
  const { senderId, receiverId } = req.params;
  const { message, fileUrl, fileType } = req.body;

  if (!senderId || !receiverId) {
    return next(new apiError(400, "Sender and receiver IDs are required"));
  }

  const [sender, receiver] = await Promise.all([
    user.findById(senderId),
    user.findById(receiverId),
  ]);

  if (!sender) return next(new apiError(404, "Sender doesn't exist"));
  if (!receiver) return next(new apiError(404, "Receiver doesn't exist"));

  if (!message && !fileUrl) {
    return next(new apiError(400, "Send at least a message or file"));
  }

  const newMessage = new Message({
    senderId,
    receiverId,
    message: message || "",
    fileUrl: fileUrl || "",
    fileType: fileType || "",
  });

  const savedMessage = await newMessage.save();

  const io = getIo();

  const senderName = sender.firstName || sender.name || "User";

  const messageToEmit = {
    _id: savedMessage._id,
    senderId: senderId,
    receiverId: receiverId,
    message: savedMessage.message,
    fileUrl: savedMessage.fileUrl,
    fileType: savedMessage.fileType,
    createdAt: savedMessage.createdAt,
    senderName: senderName,
  };

  // Real-time delivery
  if (isUserOnline(receiverId)) {
    getUserSockets(receiverId).forEach((socketId) => {
      io.to(socketId).emit("receive-message", messageToEmit);
    });
  } else {
    // Offline → use lPush for correct order
    await redisClient
      .lPush(receiverId.toString(), JSON.stringify(messageToEmit))
      .catch(console.error);
  }

  // Send to sender too
  if (isUserOnline(senderId)) {
    getUserSockets(senderId).forEach((socketId) => {
      io.to(socketId).emit("receive-message", messageToEmit);
    });
  }

  // API response with senderName
  return res.status(200).json(
    new apiSuccess(
      200,
      "Message sent successfully",
      {
        ...savedMessage.toObject(),
        senderName,
      },
      true
    )
  );
});

const getMessage = asyncHandler(async (req, res, next) => {
  const { senderId, receiverId } = req.params;

  if (!senderId || !receiverId) {
    return next(new apiError(400, "Sender and receiver IDs are required"));
  }

  const messages = await Message.find({
    $or: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId },
    ],
  })
    .populate("senderId", "firstName name") // ← ADD THIS: populate sender info
    .sort({ createdAt: 1 });

  // Add senderName to each message for frontend consistency
  const formattedMessages = messages.map((msg) => ({
    ...msg.toObject(),
    senderName: msg.senderId?.firstName || msg.senderId?.name || "User",
  }));

  return res.json(
    new apiSuccess(
      200,
      "Messages retrieved successfully",
      formattedMessages,
      true
    )
  );
});

module.exports = { sendMessages, getMessage };
