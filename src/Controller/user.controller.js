const { default: mongoose } = require("mongoose");
const { mailSender } = require("../Helpers/emailSender");
const {
  createAdminSessionToken,
  verifyPassword,
  verifyAdminSessionToken,
  hashUserPassword,
  createSessionToken,
  otpGenerator,
  decodeSessionToken,
  verifyGoogleToken,
} = require("../Helpers/helper");
const crypto = require("crypto");

const {
  uploadCloudinary,
  deleteCloudinaryAsset,
} = require("../Helpers/uploadCloudinary");
const { Admin } = require("../Schema/admin.schema");
const { UserRating } = require("../Schema/user.rating.schema");
const { user } = require("../Schema/user.schema");

const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");
const { emailChecker, passwordChecker } = require("../Utils/check");
const { supportMessage } = require("../Schema/support.message.schema");
const { notificationPreference } = require("../Schema/notifications.schema");

// register user controller
const registerUserController = asyncHandler(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    role,
    password,
    confirmPassword,
    termsAndConditions,
  } = req.body;

  const roles = ["buyer", "seller"];

  if (!firstName) {
    return next(new apiError(400, "First name field is required"));
  }

  if (!lastName) {
    return next(new apiError(400, "Last name field is required"));
  }

  if (!role) return next(new apiError(400, "Role field is required"));

  if (!roles.includes(role)) {
    return next(new apiError(400, "Invalid role value"));
  }

  if (!email) return next(new apiError(400, "Email field is required"));

  if (!emailChecker(email))
    return next(new apiError(400, "Invalid Email format"));

  if (!termsAndConditions) {
    return next(new apiError(400, "Terms and conditions field is required"));
  }

  if (String(termsAndConditions).toLowerCase() !== "true") {
    return next(
      new apiError(400, "You must have to agree with the terms and conditions")
    );
  }

  if (!password) return next(new apiError(400, "Password field is required"));

  if (!passwordChecker(confirmPassword))
    return next(
      new apiError(
        400,
        "Invalid  password format. Password must be 8–32 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @, $, !, %, *, ?, &, #, +)."
      )
    );

  if (!confirmPassword)
    return next(new apiError(400, "Confirm password is required"));

  if (!passwordChecker(confirmPassword))
    return next(
      new apiError(
        400,
        "Invalid confirm password format. Password must be 8–32 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @, $, !, %, *, ?, &, #, +)."
      )
    );

  if (password !== confirmPassword)
    return next(new apiError(400, "Passwords do not match"));

  const isExistingUser = await user.findOne({ email });
  if (isExistingUser) return next(new apiError(400, "Account already exists"));

  const hashedPassword = await hashUserPassword(password);

  let savedUser = null;

  const newUser = new user({
    firstName,
    lastName,
    email,
    role,
    termsAndConditions,
    password: hashedPassword,
  });

  savedUser = await newUser.save();

  if (!savedUser)
    return next(
      new apiError(500, "Unable to create account after multiple attempts")
    );

  const token = await createSessionToken({
    name: savedUser.firstName,
    email: savedUser.email,
    userId: savedUser._id,
    role: savedUser.role,
  });

  if (token)
    await user.findByIdAndUpdate(savedUser._id, { refreshToken: token });

  const responseData = {
    name: savedUser.firstName,
    email: savedUser.email,
    role: savedUser.role,
  };

  const otp = await otpGenerator();

  savedUser.otp = otp;
  savedUser.otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  await savedUser.save();

  const isMailSend = await mailSender({
    type: "verify-account",
    name: savedUser.firstName || "User",
    emailAdress: email,
    subject: "Your One-Time Password (OTP)",
    otp,
  });

  if (!isMailSend) {
    return next(new apiError(500, "Failed to send OTP email", null, false));
  }

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "User registered successfully. An OTP has been sent to your email address — please check your inbox.",
        responseData,
        true
      )
    );
});

