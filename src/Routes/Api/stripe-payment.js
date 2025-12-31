// // external dependencies
// const express = require("express");
// const {
//   registerUserController,
//   loginUserController,
//   getUserData,
//   changePassword,
//   verifyEmail,
//   verifyOtp,
//   resetPassword,
//   updateUser,
//   deleteUserAccount,
//   logoutUser,
//   verifyAccount,
//   resendOtp,

// } = require("../../Controller/user.controller");
// const { uploadImages } = require("../../middleware/multer.middleware");
// const { authguard } = require("../../middleware/authGuard");


// // extracting router from express
// const { Router } = express;
// const router = Router();

// //  register user
// router
//   .route("/register")
//   .post(uploadImages.single("profilePicture"), registerUserController);

// router.route("/verify-acc").put(verifyAccount);

// // login user
// router.route("/login").post(loginUserController);

// // update user
// router
//   .route("/update-user")
//   .put(authguard, uploadImages.single("profilePicture"), updateUser);

// // get me
// router.route("/stripe-checkout").get(authguard, CreateCheckoutController);
// router.route("/stripe-webhook").get(authguard, StripeWebhookCopntroller);




// module.exports = router;
