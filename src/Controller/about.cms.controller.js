const { uploadCloudinary, deleteCloudinaryAsset } = require("../Helpers/uploadCloudinary");
const { aboutHero } = require("../Schema/about.hero.schema");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");

const upsertAboutHero = asyncHandler(async (req, res, next) => {
  const { title, subtitle } = req.body;
  const bgImg = req.file;

  let hero = await aboutHero.findOne();

  if (!hero) {
    if (!bgImg) {
      return next(new apiError(400, "Hero background image is required"));
    }

    const uploadResult = await uploadCloudinary(
      bgImg.buffer,
      "cms/landing/aboutHero"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Hero background upload failed"));
    }

    hero = await aboutHero.create({
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
      "cms/landing/aboutHero"
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
const getAboutHero = asyncHandler(async (req, res, next) => {
  let hero = await aboutHero.findOne();

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
  upsertAboutHero,
  getAboutHero,
};
