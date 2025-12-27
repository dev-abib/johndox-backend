const { user } = require("./src/Schema/user.schema");
const onlineUsers = new Map();

module.exports = function initSocket(io) {
  io.on("connection", async (socket) => {
    const userId = socket.userId; 
    console.log(`New connection: User ${userId} | Socket ID: ${socket.id}`);

    // if (!userId) {
    //   console.log("No userId found, disconnecting socket");
    //   socket.disconnect();
    //   return;
    // }

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, []);
    }
    onlineUsers.get(userId).push(socket.id);

    try {
      const user = await user.findByIdAndUpdate(
        userId,
        {
          isOnline: true,
          lastSeen: new Date(),
        },
        { new: true }
      );

      if (user) {
        socket.broadcast.emit("user-status-change", {
          _id: userId,
          isOnline: true,
          lastSeen: user.lastSeen,
          name: user.name,
          profilePicture: user.profilePicture,
        });

        const allUsers = await user.find(
          { _id: { $ne: userId } },
          "_id name profilePicture isOnline lastSeen"
        );
        socket.emit("initial-users", allUsers);
      }
    } catch (error) {
      console.error("Error updating user status:", error);
    }

    socket.on("disconnect", async (reason) => {
      console.log(`User ${userId} disconnected | Reason: ${reason}`);
      

      // Remove socket from online users
      if (onlineUsers.has(userId)) {
        const sockets = onlineUsers.get(userId);
        const index = sockets.indexOf(socket.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }

        if (sockets.length === 0) {
          onlineUsers.delete(userId);

          try {
            const user = await user.findByIdAndUpdate(
              userId,
              {
                isOnline: false,
                lastSeen: new Date(),
              },
              { new: true }
            );

            if (user) {
              io.emit("user-status-change", {
                _id: userId,
                isOnline: false,
                lastSeen: user.lastSeen,
                name: user.name,
                profilePicture: user.profilePicture,
              });

              console.log(`User ${userId} is now OFFLINE`);
            }
          } catch (error) {
            console.error("Error updating offline status:", error);
          }
        }
      }
    });

    socket.on("ping", (data) => {
      socket.emit("pong", { timestamp: Date.now(), ...data });
    });
  });
};
