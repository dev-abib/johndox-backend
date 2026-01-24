const {
  uploadCloudinary,
  deleteCloudinaryAsset,
} = require("../Helpers/uploadCloudinary");
const { howItWorkItems } = require("../Schema/how.it.works.schema");
const { howItWorksSection } = require("../Schema/how.it.works.section.schema");
const { sellerHero } = require("../Schema/seller.hero.schema");
const { sellerSubFooter } = require("../Schema/sellers.sub.footer.scehma");
const { whySellItems } = require("../Schema/why.sell.items.schema");
const {
  whySellWithTerraLink,
} = require("../Schema/why.sell.with.terralink.cms.schema");
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

const createUpdateWhySellWithUs = asyncHandler(async (req, res, next) => {
  const { sectionTitle, sectionSubTitle } = req.body;

  let section = await whySellWithTerraLink.findOne();

  if (!section) {
    // Create → both required
    if (!sectionTitle || !sectionSubTitle) {
      return next(
        new apiError(
          400,
          "Both title and subtitle are required when creating the section"
        )
      );
    }
    section = new whySellWithTerraLink({
      sectionTitle,
      sectionSubTitle,
    });
  } else {
    // Update → at least one field should be provided
    if (!sectionTitle && !sectionSubTitle) {
      return next(
        new apiError(
          400,
          "At least one field (title or subtitle) must be provided to update"
        )
      );
    }

    if (sectionTitle !== undefined) section.sectionTitle = sectionTitle;
    if (sectionSubTitle !== undefined)
      section.sectionSubTitle = sectionSubTitle;
  }

  const saved = await section.save();

  const isNew = !section._id;
  res
    .status(isNew ? 201 : 200)
    .json(
      new apiSuccess(
        isNew ? 201 : 200,
        isNew ? "Section created successfully" : "Section updated successfully",
        saved
      )
    );
});

const addWhyWhySellWithUsItems = asyncHandler(async (req, res, next) => {
  const { title, shortDescription } = req.body;

  const iconImg = req?.file;

  if (!title) {
    return next(new apiError(400, "Item title is required", null));
  }

  if (!shortDescription) {
    return next(new apiError(400, "Item title is required", null));
  }

  if (!iconImg) {
    return next(new apiError(400, "Item title is required", null));
  }

  const uploadResult = await uploadCloudinary(
    iconImg.buffer,
    "cms/why-sell-with-us/icons"
  );
  if (!uploadResult?.secure_url) {
    return res.status(500).json(new apiError(500, "icon upload filed"));
  }

  const newItem = new whySellItems({
    title,
    shortDescription,
    iconImg: uploadResult.secure_url,
  });

  const savedItem = await newItem.save();

  if (!savedItem) {
    return next(
      new apiError(500, "can't save item at the moment, please try again later")
    );
  }

  res
    .status(200)
    .json(new apiSuccess(200, "Item added successfully", savedItem));
});

const updateWhySellWithUsItems = asyncHandler(async (req, res, next) => {
  const { title, shortDescription } = req.body;

  const iconImg = req?.file;

  console.log(title, shortDescription, iconImg);

  const { itemId } = req.params;
  console.log(itemId);

  const item = await whySellItems.findById(itemId);

  if (!item) {
    return next(new apiError(400, "item not found , please try again later"));
  }

  if (!title && !shortDescription && !iconImg) {
    return next(
      new apiError(
        400,
        "Nothing to update please , update at least one field ",
        null
      )
    );
  }

  item.title = title || item.title;
  item.shortDescription = shortDescription || item.shortDescription;

  if (iconImg) {
    if (item.iconImg) {
      const isDeleted = await deleteCloudinaryAsset(item.iconImg);
      if (!isDeleted) {
        return next(new apiError(500, "Error deleting icon image"));
      }
    }

    const uploadResult = await uploadCloudinary(
      iconImg.buffer,
      "cms/why-sell-with-us/icons"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Icon upload failed"));
    }

    item.iconImg = uploadResult.secure_url;
  }

  await item.save();

  res.status(200).json(new apiSuccess(200, "Item added successfully", item));
});

const deleteWhySellWithUsItem = asyncHandler(async (req, res, next) => {
  const { itemId } = req.params;

  if (!itemId) {
    return next(new apiError(400, "Item ID is required"));
  }

  const item = await whySellItems.findById(itemId);

  if (item.iconImg) {
    const isDeleted = await deleteCloudinaryAsset(item.iconImg);
    if (!isDeleted) {
      return next(new apiError(500, "Error deleting icon image"));
    }
  }

  const isDeleted = await whySellItems.findByIdAndDelete(itemId);

  if (!isDeleted) {
    return next(new apiError(500, "Can't delete item at the moment"));
  }

  res.status(200).json(new apiSuccess(200, "Item deleted successfully"));
});

const getWhySellWithUs = asyncHandler(async (req, res) => {
  const section = await whySellWithTerraLink.findOne();

  const items = await whySellItems.find();

  if (!section) {
    return res.status(404).json(new apiError(404, "Section not found"));
  }

  res.status(200).json(
    new apiSuccess(200, "Section retrieved successfully", {
      section: section,
      items: items,
    })
  );
});