// verify account
const verifyAccount = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email)
    return next(new apiError(400, "Email field is required", null, false));

  if (!otp)
    return next(new apiError(400, "OTP field is required", null, false));

  if (!emailChecker(email))
    return next(new apiError(400, "Invalid Email format", null, false));

  const isExisteduser = await user.findOne({ email });

  if (!isExisteduser)
    return next(new apiError(404, "User not found", null, false));

  if (isExisteduser.otp !== otp)
    return next(new apiError(400, "Invalid OTP", null, false));

  if (new Date() > isExisteduser.otpExpiresAt)
    return next(new apiError(400, "OTP expired", null, false));

  isExisteduser.refreshToken = null;
  isExisteduser.otp = null;
  isExisteduser.otpExpiresAt = null;
  isExisteduser.isOtpVerified = true;
  await isExisteduser.save();

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Account verified successfully", null, true, null)
    );
});

// login user controller
const loginUserController = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email)
    return next(new apiError(400, "Email field is required", null, false));

  if (!emailChecker(email))
    return next(new apiError(400, "Invalid Email format", null, false));

  if (!password)
    return next(new apiError(400, "Password field is required", null, false));

  if (!passwordChecker(password))
    return next(new apiError(400, "Invalid password format", null, false));

  const isExistingUser = await user.findOne({ email });

  if (!isExistingUser)
    return next(new apiError(400, "Invalid email or password", null, false));

  const isVerifiedPass = await verifyPassword(
    password,
    isExistingUser.password
  );

  if (!isVerifiedPass)
    return next(new apiError(400, "Invalid email or password", null, false));

  if (
    isExistingUser.isOtpVerified === null ||
    isExistingUser.isOtpVerified === undefined ||
    isExistingUser.isOtpVerified !== true
  ) {
    return next(
      new apiError(400, "Before login , please verify you account", null, false)
    );
  }

  const data = {
    name: isExistingUser.firstName,
    email: isExistingUser.email,
    userId: isExistingUser._id,
    role: isExistingUser.role,
  };

  const token = await createSessionToken(data);
  isExistingUser.refreshToken = token;
  await isExistingUser.save();

  const responseData = {
    name: isExistingUser.firstName,
    email: isExistingUser.email,
    role: isExistingUser.role,
    token: token,
  };

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Successfully logged in", responseData, true, null)
    );
});

// get me route controller
const getUserData = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);

  if (!decodedData) return next(new apiError(401, "Unauthorized", null, false));

  const isExistingUser = await user.findById(decodedData?.userData?.userId);

  if (!isExistingUser)
    return next(new apiError(404, "User not found", null, false));

  const {
    password,
    resetToken,
    refreshToken,
    updatedAt,
    createdAt,
    otpExpiresAt,
    otp,
    ...safeUserData
  } = isExistingUser.toObject();

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Successfully retrieved user",
        safeUserData,
        true,
        null
      )
    );
});

// change password controller
const changePassword = asyncHandler(async (req, res, next) => {
  const { prevPassword, password, confirmPassword } = req.body;
  const decodedData = await decodeSessionToken(req);

  if (!decodedData) return next(new apiError(401, "Unauthorized", null, false));

  if (!prevPassword)
    return next(
      new apiError(400, "Previous password is required", null, false)
    );

  if (!password || !confirmPassword)
    return next(
      new apiError(
        400,
        "New password and confirmation are required",
        null,
        false
      )
    );

  const isExisteduser = await user.findById(decodedData.userData.userId);
  if (!user) return next(new apiError(404, "User not found", null, false));

  const isVerifiedPassword = await verifyPassword(
    prevPassword,
    isExisteduser.password
  );

  if (!isVerifiedPassword)
    return next(new apiError(401, "Incorrect current password", null, false));

  isExisteduser.password = await hashUserPassword(password);
  await isExisteduser.save();

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Password changed successfully", null, true, null)
    );
});

