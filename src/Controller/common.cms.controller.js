const mongoose = require("mongoose");
const { TermsAndCondition } = require("../Schema/terms.and.conditions.schema");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");

const addTermsAndConditionsCms = asyncHandler(async (req, res, next) => {
  const { pageTitle, sections } = req.body;

  const terms_and_condition = await TermsAndCondition.findOne();

  if (!terms_and_condition) {
    const new_terms_and_condition = new TermsAndCondition({
      pageTitle,
      sections,
    });

    const saved_terms_and_conditions = await new_terms_and_condition.save();
    if (!saved_terms_and_conditions) {
      return next(
        new apiError(
          500,
          "Can't save terms and conditions content at the moment."
        )
      );
    }
    return res
      .status(200)
      .json(
        new apiSuccess(
          201,
          "Successfully created terms and conditions content",
          saved_terms_and_conditions
        )
      );
  }

  terms_and_condition.pageTitle = pageTitle || terms_and_condition.pageTitle;
  await terms_and_condition.save();
  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Terms and conditions updated successfully",
        terms_and_condition
      )
    );
});

const updateSection = asyncHandler(async (req, res, next) => {
  const { title } = req.params;
  const { updatedTitle, content } = req.body;

  if (!updatedTitle && !content) {
    return next(
      new apiError(400, "Please provide at least one value (title or content)")
    );
  }

  const updateObj = {};
  if (updatedTitle) updateObj["sections.$.title"] = updatedTitle;
  if (content) updateObj["sections.$.content"] = content;

  const terms_and_conditions = await TermsAndCondition.findOneAndUpdate(
    { "sections.title": title },
    { $set: updateObj },
    { new: true }
  );

  if (!terms_and_conditions) {
    return next(new apiError(404, "Section not found"));
  }

  res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Successfully updated section data",
        terms_and_conditions
      )
    );
});

const deleteSection = asyncHandler(async (req, res, next) => {
  const { title } = req.params;

  const section = await TermsAndCondition.findOneAndUpdate(
    { "sections.title": title },
    { $pull: { sections: { title: title } } },
    { new: true }
  );

  if (!section) {
    return next(new apiError(404, "Section not found"));
  }

  res.status(200).json(new apiSuccess(200, "Successfully deleted section"));
});

const getTermsAndConditionsCms = asyncHandler(async (req, res, next) => {
  const termsAndConditionsCms = await TermsAndCondition.findOne();

  if (!termsAndConditionsCms) {
    return next(new apiError(404, "Terms and conditions page data not found"));
  }

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Terms and conditions page data retrieved successfully",
        termsAndConditionsCms
      )
    );
});

module.exports = {
  addTermsAndConditionsCms,
  updateSection,
  deleteSection,
  getTermsAndConditionsCms,
};
