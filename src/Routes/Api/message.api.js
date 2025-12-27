// external dependencies
const express = require("express");
const {
  registerUserController,
  
} = require("../../Controller/user.controller");
const { uploadImages } = require("../../middleware/multer.middleware");
const { authguard } = require("../../middleware/authGuard");

// extracting router from express
const { Router } = express;
const router = Router();

//  register user
router
  .route("/register")
  .post(uploadImages.single("profilePicture"), registerUserController);

module.exports = router;