// verify email controller
const verifyEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new apiError(400, "Email field is required", null, false));
  }

  // Check if the email format is valid
  if (!emailChecker(email)) {
    return next(new apiError(400, "Invalid Email format", null, false));
  }

  // Check if the user exists
  const isExisteduser = await user.findOne({ email: email });

  if (!isExisteduser) {
    return next(new apiError(404, "User not found", null, false));
  }

  // Generate OTP
  const otp = await otpGenerator();

  if (!otp) {
    return next(new apiError(500, "Failed to generate OTP", null, false));
  }

  // Update the user with the OTP and its expiration time
  isExisteduser.otp = otp;
  isExisteduser.otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // OTP expires in 2 minutes
  await isExisteduser.save();

  try {
    // Send the OTP email
    await mailSender({
      type: "otp",
      name: isExisteduser.firstName || "User",
      emailAdress: email,
      subject: "Your One-Time Password (OTP)",
      otp: otp,
    });

    // Send a success response
    return res
      .status(200)
      .json(new apiSuccess(200, "OTP sent successfully", null, true));
  } catch (error) {
    console.error("OTP email failed:", error.message);
    return next(new apiError(500, "Failed to send OTP email", null, false));
  }
});

// resend otp controller
const resendOtp = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email)
    return next(new apiError(400, "Email field is required", null, false));

  if (!emailChecker(email))
    return next(new apiError(400, "Invalid Email format", null, false));

  const isExisteduser = await user.findOne({ email });

  if (!isExisteduser)
    return next(new apiError(404, "User not found", null, false));

  if (
    isExisteduser.otpExpiresAt &&
    new Date() < new Date(isExisteduser.otpExpiresAt)
  ) {
    const remainingMs =
      new Date(isExisteduser.otpExpiresAt).getTime() - Date.now();
    if (remainingMs > 1 * 60 * 1000) {
      return next(
        new apiError(
          429,
          "Please wait before requesting another OTP (1 minute interval)",
          null,
          false
        )
      );
    }
  }

  // generate new otp
  const otp = await otpGenerator();

  // update user
  isExisteduser.otp = otp;
  isExisteduser.otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
  await isExisteduser.save();

  try {
    await mailSender({
      type: "otp",
      name: isExisteduser.firstName || "User",
      emailAdress: email,
      subject: "Your New One-Time Password (OTP)",
      otp,
    });

    return res
      .status(200)
      .json(
        new apiSuccess(200, "New OTP sent successfully", { email }, true, null)
      );
  } catch (error) {
    console.error("Resend OTP failed:", error.message);
    return next(new apiError(500, "Failed to resend OTP email", null, false));
  }
});

// verify otp controller
const verifyOtp = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email)
    return next(new apiError(400, "Email field is required", null, false));

  if (!otp)
    return next(new apiError(400, "OTP field is required", null, false));

  if (!emailChecker(email))
    return next(new apiError(400, "Invalid Email format", null, false));

  const isExisteduser = await user.findOne({ email });

  if (!isExisteduser)
    return next(new apiError(404, "User not found", null, false));

  if (isExisteduser.otp !== otp)
    return next(new apiError(400, "Invalid OTP", null, false));

  if (new Date() > isExisteduser.otpExpiresAt)
    return next(new apiError(400, "OTP expired", null, false));

  const token = await createSessionToken({
    name: isExisteduser.firstName,
    email: isExisteduser.email,
  });

  isExisteduser.resetToken = token;
  isExisteduser.refreshToken = null;
  isExisteduser.otp = null;
  isExisteduser.otpExpiresAt = null;
  await isExisteduser.save();

  return res.status(200).json(
    new apiSuccess(
      200,
      "OTP verified successfully",
      {
        token: token,
      },
      true,
      null
    )
  );
});

