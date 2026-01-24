// middleware/multer.middleware.js
const multer = require("multer");

const uploadMedia = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 100 * 1024 * 1024 }, 

  fileFilter: (req, file, cb) => {
    const imageTypes = /jpeg|jpg|png|svg/;
    const videoTypes = /mp4|mov|webm|mkv|quicktime/;
    const pdfTypes = /pdf/;

    const ext = file.originalname.split(".").pop().toLowerCase();
    const mimetype = file.mimetype.toLowerCase();

    const isImage = imageTypes.test(ext) || mimetype.startsWith("image/");

    const isVideo = videoTypes.test(ext) || mimetype.startsWith("video/");

    const isPdf = pdfTypes.test(ext) || mimetype === "application/pdf";

    if (isImage || isVideo || isPdf) {
      return cb(null, true);
    }

    return cb(
      new Error(
        "Only image (jpeg, jpg, png, svg), video (mp4, mov, webm, mkv) and PDF files are allowed!"
      )
    );
  },
});

module.exports = { uploadMedia };
