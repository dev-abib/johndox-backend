const mongoose = require("mongoose");
const { Message } = require("../Schema/message.schema");
const { Conversation } = require("../Schema/conversation.schema");
const { user } = require("../Schema/user.schema");
const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const redis = require("../Utils/redis");
const { getUserSocket } = require("../Utils/socketStore");
const { getSocketInstance } = require("../Utils/socket");
const { decodeSessionToken } = require("../Helpers/helper");
const { uploadCloudinary } = require("../Helpers/uploadCloudinary");

const offlineListKey = (userId) => `user:${userId}:offlineMessageIds`;

const buildParticipantsKey = (a, b) => {
  const [x, y] = [String(a), String(b)].sort();
  return `${x}_${y}`;
};

const detectFileType = (mimetype) => {
  if (!mimetype) return "";
  const mt = mimetype.toLowerCase();
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("video/")) return "video";
  if (mt === "application/pdf") return "pdf";
  return "";
};

const getLastMessageType = (text, fileType) => {
  if (text && fileType) return "mixed";
  if (fileType) return fileType;
  if (text) return "text";
  return "";
};

// POST /api/chat/send/:receiverId (multipart: message, file)
const sendChatMessage = asyncHandler(async (req, res, next) => {
  const decoded = await decodeSessionToken(req);
  const senderId = decoded?.userData?.userId;

  const { receiverId } = req.params;
  const { message } = req.body;

  if (!senderId) return next(new apiError(401, "Unauthorized", null, false));
  if (!receiverId)
    return next(new apiError(400, "Receiver ID is required", null, false));
  if (String(senderId) === String(receiverId))
    return next(new apiError(400, "You cannot message yourself", null, false));

  const [sender, receiver] = await Promise.all([
    user.findById(senderId),
    user.findById(receiverId),
  ]);

  if (!sender)
    return next(new apiError(404, "Sender doesn't exist", null, false));
  if (!receiver)
    return next(new apiError(404, "Receiver doesn't exist", null, false));

  if (!message && !req.file) {
    return next(
      new apiError(400, "Send at least a message or file", null, false)
    );
  }

  let fileUrl = "";
  let fileType = "";

  if (req.file) {
    fileType = detectFileType(req.file.mimetype);

    const folder =
      fileType === "image"
        ? "chat/media/images"
        : fileType === "video"
        ? "chat/media/videos"
        : "chat/media/pdfs";

    const result = await uploadCloudinary(req.file.buffer, folder, "auto");
    if (!result?.secure_url) {
      return next(
        new apiError(500, "Failed to upload attachment", null, false)
      );
    }
    fileUrl = result.secure_url;
  }

  const savedMessage = await Message.create({
    senderId,
    receiverId,
    message: message || "",
    fileUrl,
    fileType,
    status: "pending",
  });

  // Update conversation (fast list)
  const key = buildParticipantsKey(senderId, receiverId);
  const now = new Date();

  const lastText =
    (message && message.trim()) ||
    (fileType === "image"
      ? "📷 Photo"
      : fileType === "video"
      ? "🎥 Video"
      : fileType === "pdf"
      ? "📄 PDF"
      : "");

  const lastType = getLastMessageType(message, fileType);

  // ✅ FIXED: remove unreadCount: {} from $setOnInsert
  const conv = await Conversation.findOneAndUpdate(
    { participantsKey: key },
    {
      $setOnInsert: {
        participants: [senderId, receiverId],
        participantsKey: key,
      },
      $set: {
        lastMessageId: savedMessage._id,
        lastMessageText: lastText,
        lastMessageType: lastType,
        lastMessageAt: now,
      },
      $inc: {
        [`unreadCount.${receiverId}`]: 1,
      },
    },
    { new: true, upsert: true }
  );

  // ✅ Ensure sender unread exists (optional)
  const senderUnread = conv?.unreadCount?.get
    ? conv.unreadCount.get(String(senderId))
    : conv?.unreadCount?.[String(senderId)];

  if (senderUnread == null) {
    await Conversation.updateOne(
      { _id: conv._id },
      { $set: { [`unreadCount.${senderId}`]: 0 } }
    );
  }

  const senderName = sender.firstName || sender.name || "User";

  const emitPayload = {
    _id: savedMessage._id,
    senderId: String(senderId),
    receiverId: String(receiverId),
    message: savedMessage.message,
    fileUrl: savedMessage.fileUrl,
    fileType: savedMessage.fileType,
    status: savedMessage.status,
    createdAt: savedMessage.createdAt,
    senderName,
  };

  const io = getSocketInstance();

  const receiverSocket = await getUserSocket(String(receiverId));
  if (receiverSocket) {
    io.to(receiverSocket).emit("receive-message", emitPayload);

    await Message.findByIdAndUpdate(savedMessage._id, {
      status: "delivered",
      deliveredAt: new Date(),
    });

    const senderSocket = await getUserSocket(String(senderId));
    if (senderSocket) {
      io.to(senderSocket).emit("message-delivered", {
        messageId: savedMessage._id,
      });
    }
  } else {
    await redis.lpush(offlineListKey(receiverId), String(savedMessage._id));
  }

  const senderSocket = await getUserSocket(String(senderId));
  if (senderSocket) {
    io.to(senderSocket).emit("receive-message", emitPayload);
  }

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Message sent successfully", savedMessage, false)
    );
});

