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

const sendChatMessage = asyncHandler(async (req, res, next) => {
  const decoded = await decodeSessionToken(req);
  const senderId = decoded?.userData?.userId;

  const { receiverId } = req.params;
  const { message, propertyId } = req.body;

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
    propertyId: propertyId || null,
  });

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

  // Update or create conversation
  const convUpdate = {
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
  };

  if (propertyId) {
    convUpdate.$set.propertyId = propertyId; // store the property
  }

  const conv = await Conversation.findOneAndUpdate(
    { participantsKey: key },
    convUpdate,
    { new: true, upsert: true }
  );

  // Ensure sender unread exists
  if (conv?.unreadCount?.get(senderId) == null) {
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
    propertyId: savedMessage.propertyId || null,
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

// ==================== Get Conversations ====================
const getConversations = asyncHandler(async (req, res, next) => {
  const decoded = await decodeSessionToken(req);
  const myId = decoded?.userData?.userId;

  if (!myId) {
    return next(new apiError(401, "Unauthorized", null, false));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const skip = (page - 1) * limit;

  // Fetch conversations
  const conversations = await Conversation.find({
    participants: myId,
  })
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "propertyId", 
      select: "title price location images", 
    })
    .lean();

  if (conversations.length === 0) {
    return res
      .status(200)
      .json(
        new apiSuccess(
          200,
          "No conversations found",
          { totalUnreadCount: 0, conversations: [], hasMore: false },
          false
        )
      );
  }

  const userIds = new Set();

  conversations.forEach((conv) => {
    conv.participants.forEach((p) => {
      if (String(p) !== String(myId)) userIds.add(String(p));
    });
    if (conv.lastMessageSender) {
      userIds.add(String(conv.lastMessageSender));
    }
  });

  const Users = await user
    .find({ _id: { $in: Array.from(userIds) } })
    .select("name firstName lastName profilePicture isOnline lastSeen role")
    .lean();

  const usersMap = {};
  Users.forEach((u) => {
    usersMap[String(u._id)] = u;
  });

  let totalUnreadCount = 0;

  const result = conversations.map((conv) => {
    const otherUserId = conv.participants.find(
      (p) => String(p) !== String(myId)
    );
    const otherUser = usersMap[String(otherUserId)] || null;
    const sender = conv.lastMessageSender
      ? usersMap[String(conv.lastMessageSender)] || null
      : null;

    const unreadCount = conv.unreadCount?.[String(myId)] ?? 0;
    totalUnreadCount += unreadCount;

    const isSentByMe = String(conv.lastMessageSender) === String(myId);

    let preview = conv.lastMessageText?.trim() || "";
    if (preview && isSentByMe) preview = `You: ${preview}`;
    if (!preview && conv.lastMessageType) {
      preview =
        conv.lastMessageType === "image"
          ? "📷 Photo"
          : conv.lastMessageType === "video"
            ? "🎥 Video"
            : conv.lastMessageType === "voice"
              ? "🎤 Voice"
              : "Message";
    }

    return {
      conversationId: conv._id.toString(),
      title:
        conv.title ||
        (otherUser
          ? otherUser.name ||
            `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
            "User"
          : "Chat"),
      otherUser: otherUser
        ? {
            id: otherUser._id.toString(),
            name:
              otherUser.name ||
              `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim(),
            profilePicture: otherUser.profilePicture,
            isOnline: !!otherUser.isOnline,
            lastSeen: otherUser.lastSeen,
            role: otherUser.role,
          }
        : null,
      unreadCount,
      hasUnread: unreadCount > 0,
      lastMessage: conv.lastMessageAt
        ? {
            id: conv.lastMessageId?.toString(),
            preview,
            type: conv.lastMessageType || "text",
            sentAt: conv.lastMessageAt,
            isSentByMe,
            sender: sender
              ? {
                  id: sender._id.toString(),
                  name: sender.name,
                  avatar: sender.profilePicture,
                }
              : null,
          }
        : null,
      property: conv.propertyId || null, 
      lastMessageAt: conv.lastMessageAt,
      updatedAt: conv.lastMessageAt,
    };
  });

  const hasMore = conversations.length === limit;

  return res.status(200).json(
    new apiSuccess(200, "Conversations retrieved", {
      totalUnreadCount,
      conversations: result,
      pagination: { page, limit, hasMore },
    })
  );
});

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
