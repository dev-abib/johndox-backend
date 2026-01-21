const { asyncHandler } = require("../Utils/asyncHandler");


const upsertPricingPageCms = asyncHandler(async (req, res) => {
                         const { mainTitle, subTitle, discountAmount, faqTitle } = req.body;
});




module.exports = {
  upsertPricingPageCms,
};