// GET /api/chat/conversations
const getConversations = asyncHandler(async (req, res, next) => {
  const decoded = await decodeSessionToken(req);
  const myId = decoded?.userData?.userId;

  if (!myId) return next(new apiError(401, "Unauthorized", null, false));

  const conversations = await Conversation.find({ participants: myId })
    .sort({ lastMessageAt: -1 })
    .lean();

  const result = [];
  for (const conv of conversations) {
    const otherUserId = conv.participants.find(
      (p) => String(p) !== String(myId)
    );

    const other = await user
      .findById(otherUserId)
      .select("firstName lastName name profilePicture isOnline lastSeen role")
      .lean();

    result.push({
      conversationId: conv._id,
      otherUser: other,
      unreadCount: conv.unreadCount?.[String(myId)] ?? 0,
      lastMessageAt: conv.lastMessageAt,
      lastMessage: {
        _id: conv.lastMessageId,
        text: conv.lastMessageText,
        type: conv.lastMessageType,
      },
    });
  }

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Conversations retrieved successfully", result, false)
    );
});

// Cursor pagination:
// GET /api/chat/messages/:otherUserId?cursor=<ISO_DATE>&limit=30
const getChatMessages = asyncHandler(async (req, res, next) => {
  const decoded = await decodeSessionToken(req);
  const myId = decoded?.userData?.userId;

  const { otherUserId } = req.params;
  const limit = Math.min(Math.max(Number(req.query.limit || 30), 1), 100);

  if (!myId) return next(new apiError(401, "Unauthorized", null, false));
  if (!otherUserId)
    return next(new apiError(400, "Other user ID is required", null, false));

  let cursorDate = null;
  if (req.query.cursor) {
    const d = new Date(req.query.cursor);
    if (!Number.isNaN(d.getTime())) cursorDate = d;
  }

  const filter = {
    $or: [
      { senderId: myId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: myId },
    ],
  };

  if (cursorDate) filter.createdAt = { $lt: cursorDate };

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  messages.reverse();

  const nextCursor = messages.length ? messages[0].createdAt : null;

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Messages retrieved successfully",
        { messages, nextCursor },
        false
      )
    );
});

// PATCH /api/chat/seen/:otherUserId
const markConversationSeen = asyncHandler(async (req, res, next) => {
  const decoded = await decodeSessionToken(req);
  const myId = decoded?.userData?.userId;
  const { otherUserId } = req.params;

  if (!myId) return next(new apiError(401, "Unauthorized", null, false));
  if (!otherUserId)
    return next(new apiError(400, "Other user ID is required", null, false));

  await Message.updateMany(
    { senderId: otherUserId, receiverId: myId, status: { $ne: "seen" } },
    { $set: { status: "seen", seenAt: new Date() } }
  );

  const key = buildParticipantsKey(myId, otherUserId);
  await Conversation.updateOne(
    { participantsKey: key },
    { $set: { [`unreadCount.${myId}`]: 0 } }
  );

  const io = getSocketInstance();
  const senderSocket = await getUserSocket(String(otherUserId));
  if (senderSocket) {
    io.to(senderSocket).emit("conversation-seen", { by: String(myId) });
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "Conversation marked as seen", null, false));
});

module.exports = {
  sendChatMessage,
  getConversations,
  getChatMessages,
  markConversationSeen,
};
