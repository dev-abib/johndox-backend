const { apiError } = require("../Utils/api.error");

const validateChatMediaSizes = (req, res, next) => {
  // if no file -> ok
  if (!req.file) return next();

  const mimetype = (req.file.mimetype || "").toLowerCase();

  // Example size rules (adjust as you want)
  const size = req.file.size || 0;

  // images: max 10MB
  if (mimetype.startsWith("image/") && size > 10 * 1024 * 1024) {
    return next(new apiError(400, "Image size must be <= 10MB"));
  }

  // videos: max 100MB (multer already)
  if (mimetype.startsWith("video/") && size > 100 * 1024 * 1024) {
    return next(new apiError(400, "Video size must be <= 100MB"));
  }

  // pdf: max 20MB
  if (mimetype === "application/pdf" && size > 20 * 1024 * 1024) {
    return next(new apiError(400, "PDF size must be <= 20MB"));
  }

  next();
};

module.exports = { validateChatMediaSizes };