// reset password done
const resetPassword = asyncHandler(async (req, res, next) => {
  const { password, confirmPassword } = req.body;

  const decodedData = await decodeSessionToken(req);

  if (!decodedData) return next(new apiError(401, "Unauthorized", null, false));

  if (!password || !confirmPassword)
    return next(
      new apiError(400, "Password and confirmation are required", null, false)
    );

  if (!passwordChecker(password) || !passwordChecker(confirmPassword))
    return next(new apiError(400, "Invalid password format", null, false));

  if (password !== confirmPassword)
    return next(new apiError(400, "Passwords do not match", null, false));

  const isExisteduser = await user.findOne({
    email: decodedData.userData.email,
  });

  if (!user) return next(new apiError(404, "User not found", null, false));

  isExisteduser.password = await hashUserPassword(password);
  isExisteduser.resetToken = null;
  await isExisteduser.save();

  return res
    .status(200)
    .json(new apiSuccess(200, "Password reset successfully", null, true, null));
});

const updateUser = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);
  if (!decodedData) return next(new apiError(401, "Unauthorized", null, false));

  const isExisteduser = await user.findById(decodedData?.userData?.userId);
  if (!isExisteduser)
    return next(new apiError(404, "User not found", null, false));

  const { firstName, lastName, phoneNumber } = req.body;

  const profilePicture = req.files?.profilePicture
    ? req.files.profilePicture[0]
    : null;
  const identity_document = req.files?.identity_document
    ? req.files.identity_document[0]
    : null;

  if (profilePicture) {
    try {
      // Delete old profile picture from Cloudinary
      if (isExisteduser.profilePicture) {
        let isDeleted = await deleteCloudinaryAsset(
          isExisteduser.profilePicture
        );
        if (!isDeleted) {
          return next(new apiError(500, "Error deleting old profile picture"));
        }
      }

      const uploadResult = await uploadCloudinary(
        profilePicture.buffer,
        "profilePic"
      );
      if (!uploadResult?.secure_url) {
        return next(new apiError(500, "Profile picture upload failed"));
      }

      isExisteduser.profilePicture = uploadResult.secure_url;
    } catch (error) {
      console.error("Cloudinary error:", error);
      return next(new apiError(500, "Error updating profile picture"));
    }
  }

  if (identity_document) {
    try {
      if (isExisteduser.identity_document) {
        let isDeleted = await deleteCloudinaryAsset(
          isExisteduser.identity_document
        );
        if (!isDeleted) {
          return next(new apiError(500, "Error deleting old profile picture"));
        }
      }

      const uploadResult = await uploadCloudinary(
        identity_document.buffer,
        "identity-documents"
      );
      if (!uploadResult?.secure_url) {
        return next(new apiError(500, "Profile picture upload failed"));
      }

      isExisteduser.identity_document = uploadResult.secure_url;
    } catch (error) {
      console.error("Cloudinary error:", error);
      return next(new apiError(500, "Error updating profile picture"));
    }
  }

  if (firstName) isExisteduser.firstName = firstName;
  if (lastName) isExisteduser.lastName = lastName;
  if (phoneNumber) isExisteduser.phoneNumber = phoneNumber;

  const updatedUser = await isExisteduser.save();

  return res.status(200).json(
    new apiSuccess(
      200,
      "User updated successfully",
      {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        phoneNumber: updatedUser.phoneNumber,
      },
      true
    )
  );
});

const deleteUserAccount = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);
  const userId = decodedData?.userData?.userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new apiError(400, "Invalid user id"));
  }

  const existingUser = await user.findById(userId).lean();
  if (!existingUser) {
    return next(new apiError(404, "User not found"));
  }

  const cloudinaryAssets = [];

  if (existingUser.profilePicture) {
    cloudinaryAssets.push(existingUser.profilePicture);
  }

  if (existingUser.identity_document) {
    cloudinaryAssets.push(existingUser.identity_document);
  }

  const properties = await Property.find(
    { author: userId },
    { media: 1 }
  ).lean();

  properties.forEach((property) => {
    property.media?.forEach((media) => {
      if (media?.url) cloudinaryAssets.push(media.url);
    });
  });

  await Promise.allSettled(
    [...new Set(cloudinaryAssets)].map((url) => deleteCloudinaryAsset(url))
  );

  await Promise.all([
    Property.deleteMany({ author: userId }),

    Message.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }),

    Conversation.deleteMany({ participants: userId }),

    Notification.deleteMany({
      $or: [{ senderId: userId }, { reciverId: userId }],
    }),

    notificationPreference.deleteOne({ author: userId }),

    buyerQuery.deleteMany({
      $or: [{ buyer: userId }, { seller: userId }],
    }),

    UserRating.deleteMany({
      $or: [{ rater: userId }, { receiver: userId }],
    }),

    plan.updateMany({ userId }, { $set: { userId: null } }),
  ]);

  await user.findByIdAndDelete(userId);

  res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Account and all related data deleted successfully"
      )
    );
});

