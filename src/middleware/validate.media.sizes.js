const { apiError } = require("../Utils/api.error");


const validateMediaSizes = (req, res, next) => {
  if (!req.files) return next();

  const files = Object.values(req.files).flat(); // flatten

  for (const file of files) {
    const sizeMB = file.size / (1024 * 1024);
    const mimetype = file.mimetype.toLowerCase();

    // image rule
    if (mimetype.startsWith("image/") && sizeMB > 5) {
      return next(
        new apiError(
          400,
          `Image "${file.originalname}" exceeds 5MB limit`,
          null,
          false
        )
      );
    }

    // video rule
    if (mimetype.startsWith("video/") && sizeMB > 100) {
      return next(
        new apiError(
          400,
          `Video "${file.originalname}" exceeds 100MB limit`,
          null,
          false
        )
      );
    }

    // pdf rule (optional)
    if (mimetype === "application/pdf" && sizeMB > 10) {
      return next(
        new apiError(
          400,
          `PDF "${file.originalname}" exceeds 10MB limit`,
          null,
          false
        )
      );
    }
  }

  next();
};

module.exports = { validateMediaSizes };
