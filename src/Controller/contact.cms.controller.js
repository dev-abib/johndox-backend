const { uploadCloudinary, deleteCloudinaryAsset } = require("../Helpers/uploadCloudinary");
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
      .json(new apiSuccess(201, "Seller hero created successfully", hero));
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
    .json(new apiSuccess(200, "Seller hero updated successfully", hero));
});

// Get the seller hero section details
const getContactUsHero = asyncHandler(async (req, res, next) => {
  let hero = await contactUsHero.findOne();

  if (!hero) {
    // If no seller hero exists, return error
    return next(new apiError(404, "About hero not found"));
  }

  return res
    .status(200)
    .json(
      new apiSuccess(200, "About hero extracted seller hero details", hero)
    );
});

module.exports = {
  upsertContactHero,
  getContactUsHero,
};