// log out user
const logoutUser = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);
  if (!decodedData) {
    return next(
      new apiError(401, "Unauthorized - Invalid or missing token", null, false)
    );
  }

  const isExistedUser = await user.findById(decodedData?.userData?.userId);
  if (!isExistedUser) {
    return next(new apiError(404, "User not found", null, false));
  }

  isExistedUser.refreshToken = null;
  await isExistedUser.save();

  return res
    .status(200)
    .json(new apiSuccess(200, "Logged out successfully", null, true));
});

const rateUser = asyncHandler(async (req, res, next) => {
  const { reciverId } = req.params;
  const { rating, comment } = req.body;

  const decodedData = await decodeSessionToken(req);
  const userId = decodedData?.userData?.userId;

  if (!userId) {
    return next(new apiError(401, "Unauthorized", null, false));
  }

  const numericRating = Number(rating);

  if (!numericRating || numericRating < 1 || numericRating > 5) {
    return next(
      new apiError(400, "Rating must be between 1 and 5.", null, false)
    );
  }

  if (String(userId) === String(reciverId)) {
    return next(new apiError(400, "You cannot rate yourself.", null, false));
  }

  const isExistedReceiver = await user.findById(reciverId);

  if (!isExistedReceiver) {
    return next(
      new apiError(404, "Receiver account didn't exist or removed", null, false)
    );
  }

  // create/update rating (same rater -> same receiver only one rating)
  const ratingDoc = await UserRating.findOneAndUpdate(
    { rater: userId, receiver: reciverId },
    { rating: numericRating, comment: comment ?? null },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // recalc receiver avg + count
  const stats = await UserRating.aggregate([
    { $match: { receiver: new mongoose.Types.ObjectId(reciverId) } },
    {
      $group: {
        _id: "$receiver",
        avg: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = stats?.[0]?.avg ?? 0;
  const count = stats?.[0]?.count ?? 0;

  await user.findByIdAndUpdate(reciverId, {
    "ratingSummary.avg": Number(avg.toFixed(2)),
    "ratingSummary.count": count,
  });

  return res.status(200).json(
    new apiSuccess(
      200,
      "Successfully rated user",
      {
        yourRating: ratingDoc,
        receiverRatingSummary: { avg: Number(avg.toFixed(2)), count },
      },
      false
    )
  );
});

const contactSupportForMe = asyncHandler(async (req, res, next) => {
  const { fullName, email, subject, phoneNumber, message } = req.body;

  if (!fullName) {
    return next(new apiError(400, "Full name is required", null, false));
  }
  if (!email) {
    return next(new apiError(400, " Email is required", null, false));
  }
  if (!emailChecker(email)) {
    return next(new apiError(400, "Invalid email address", null, false));
  }
  if (!subject) {
    return next(new apiError(400, " subject is required", null, false));
  }
  if (!phoneNumber) {
    return next(new apiError(400, "phone number is required", null, false));
  }
  if (!message) {
    return next(new apiError(400, " message is required", null, false));
  }

  const userMessage = new supportMessage({
    fullName,
    email,
    subject,
    phoneNumber,
    message,
  });

  const savedMessage = await userMessage.save();

  if (!savedMessage) {
    return new apiError(
      500,
      "Can't send query at the moment, please try again late.",
      null,
      false
    );
  }

  const isMailSent = await mailSender({
    data: savedMessage,
    type: "contact",
    subject: savedMessage?.subject,
  });

  if (!isMailSent) {
    return new apiError(
      500,
      "Can't send query at the moment, please try again late.",
      null,
      false
    );
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "successfully sent query", null, true, false));
});

const googleAuthController = asyncHandler(async (req, res, next) => {
  const { idToken, role } = req.body;

  const roles = ["buyer", "seller"];

  if (!idToken) {
    return next(new apiError(400, "Google ID token is required"));
  }

  const userRole = roles.includes(role) ? role : "buyer";

  const payload = await verifyGoogleToken(idToken);
  const { email, name, picture } = payload;

  if (!email) {
    return next(new apiError(400, "Email not found in Google account"));
  }

  const nameParts = name?.split(" ") || [];
  const firstName = nameParts.shift() || "Google";
  const lastName = nameParts.join(" ") || "User";

  let existingUser = await user.findOne({ email });

  if (!existingUser && !userRole) {
    return next(
      new apiError(
        400,
        "To create a account , you must have to provide user role"
      )
    );
  }

  if (!existingUser) {
    existingUser = await user.create({
      firstName,
      lastName,
      email,
      role: userRole,
      password: crypto.randomBytes(32).toString("hex"),
      profilePicture: picture || null,
      isVerifiedAccount: true,
      isOtpVerified: true,
      termsAndConditions: "true",
    });
  }

  const token = await createSessionToken({
    name: existingUser.firstName,
    email: existingUser.email,
    userId: existingUser._id,
    role: existingUser.role,
  });

  if (token) {
    existingUser.refreshToken = token;
    await existingUser.save();
  }

  return res.status(200).json(
    new apiSuccess(
      200,
      "Google authentication successful",
      {
        name: existingUser.firstName,
        email: existingUser.email,
        role: existingUser.role,
        profilePicture: existingUser.profilePicture,
        token,
      },
      true
    )
  );
});

const upsertNotificationsPreference = asyncHandler(async (req, res, next) => {
  const {
    propertyAlert,
    messageNotifications,
    priceUpdates,
    listingActivity,
    promotionsAndOffer,
    emailNotifications,
  } = req.body;

  const decodedData = await decodeSessionToken(req);
  const userId = decodedData?.userData?.userId;

  const User = await user.findById(userId);
  if (!User) {
    return next(new apiError(404, "User not found"));
  }

  let notification = await notificationPreference.findOne({ author: userId });

  if (notification) {
    notification.propertyAlert = propertyAlert ?? notification.propertyAlert;
    notification.messageNotifications =
      messageNotifications ?? notification.messageNotifications;
    notification.priceUpdates = priceUpdates ?? notification.priceUpdates;
    notification.listingActivity =
      listingActivity ?? notification.listingActivity;
    notification.promotionsAndOffer =
      promotionsAndOffer ?? notification.promotionsAndOffer;
    notification.emailNotifications =
      emailNotifications ?? notification.emailNotifications;

    await notification.save();
  } else {
    notification = await new notificationPreference({
      author: userId,
      propertyAlert,
      messageNotifications,
      priceUpdates,
      listingActivity,
      promotionsAndOffer,
      emailNotifications,
    });
    await notification.save();
  }

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Successfully upserted notification preference",
        notification
      )
    );
});

const getNotificationPreference = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);
  const userId = decodedData?.userData?.userId;

  const myNotificationSetting = await notificationPreference.findOne({
    author: userId,
  });

  if (!myNotificationSetting) {
    return next(new apiError(404, "No notifications preference created"));
  }

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Successfully retrieved notifications preference",
        myNotificationSetting
      )
    );
});

module.exports = {
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
  upsertNotificationsPreference,
  getNotificationPreference,
  deleteUserAccount,
};
