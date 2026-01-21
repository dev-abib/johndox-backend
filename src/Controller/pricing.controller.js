const { pricingPageCms } = require("../Schema/pricing.page.schema");
const { apiError } = require("../Utils/api.error");
const { asyncHandler } = require("../Utils/asyncHandler");
const { apiSuccess } = require("../Utils/api.success");

const upsertPricingPageCms = asyncHandler(async (req, res, next) => {
  const { mainTitle, subTitle, discountAmount, faqTitle } = req.body;

  let section = await pricingPageCms.findOne();

  if (!section) {
    section = new pricingPageCms({
      mainTitle,
      subTitle,
      discountAmount,
      faqTitle,
    });

    await section.save();
  } else {
    section.mainTitle = mainTitle || section.mainTitle;
    section.subTitle = subTitle || section.subTitle;
    section.discountAmount = discountAmount || section.discountAmount;
    section.faqTitle = faqTitle || section.faqTitle;
    section.save();
  }

  return res
    .status(200)
    .json(
      new apiSuccess(
        section ? 200 : 201,
        section
          ? "Page content update successfully"
          : "page content created successfully",
        section
      )
    );
});

const getPricingPageCms = asyncHandler(async (req, res, next) => {
  const section = await pricingPageCms.findOne();
  if (!section) {
    return next(new apiError(404, "Can't find pricing page cms"));
  }

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Successfully retrieved pricing page cms", section)
    );
});

module.exports = {
  upsertPricingPageCms,
  getPricingPageCms,
};
