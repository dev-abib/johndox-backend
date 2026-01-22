// Controller/common.cms.controller.js
const { TermsAndCondition } = require("../Schema/terms.and.conditions.schema");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { asyncHandler } = require("../Utils/asyncHandler");

const norm = (t = "") => String(t).trim();
const keyOf = (t = "") => norm(t).toLowerCase();
const oid = (id) => TermsAndCondition.db.base.Types.ObjectId.isValid(id);

const getOrCreateDoc = async (pageTitle) => {
  let doc = await TermsAndCondition.findOne();
  if (!doc)
    doc = await TermsAndCondition.create({
      pageTitle: pageTitle || "Terms & Conditions",
      sections: [],
    });
  return doc;
};

const getTermsAndConditionsCms = asyncHandler(async (req, res, next) => {
  const doc = await TermsAndCondition.findOne();
  if (!doc)
    return next(new apiError(404, "Terms and conditions page data not found"));
  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Terms and conditions page data retrieved successfully",
        doc
      )
    );
});

const upsertTermsAndConditionsCms = asyncHandler(async (req, res, next) => {
  const { pageTitle, sections } = req.body || {};
  const incoming = Array.isArray(sections) ? sections : null;

  const doc = await getOrCreateDoc(pageTitle);

  if (pageTitle !== undefined) doc.pageTitle = norm(pageTitle);

  if (incoming !== null) {
    const seen = new Set();
    const nextSections = [];

    for (const s of incoming) {
      const title = norm(s?.title);
      const content = s?.content;

      if (!title) return next(new apiError(400, "Section title is required"));
      if (!content)
        return next(new apiError(400, `Content is required for "${title}"`));

      const titleKey = keyOf(title);
      if (seen.has(titleKey))
        return next(
          new apiError(409, `Duplicate section title in request: ${title}`)
        );
      seen.add(titleKey);

      nextSections.push({
        title,
        content,
        titleKey,
      });
    }

    doc.sections = nextSections;
  }

  await doc.save();

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Terms and conditions updated successfully", doc)
    );
});

const addSection = asyncHandler(async (req, res, next) => {
  const { title, content } = req.body || {};
  const t = norm(title);
  const c = content;

  if (!t) return next(new apiError(400, "Section title is required"));
  if (!c) return next(new apiError(400, `Content is required for "${t}"`));

  const doc = await getOrCreateDoc();
  const titleKey = keyOf(t);

  const exists = (doc.sections || []).some((s) => s.titleKey === titleKey);
  if (exists) return next(new apiError(409, `Section already exist: ${t}`));

  doc.sections.push({ title: t, content: c, titleKey });
  await doc.save();

  return res
    .status(201)
    .json(new apiSuccess(201, "Section added successfully", doc));
});

const updateSectionById = asyncHandler(async (req, res, next) => {
  const { sectionId } = req.params;
  const { updatedTitle, content } = req.body || {};

  if (!oid(sectionId)) return next(new apiError(400, "Invalid section id"));
  if (updatedTitle === undefined && content === undefined)
    return next(
      new apiError(400, "Please provide at least one value (title or content)")
    );

  const doc = await TermsAndCondition.findOne({ "sections._id": sectionId });
  if (!doc) return next(new apiError(404, "Section not found"));

  const section = doc.sections.id(sectionId);
  if (!section) return next(new apiError(404, "Section not found"));

  if (updatedTitle !== undefined) {
    const newTitle = norm(updatedTitle);
    if (!newTitle) return next(new apiError(400, "Section title is required"));

    const newKey = keyOf(newTitle);
    const dup = doc.sections.some(
      (s) => String(s._id) !== String(sectionId) && s.titleKey === newKey
    );
    if (dup)
      return next(new apiError(409, `Section already exist: ${newTitle}`));

    section.title = newTitle;
    section.titleKey = newKey;
  }

  if (content !== undefined) {
    if (!content) return next(new apiError(400, "Content is required"));
    section.content = content;
  }

  await doc.save();

  return res
    .status(200)
    .json(new apiSuccess(200, "Successfully updated section data", doc));
});

const deleteSectionById = asyncHandler(async (req, res, next) => {
  const { sectionId } = req.params;

  if (!oid(sectionId)) return next(new apiError(400, "Invalid section id"));

  const doc = await TermsAndCondition.findOne();
  if (!doc)
    return next(new apiError(404, "Terms and conditions page data not found"));

  const exists = doc.sections.some((s) => String(s._id) === String(sectionId));
  if (!exists) return next(new apiError(404, "Section not found"));

  doc.sections.pull({ _id: sectionId });
  await doc.save();

  return res
    .status(200)
    .json(new apiSuccess(200, "Successfully deleted section", doc));
});

const getDashboardHomeHeader = asyncHandler(async (req, res, next) => {
  const listings = await Property.find();
  


})

module.exports = {
  getTermsAndConditionsCms,
  upsertTermsAndConditionsCms,
  addSection,
  updateSectionById,
  deleteSectionById,
  getDashboardHomeHeader,
};
