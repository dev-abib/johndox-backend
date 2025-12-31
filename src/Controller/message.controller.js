const { Message } = require("../Schema/message.schema");
const { user } = require("../Schema/user.schema");
const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { getSocketInstance, getUserSocketMap } = require("../Utils/socket");
const redis = require("../Utils/redis");

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

  const io = getSocketInstance();
  const userSocketMap = getUserSocketMap();

  if (userSocketMap[receiverId]) {
    io.to(userSocketMap[receiverId]).emit("receive-message", messageToEmit);
    await Message.findByIdAndUpdate(savedMessage._id, { status: "delivered" });
  } else {
    redis.lpush(
      `user:${receiverId}:offlineMessages`,
      JSON.stringify(messageToEmit)
    );
  }

  if (userSocketMap[senderId]) {
    io.to(userSocketMap[senderId]).emit("receive-message", messageToEmit);
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "Message sent successfully", savedMessage));
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
    .populate("senderId", "firstName name")
    .sort({ createdAt: 1 });

  return res.json(
    new apiSuccess(200, "Messages retrieved successfully", messages)
  );
});

module.exports = { sendMessages, getMessage };
