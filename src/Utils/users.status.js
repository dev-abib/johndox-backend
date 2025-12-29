// src/Utils/users.status.js
const onlineUsers = new Map(); // userId → Set<socketId>

const addUser = (userId, socketId) => {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
};

const removeUser = (userId, socketId) => {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }
};

const isUserOnline = (userId) =>
  onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;

const getUserSockets = (userId) => Array.from(onlineUsers.get(userId) || []);

module.exports = {
  addUser,
  removeUser,
  isUserOnline,
  getUserSockets,
  onlineUsers, 
};