const createUpdateHowItWorks = asyncHandler(async (req, res, next) => {
  const { sectionTitle, sectionSubTitle } = req.body;

  let section = await howItWorksSection.findOne();
  const isNew = !section;

  if (!section) {
    if (!sectionTitle || !sectionSubTitle) {
      return next(
        new apiError(
          400,
          "Both title and subtitle are required when creating the section"
        )
      );
    }

    section = new howItWorksSection({
      sectionTitle,
      sectionSubTitle,
    });
  } else {
    if (sectionTitle === undefined && sectionSubTitle === undefined) {
      return next(
        new apiError(
          400,
          "At least one field (title or subtitle) must be provided to update"
        )
      );
    }

    if (sectionTitle !== undefined) section.sectionTitle = sectionTitle;
    if (sectionSubTitle !== undefined)
      section.sectionSubTitle = sectionSubTitle;
  }

  const saved = await section.save();

  res
    .status(isNew ? 201 : 200)
    .json(
      new apiSuccess(
        isNew ? 201 : 200,
        isNew ? "Section created successfully" : "Section updated successfully",
        saved
      )
    );
});

const addHowItWorksItems = asyncHandler(async (req, res, next) => {
  const { title, shortDescription } = req.body;

  const iconImg = req?.file;

  if (!title) {
    return next(new apiError(400, "Item title is required", null));
  }

  if (!shortDescription) {
    return next(new apiError(400, "Item title is required", null));
  }

  if (!iconImg) {
    return next(new apiError(400, "Item title is required", null));
  }

  const uploadResult = await uploadCloudinary(
    iconImg.buffer,
    "cms/how-it-works/icons"
  );
  if (!uploadResult?.secure_url) {
    return res.status(500).json(new apiError(500, "icon upload filed"));
  }

  const newItem = new howItWorkItems({
    title,
    shortDescription,
    iconImg: uploadResult.secure_url,
  });

  const savedItem = await newItem.save();

  if (!savedItem) {
    return next(
      new apiError(500, "can't save item at the moment, please try again later")
    );
  }

  res
    .status(200)
    .json(new apiSuccess(200, "Item added successfully", savedItem));
});

const updateHowItWorksItems = asyncHandler(async (req, res, next) => {
  const { title, shortDescription } = req.body;

  const iconImg = req?.file;

  console.log(title, shortDescription, iconImg);

  const { itemId } = req.params;
  console.log(itemId);

  const item = await howItWorkItems.findById(itemId);

  if (!item) {
    return next(new apiError(400, "item not found , please try again later"));
  }

  if (!title && !shortDescription && !iconImg) {
    return next(
      new apiError(
        400,
        "Nothing to update please , update at least one field ",
        null
      )
    );
  }

  item.title = title || item.title;
  item.shortDescription = shortDescription || item.shortDescription;

  if (iconImg) {
    if (item.iconImg) {
      const isDeleted = await deleteCloudinaryAsset(item.iconImg);
      if (!isDeleted) {
        return next(new apiError(500, "Error deleting icon image"));
      }
    }

    const uploadResult = await uploadCloudinary(
      iconImg.buffer,
      "cms/how-it-works/icons"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Icon upload failed"));
    }

    item.iconImg = uploadResult.secure_url;
  }

  await item.save();

  res.status(200).json(new apiSuccess(200, "Item added successfully", item));
});

const deleteHowItWorksItem = asyncHandler(async (req, res, next) => {
  const { itemId } = req.params;

  if (!itemId) {
    return next(new apiError(400, "Item ID is required"));
  }

  const item = await howItWorkItems.findById(itemId);

  if (item.iconImg) {
    const isDeleted = await deleteCloudinaryAsset(item.iconImg);
    if (!isDeleted) {
      return next(new apiError(500, "Error deleting icon image"));
    }
  }

  const isDeleted = await howItWorkItems.findByIdAndDelete(itemId);

  if (!isDeleted) {
    return next(new apiError(500, "Can't delete item at the moment"));
  }

  res.status(200).json(new apiSuccess(200, "Item deleted successfully"));
});

const getHowItWorks = asyncHandler(async (req, res) => {
  const section = await howItWorksSection.findOne();
  const items = await howItWorkItems.find();

  if (!section) {
    return res.status(404).json(new apiError(404, "Section not found"));
  }

  res.status(200).json(
    new apiSuccess(200, "Section retrieved successfully", {
      section,
      items,
    })
  );
});

const upsertSellerSubFooter = asyncHandler(async (req, res, next) => {
  const { title, subtitle, extraTxt, btnTxt } = req.body;

  if (!title || !subtitle) {
    return next(new apiError(400, "Title and Subtitle are required"));
  }

  let section = await sellerSubFooter.findOne();

  if (section) {
    section.title = section.title || title;
    section.subtitle = subtitle || section.subtitle;
    section.extraTxt = extraTxt || section.extraTxt;
    section.btnTxt = btnTxt || section.btnTxt;

    const updatedSection = await section.save();
    return res
      .status(200)
      .json(
        new apiSuccess(200, "Section updated successfully", updatedSection)
      );
  } else {
    const newSection = new sellerSubFooter({
      title,
      subtitle,
      extraTxt,
      btnTxt,
    });

    const createdSection = await newSection.save();
    return res
      .status(201)
      .json(
        new apiSuccess(201, "Section created successfully", createdSection)
      );
  }
});

const getSellerSubFooter = asyncHandler(async (req, res, next) => {
  const section = await sellerSubFooter.findOne();

  if (!section) {
    return next(new apiError(404, "Section not found"));
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "Section retrieved successfully", section));
});


module.exports = {
  upsertSellerHero,
  getSellerHero,
  createUpdateWhySellWithUs,
  addWhyWhySellWithUsItems,
  updateWhySellWithUsItems,
  deleteWhySellWithUsItem,
  getWhySellWithUs,
  createUpdateHowItWorks,
  addHowItWorksItems,
  updateHowItWorksItems,
  deleteHowItWorksItem,
  getHowItWorks,
  upsertSellerSubFooter,
  getSellerSubFooter,
};
