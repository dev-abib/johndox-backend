const { mailSender } = require("../Helpers/emailSender");
const {
  uploadCloudinary,
  deleteCloudinaryAsset,
} = require("../Helpers/uploadCloudinary");
const { ContactQuery } = require("../Schema/contact.query.schema");
const { contactUsHero } = require("../Schema/contact.us.hero.schema");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");

const upsertContactHero = asyncHandler(async (req, res, next) => {
  const { title, subtitle } = req.body;
  const bgImg = req.file;

  let hero = await contactUsHero.findOne();

  if (!hero) {
    if (!bgImg) {
      return next(new apiError(400, "Hero background image is required"));
    }

    const uploadResult = await uploadCloudinary(
      bgImg.buffer,
      "cms/landing/contactHero"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Hero background upload failed"));
    }

    hero = await contactUsHero.create({
      title,
      subtitle,
      bgImg: uploadResult.secure_url,
    });

    return res
      .status(201)
      .json(new apiSuccess(201, "Contact hero created successfully", hero));
  }

  hero.title = title ?? hero.title;
  hero.subtitle = subtitle ?? hero.subtitle;

  // Handle updating the background image
  if (bgImg) {
    if (hero.bgImg) {
      // Delete the old background image from Cloudinary
      const isDeleted = await deleteCloudinaryAsset(hero.bgImg);
      if (!isDeleted) {
        return next(new apiError(500, "Error deleting old hero background"));
      }
    }

    // Upload the new background image to Cloudinary
    const uploadResult = await uploadCloudinary(
      bgImg.buffer,
      "cms/landing/contactHero"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Hero background upload failed"));
    }

    hero.bgImg = uploadResult.secure_url;
  }

  await hero.save();
  return res
    .status(200)
    .json(new apiSuccess(200, "Contact hero updated successfully", hero));
});

// Get the seller hero section details
const getContactUsHero = asyncHandler(async (req, res, next) => {
  let hero = await contactUsHero.findOne();

  if (!hero) {
    // If no seller hero exists, return error
    return next(new apiError(404, "Contact hero not found"));
  }

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Contact hero extracted seller hero details", hero)
    );
});

const postUserQuery = asyncHandler(async (req, res, next) => {
  const { fullName, email, phoneNumber, subject, message } = req.body;

  if (!fullName) {
    return next(new apiError(400, "Full name is required"));
  }
  if (!email) {
    return next(new apiError(400, "Email address is required"));
  }
  if (!phoneNumber) {
    return next(new apiError(400, "Phone number is required"));
  }
  if (!phoneNumber) {
    return next(new apiError(400, "Phone number is required"));
  }
  if (!subject) {
    return next(new apiError(400, "Message subject is required"));
  }
  if (!message) {
    return next(new apiError(400, "Message filed is required"));
  }

  const newMessage = new ContactQuery({
    fullName,
    email,
    phoneNumber,
    subject,
    message,
  });

  const savedMessage = await newMessage.save();

  if (!savedMessage) {
    return next(new apiError(500, "Can't send query at the moment"));
  }

  const isMailSend = await mailSender({
    type: "contact",
    data: savedMessage,
    subject: savedMessage?.subject,
  });

  if (!isMailSend) {
    return next(
      new apiError(
        400,
        "Can't send query at the moment, please try again later"
      )
    );
  }

  return res.status(200).json(new apiSuccess(200, "Successfully sent query"));
});

module.exports = {
  upsertContactHero,
  getContactUsHero,
  postUserQuery,
};
