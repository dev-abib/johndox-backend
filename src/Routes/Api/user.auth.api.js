// external dependencies
const express = require("express");
const {
  registerUserController,
  loginUserController,
  getUserData,
  changePassword,
  verifyEmail,
  verifyOtp,
  resetPassword,
  updateUser,
  deleteUserAccount,
  logoutUser,
  verifyAccount,
  resendOtp,
  rateUser,
  contactSupportForMe,
  googleAuthController,
  getNotificationPreference,
  upsertNotificationsPreference,
} = require("../../Controller/user.controller");
const { uploadMedia } = require("../../middleware/multer.middleware");
const { authguard } = require("../../middleware/authGuard");
const { notificationPreference } = require("../../Schema/notifications.schema");

// extracting router from express
const { Router } = express;
const router = Router();

//  register user
router
  .route("/register")
  .post(uploadMedia.single("profilePicture"), registerUserController);

router.route("/verify-acc").put(verifyAccount);

// login user
router.route("/login").post(loginUserController);

// update user
router
  .route("/update-user")
  .put(authguard, uploadMedia.single("profilePicture"), updateUser);

// get me
router.route("/get-me").get(authguard, getUserData);

// change password
router.route("/change-password").put(authguard, changePassword);

// verify email
router.route("/verify-email").post(verifyEmail);

// verify email
router.route("/verify-otp").post(verifyOtp);

// resend otp
router.route("/resend-otp").put(resendOtp);

// reset password
router.route("/reset-pass").post(authguard, resetPassword);

// delete account
router.route("/delete-acc").delete(authguard, deleteUserAccount);

// log out account
router.route("/log-out").post(authguard, logoutUser);

// rate user
router.route("/rate/:reciverId").post(authguard, rateUser);

// contact support
router.route("/contact-support").post(contactSupportForMe);

// google login
router.route("/auth/google-login").post(googleAuthController);

// upsert notification preference
router.route("/upsert-notification-preference").post(authguard,upsertNotificationsPreference);

//get notification preference
router.route("/get-notification-preference").get(authguard,getNotificationPreference);

module.exports = router;
