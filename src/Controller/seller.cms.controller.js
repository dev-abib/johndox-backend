const { uploadCloudinary } = require("../Helpers/uploadCloudinary");
const { sellerHero } = require("../Schema/seller.hero.schema");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");

const upsertSellerHero = asyncHandler(async (req, res, next) => {
  const { title, subtitle, btnTxt } = req.body;
  const bgImg = req.file;

  let hero = await sellerHero.findOne();

  if (!hero) {
    if (!bgImg) {
      return next(new apiError(400, "Hero background image is required"));
    }

    const uploadResult = await uploadCloudinary(
      bgImg.buffer,
      "cms/landing/sellerHero"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Hero background upload failed"));
    }

    hero = await sellerHero.create({
      title,
      subtitle,
      btnTxt,
      bgImg: uploadResult.secure_url,
    });

    return res
      .status(201)
      .json(new apiSuccess(201, "Seller hero created successfully", hero));
  }

  // If seller hero exists, update fields as required
  hero.title = title ?? hero.title;
  hero.subtitle = subtitle ?? hero.subtitle;
  hero.btnTxt = btnTxt ?? hero.btnTxt;

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
      "cms/landing/sellerHero"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Hero background upload failed"));
    }

    hero.bgImg = uploadResult.secure_url;
  }

  await hero.save(); // Save the updated hero details
  return res
    .status(200)
    .json(new apiSuccess(200, "Seller hero updated successfully", hero));
});

// Get the seller hero section details
const getSellerHero = asyncHandler(async (req, res, next) => {
  let hero = await sellerHero.findOne(); // Find the seller hero entry

  if (!hero) {
    // If no seller hero exists, return error
    return next(new apiError(404, "Seller hero not found"));
  }

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Successfully extracted seller hero details", hero)
    );
});



module.exports = {
  upsertSellerHero,
  getSellerHero,
};
