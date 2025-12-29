let ioInstance = null;

exports.setIo = (io) => {
  ioInstance = io;
};

exports.getIo = () => {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
};
