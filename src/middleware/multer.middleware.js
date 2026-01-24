const multer = require("multer");

const uploadMedia = multer({
  storage: multer.memoryStorage(), // Files are stored in memory

  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB file size limit

  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = /jpeg|jpg|png|svg|mp4|mov|webm|mkv|quicktime|pdf/;

    const ext = file.originalname.split(".").pop().toLowerCase();
    const mimetype = file.mimetype.toLowerCase();

    // Check if the file type is allowed
    if (allowedTypes.test(ext) || allowedTypes.test(mimetype)) {
      return cb(null, true); // Accept the file
    }

    // Reject the file with a clear message
    cb(
      new Error("Invalid file type. Only images, videos, and PDFs are allowed.")
    );
  },
});

module.exports = { uploadMedia };
