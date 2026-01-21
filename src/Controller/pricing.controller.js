const { pricingPageCms } = require("../Schema/pricing.page.schema");
const { apiError } = require("../Utils/api.error");
const { asyncHandler } = require("../Utils/asyncHandler");
const { apiSuccess } = require("../Utils/api.success");
const { faq } = require("../Schema/faq.schema");

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

const addFaq = asyncHandler(async (req, res, next) => {
  const { question, answer } = req.body;
  if (!question || !answer) {
    return next(new apiError(400, "Faq question and answer field is requried"));
  }

  const newFaq = new faq({
    question: question,
    answer: answer,
  });

  await newFaq.save();
  return res
    .status(200)
    .json(new apiSuccess(200, "Faq added successfully", newFaq));
});

const updateFaq = asyncHandler(async (req, res, next) => {
  const { question, answer, isActive } = req.body;
  const { faqId } = req.params;

  if (!faqId) {
    return next(
      new apiError(400, "Please provide faq id to proceed updating data")
    );
  }

  const singleFaq = await faq.findById(faqId);

  if (!singleFaq) {
    return next(new apiError(404, "Faq not found, please try again later"));
  }

  if (question !== undefined) {
    singleFaq.question = question;
  }
  if (answer !== undefined) {
    singleFaq.answer = answer;
  }
  if (isActive !== undefined) {
    singleFaq.isActive = isActive;
  }

  await singleFaq.save();

  return res
    .status(200)
    .json(new apiSuccess(200, "Successfully updated faq data", singleFaq));
});

const deleteFaq = asyncHandler(async (req, res, next) => {
  const { faqId } = req.params;

  if (!faqId) {
    return next(
      new apiError(400, "Please provide faq id to procedd updating data")
    );
  }

  const singleFaq = await faq.findById(faqId);

  if (!singleFaq) {
    return next(new apiError(404, "Faq not found , please try again later"));
  }

  await faq.findByIdAndDelete(faqId);

  return res.status(200).json(new apiSuccess(200, "Successfully deleted faq"));
});

const getFaqs = asyncHandler(async (req, res, next) => {
  const allFaqs = await faq.find();

  if (allFaqs.length < 1) {
    return next(new apiError(404, "No faqs available at the moment"));
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "Successfully retrieved faq data", allFaqs));
});

module.exports = {
  upsertPricingPageCms,
  getPricingPageCms,
  addFaq,
  updateFaq,
  deleteFaq,
  getFaqs,
};
