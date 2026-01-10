const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { Property } = require("../Schema/property.schema");
const {
  uploadCloudinary,
  deleteCloudinaryAsset,
} = require("../Helpers/uploadCloudinary");
const { decodeSessionToken, geocodeAddress } = require("../Helpers/helper");
const { user } = require("../Schema/user.schema");
const { mailSender } = require("../Helpers/emailSender");
const { savedSearch } = require("../Schema/property.searched.schema");
const { propertyHero } = require("../Schema/property.hero.schema");
const mongoose = require("mongoose");
const { featuredCms } = require("../Schema/featured.section.content.schema");
const { Category } = require("../Schema/category.schema");
const { categorySection } = require("../Schema/category.section.schema");

const addProperty = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);

  if (decodedData?.userData?.role !== "seller") {
    return next(
      new apiError(401, "Only seller can add property listing", null, false)
    );
  }

  const {
    propertyName,
    description,
    propertyType,
    listingType,
    fullAddress,
    city,
    state,
    price,
    bedrooms,
    bathrooms,
    yearBuilt,
    areaInMeter,
    areaInSqMeter,
    amenities,
    category,
  } = req.body;

  const addressString = `${fullAddress}, ${city}, ${state}`;
  const { lat, lng } = await geocodeAddress(addressString);

  const files = req.files || {};
  const photoFiles = files.photos || [];
  const videoFiles = files.video || [];

  const errors = {};

  if (!propertyName) errors.propertyName = "Property name is required";
  if (!description) errors.description = "Description is required";
  if (!propertyType) errors.propertyType = "Property type is required";
  if (!listingType) errors.listingType = "Listing type is required";
  if (!fullAddress) errors.fullAddress = "Full address is required";
  if (!city) errors.city = "City name is required";
  if (!state) errors.state = "State name is required";
  if (!price && price !== 0) errors.price = "Price is required";
  if (bedrooms === undefined || bedrooms === null)
    errors.bedrooms = "Bedroom count is required";
  if (bathrooms === undefined || bathrooms === null)
    errors.bathrooms = "Bathroom count is required";
  if (!yearBuilt && yearBuilt !== 0)
    errors.yearBuilt = "Year built is required";
  if (!areaInMeter && areaInMeter !== 0)
    errors.areaInMeter = "Area in meter is required";
  if (!areaInSqMeter && areaInSqMeter !== 0)
    errors.areaInSqMeter = "Area in square meters is required";
  if (!category) errors.category = "Category is required";

  const validPropertyTypes = ["house", "apartment", "land", "commercial"];
  const validListingTypes = ["for sale", "for rent"];

  const isCategory = await Category.find();

  const validCategories = await isCategory;

  if (propertyType && !validPropertyTypes.includes(propertyType)) {
    errors.propertyType = `Property type must be one of: ${validPropertyTypes.join(
      ", "
    )}`;
  }

  if (listingType && !validListingTypes.includes(listingType)) {
    errors.listingType = `Listing type must be one of: ${validListingTypes.join(
      ", "
    )}`;
  }

  if (category && !validCategories.includes(category)) {
    errors.category = `Category must be one of: ${validCategories.join(", ")}`;
  }

  const priceNumber = Number(price);
  const bedroomsNumber = Number(bedrooms);
  const bathroomsNumber = Number(bathrooms);
  const yearBuiltNumber = Number(yearBuilt);
  const areaInMeterNumber = Number(areaInMeter);
  const areaInSqMeterNumber = Number(areaInSqMeter);

  if (Number.isNaN(priceNumber)) errors.price = "Price must be a number";
  if (Number.isNaN(bedroomsNumber))
    errors.bedrooms = "Bedrooms must be a number";
  else if (bedroomsNumber < 0) errors.bedrooms = "Bedrooms cannot be negative";

  if (Number.isNaN(bathroomsNumber))
    errors.bathrooms = "Bathrooms must be a number";
  else if (bathroomsNumber < 0)
    errors.bathrooms = "Bathrooms cannot be negative";

  if (Number.isNaN(yearBuiltNumber))
    errors.yearBuilt = "Year built must be a number";
  if (Number.isNaN(areaInMeterNumber))
    errors.areaInMeter = "Area in meter must be a number";
  if (Number.isNaN(areaInSqMeterNumber))
    errors.areaInSqMeter = "Area in square meters must be a number";

  if (Object.keys(errors).length > 0) {
    return next(new apiError(400, "Validation error", errors, false));
  }

  const normalizedAmenities = Array.isArray(amenities)
    ? amenities
    : amenities
    ? [amenities]
    : [];

  const media = [];

  for (const file of photoFiles) {
    const result = await uploadCloudinary(file.buffer, "property/media/photos");
    if (!result?.secure_url) {
      return next(
        new apiError(
          500,
          "Failed to upload one of the property images",
          null,
          false
        )
      );
    }
    media.push({ url: result.secure_url, fileType: "image" });
  }

  for (const file of videoFiles) {
    const result = await uploadCloudinary(file.buffer, "property/media/videos");
    if (!result?.secure_url) {
      return next(
        new apiError(500, "Failed to upload property video", null, false)
      );
    }
    media.push({ url: result.secure_url, fileType: "video" });
  }

  if (media.length === 0) {
    return next(
      new apiError(
        400,
        "At least one media is required",
        { media: "Upload at least 1 image/video" },
        false
      )
    );
  }

  const createdProperty = await Property.create({
    propertyName,
    description,
    propertyType,
    listingType,
    fullAddress,
    city,
    state,
    price: priceNumber,
    bedrooms: bedroomsNumber,
    bathrooms: bathroomsNumber,
    yearBuilt: yearBuiltNumber,
    areaInMeter: areaInMeterNumber,
    areaInSqMeter: areaInSqMeterNumber,
    amenities: normalizedAmenities,
    media,
    category,
    location: {
      geo: {
        type: "Point",
        coordinates: [lng, lat],
      },
      lat,
      lng,
    },
    author: decodedData?.userData?.userId,
  });

  return res
    .status(201)
    .json(
      new apiSuccess(
        201,
        "Property created successfully",
        createdProperty,
        false
      )
    );
});

const getMyProperty = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);

  const userId = decodedData?.userData?.userId;

  if (!userId) {
    return next(new apiError(401, "Unauthorized request", null, false));
  }

  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "10", 10), 1),
    100
  );
  const skip = (page - 1) * limit;

  const filter = { author: userId };

  const [myProperties, total] = await Promise.all([
    Property.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Property.countDocuments(filter),
  ]);

  if (total < 1) {
    return next(
      new apiError(404, "You don't have any listing currently", null, false)
    );
  }

  const totalPages = Math.ceil(total / limit);

  return res.status(200).send(
    new apiSuccess(
      200,
      "Property listing retrieved successfully",
      {
        items: myProperties,
        pagination: {
          totalItems: total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      true,
      null
    )
  );
});

const getAllProperties = asyncHandler(async (req, res, next) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "10", 10), 1),
    100
  );
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.search) {
    const search = String(req.query.search).trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { propertyName: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }
  }

  if (req.query.propertyType) {
    filter.propertyType = String(req.query.propertyType).trim();
  }

  if (req.query.category) {
    filter.category = String(req.query.category).trim();
  }

  if (req.query.listingType) {
    filter.listingType = String(req.query.listingType).trim();
  }

  if (req.query.location) {
    const location = String(req.query.location).trim();
    if (location) {
      const escaped = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { city: { $regex: escaped, $options: "i" } },
            { state: { $regex: escaped, $options: "i" } },
          ],
        });
      } else {
        filter.$or = [
          { city: { $regex: escaped, $options: "i" } },
          { state: { $regex: escaped, $options: "i" } },
        ];
      }
    }
  }

  const minPriceRaw = req.query.minPrice;
  const maxPriceRaw = req.query.maxPrice;

  const hasMinPrice =
    minPriceRaw !== undefined && String(minPriceRaw).trim() !== "";
  const hasMaxPrice =
    maxPriceRaw !== undefined && String(maxPriceRaw).trim() !== "";

  if (hasMinPrice || hasMaxPrice) {
    const minPrice = hasMinPrice ? Number(minPriceRaw) : undefined;
    const maxPrice = hasMaxPrice ? Number(maxPriceRaw) : undefined;

    if (hasMinPrice && Number.isNaN(minPrice)) {
      return next(new apiError(400, "minPrice must be a number", null, false));
    }
    if (hasMaxPrice && Number.isNaN(maxPrice)) {
      return next(new apiError(400, "maxPrice must be a number", null, false));
    }

    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  if (
    req.query.bedrooms !== undefined &&
    String(req.query.bedrooms).trim() !== ""
  ) {
    const b = Number(req.query.bedrooms);
    if (Number.isNaN(b))
      return next(new apiError(400, "bedrooms must be a number", null, false));
    filter.bedrooms = b;
  } else if (
    req.query.minBedrooms !== undefined &&
    String(req.query.minBedrooms).trim() !== ""
  ) {
    const mb = Number(req.query.minBedrooms);
    if (Number.isNaN(mb))
      return next(
        new apiError(400, "minBedrooms must be a number", null, false)
      );
    filter.bedrooms = { $gte: mb };
  }

  if (
    req.query.bathrooms !== undefined &&
    String(req.query.bathrooms).trim() !== ""
  ) {
    const b = Number(req.query.bathrooms);
    if (Number.isNaN(b))
      return next(new apiError(400, "bathrooms must be a number", null, false));
    filter.bathrooms = b;
  } else if (
    req.query.minBathrooms !== undefined &&
    String(req.query.minBathrooms).trim() !== ""
  ) {
    const mb = Number(req.query.minBathrooms);
    if (Number.isNaN(mb))
      return next(
        new apiError(400, "minBathrooms must be a number", null, false)
      );
    filter.bathrooms = { $gte: mb };
  }

  if (req.query.amenities) {
    const amenitiesArr = Array.isArray(req.query.amenities)
      ? req.query.amenities
      : [req.query.amenities];

    const cleaned = amenitiesArr.map((a) => String(a).trim()).filter(Boolean);

    if (cleaned.length) {
      filter.amenities = { $all: cleaned };
    }
  }

  const sortKey = String(req.query.sort || "newest")
    .trim()
    .toLowerCase();

  const sortMap = {
    newest: { createdAt: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    popular: { views: -1 },
  };

  const sort = sortMap[sortKey] || sortMap.newest;

  const [items, total] = await Promise.all([
    Property.find(filter).sort(sort).skip(skip).limit(limit),
    Property.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  if (total < 1) {
    return next(
      new apiError(404, "No listing available currently", null, false)
    );
  }

  return res.status(200).send(
    new apiSuccess(
      200,
      "Property listing retrieved successfully",
      {
        items,
        pagination: {
          totalItems: total,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        appliedFilters: { ...req.query },
      },
      true,
      null
    )
  );
});

const requestATour = asyncHandler(async (req, res, next) => {
  const { phoneNumber, message, date, propertyId } = req.body;

  const decodedData = await decodeSessionToken(req);
  const userId = decodedData?.userData?.userId;

  const isExistedBuyer = await user.findById(userId);
  const isExistedProperty = await Property.findById(propertyId).populate(
    "author",
    "firstName email _id"
  );

  if (!isExistedProperty) {
    return next(
      new apiError(
        401,
        "Can't find property at the moment, please try again later",
        null,
        false
      )
    );
  }

  if (!isExistedBuyer) {
    return next(
      new apiError(
        401,
        "Can't connect your account , please try again later",
        null,
        false
      )
    );
  }

  if (!phoneNumber) {
    return next(new apiError(400, "Phone number is Required", null, false));
  }

  if (!message) {
    return next(new apiError(400, "Message filed is Required", null, false));
  }

  const authorId = isExistedProperty.author?._id || isExistedProperty.author;

  if (authorId && isExistedBuyer._id.equals(authorId)) {
    return next(new apiError(400, "You can't message yourself", null, false));
  }

  const data = {
    buyerName: isExistedBuyer.firstName,
    buyerEmail: isExistedBuyer.email,
    buyerPhone: isExistedBuyer.phoneNumber,
    date: date,
    message: message,
    sellerName: isExistedProperty.author.firstName,
    email: isExistedProperty.author.email,
    propertyName: isExistedProperty.propertyName,
  };

  const isMailSent = await mailSender({
    type: "request-tour",
    subject: "A Buyer Wants to Tour Your Property",
    data,
    emailAdress: isExistedProperty.author.email,
  });

  if (!isMailSent) {
    return next(
      new apiError(
        500,
        "Can't send tour request at the moment, please try again later",
        null,
        false
      )
    );
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "Successfully sent tour request"));
});

const toggleFavouriteListing = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;
  const decodedData = await decodeSessionToken(req);
  const userId = decodedData?.userData?.userId;

  if (decodedData?.userData?.role !== "buyer") {
    return next(
      new apiError(401, "Only buyer can add favourite listings", null, false)
    );
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    return next(
      new apiError(404, "Requested property doesn't exist", null, false)
    );
  }

  const isFavourite = property.favourites?.some(
    (id) => id.toString() === userId
  );

  if (isFavourite) {
    property.favourites.pull(userId);
  } else {
    property.favourites.push(userId);
  }

  await property.save();

  const safeProperty = await Property.findById(propertyId).select(
    "-author -favourites -__v"
  );

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        isFavourite
          ? "Property removed from favourite list"
          : "Property added to favourite list",
        safeProperty,
        true
      )
    );
});

const getMyFavouritesListing = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);
  const userId = decodedData?.userData?.userId;

  if (decodedData?.userData?.role !== "buyer") {
    return next(
      new apiError(401, "Only buyer has favourite listings", null, false)
    );
  }

  const myFavouriteListing = await Property.find({ favourites: userId }).select(
    "-author -favourites"
  );

  if (myFavouriteListing.length === 0) {
    return next(
      new apiError(
        404,
        "Currently you don't have any favourite listing",
        null,
        false
      )
    );
  }

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Successfully retrieved favourite listings",
        myFavouriteListing,
        true
      )
    );
});

const createSavedSearch = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);
  const userId = decodedData?.userData?.userId;

  if (!userId) {
    return next(new apiError(401, "Unauthorized", null, false));
  }

  // If you only want buyers to use it (same as favourites):
  if (decodedData?.userData?.role !== "buyer") {
    return next(
      new apiError(401, "Only buyer can create saved searches", null, false)
    );
  }

  const { title, filters, alertsEnabled, frequency } = req.body;

  if (!title) {
    return next(new apiError(400, "Title is required", null, false));
  }

  // Optional: basic filter validation/sanitization
  const payload = {
    userId,
    title: title?.trim(),
    filters: {
      city: filters?.city,
      priceMin: filters?.priceMin,
      priceMax: filters?.priceMax,
      propertyType: filters?.propertyType,
      beds: filters?.beds,
      baths: filters?.baths,
    },
    alertsEnabled: alertsEnabled ?? true,
    frequency: frequency ?? "daily",
    lastCheckedAt: new Date(),
  };

  const created = await savedSearch.create(payload);

  return res
    .status(201)
    .json(
      new apiSuccess(201, "Saved search created successfully", created, true)
    );
});

const getMySavedSearches = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);
  const userId = decodedData?.userData?.userId;

  if (!userId) {
    return next(new apiError(401, "Unauthorized", null, false));
  }

  if (decodedData?.userData?.role !== "buyer") {
    return next(
      new apiError(401, "Only buyer can view saved searches", null, false)
    );
  }

  const searches = await savedSearch.find({ userId }).sort({ createdAt: -1 });

  if (!searches || searches.length === 0) {
    return next(new apiError(404, "No saved searches found", null, false));
  }

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Successfully retrieved saved searches",
        searches,
        true
      )
    );
});

const upsertPropertyHero = asyncHandler(async (req, res, next) => {
  const { title, description, propertyType } = req.body;
  const bgImg = req.file;

  let hero = await propertyHero.findOne();

  if (!hero) {
    if (!bgImg) {
      return next(new apiError(400, "Hero background image is required"));
    }

    const uploadResult = await uploadCloudinary(
      bgImg.buffer,
      "cms/landing/hero"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Hero background upload failed"));
    }

    hero = await propertyHero.create({
      title,
      description,
      propertyType,
      bgImg: uploadResult.secure_url,
    });

    return res
      .status(201)
      .json(new apiSuccess(201, "Property hero created successfully", hero));
  }

  hero.title = title ?? hero.title;
  hero.description = description ?? hero.description;
  hero.propertyType = propertyType ?? hero.propertyType;

  if (bgImg) {
    if (hero.bgImg) {
      const isDeleted = await deleteCloudinaryAsset(hero.bgImg);
      if (!isDeleted) {
        return next(new apiError(500, "Error deleting old hero background"));
      }
    }

    const uploadResult = await uploadCloudinary(
      bgImg.buffer,
      "cms/landing/hero"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Hero background upload failed"));
    }

    hero.bgImg = uploadResult.secure_url;
  }

  await hero.save();
  return res
    .status(200)
    .json(new apiSuccess(200, "Property details updated successfully", hero));
});

const getPropertyHero = asyncHandler(async (req, res, next) => {
  let hero = await propertyHero.findOne();

  if (!hero) {
    return next(new apiError(404, "Property hero not found"));
  }

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Successfully extracted property hero details", hero)
    );
});

const setFeaturedProperties = asyncHandler(async (req, res, next) => {
  const { propertyIds, title, subtitle } = req.body;

  const MAX_FEATURED = 6;

  if (title !== undefined || subtitle !== undefined) {
    await featuredCms.findOneAndUpdate(
      {},
      {
        ...(title !== undefined ? { title } : {}),
        ...(subtitle !== undefined ? { subtitle } : {}),
      },
      { upsert: true, new: true }
    );
  }

  if (!Array.isArray(propertyIds)) {
    return next(new apiError(400, "propertyIds must be an array"));
  }

  const uniqueIds = [...new Set(propertyIds.map(String))];

  if (uniqueIds.length === 0) {
    await Property.updateMany(
      { isFeatured: true },
      { $set: { isFeatured: false, featuredOrder: null, featuredAt: null } }
    );

    return res.status(200).json(
      new apiSuccess(200, "Featured section updated successfully", {
        title,
        subtitle,
        items: [],
      })
    );
  }

  if (uniqueIds.length > MAX_FEATURED) {
    return next(
      new apiError(400, `You can feature max ${MAX_FEATURED} properties`)
    );
  }

  for (const id of uniqueIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new apiError(400, `Invalid property id: ${id}`));
    }
  }

  const foundCount = await Property.countDocuments({ _id: { $in: uniqueIds } });
  if (foundCount !== uniqueIds.length) {
    return next(new apiError(404, "One or more properties not found"));
  }

  await Property.updateMany(
    { isFeatured: true, _id: { $nin: uniqueIds } },
    { $set: { isFeatured: false, featuredOrder: null, featuredAt: null } }
  );

  const now = new Date();
  const ops = uniqueIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id },
      update: {
        $set: {
          isFeatured: true,
          featuredOrder: index + 1,
          featuredAt: now,
        },
      },
    },
  }));

  await Property.bulkWrite(ops);

  const items = await Property.find({ _id: { $in: uniqueIds } })
    .select(
      "propertyName price city state media propertyType listingType featuredOrder isFeatured"
    )
    .sort({ featuredOrder: 1 })
    .lean();

  const content = await featuredCms.findOne().lean();

  return res.status(200).json(
    new apiSuccess(200, "Featured section updated successfully", {
      title: content?.title,
      subtitle: content?.subtitle,
      items,
    })
  );
});

const getFeaturedProperties = asyncHandler(async (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit || "6", 10), 30);

  const content = await featuredCms.findOne();

  const items = await Property.find({ isFeatured: true })
    .select(
      "propertyName price city state media propertyType listingType bedrooms bathrooms areaInSqMeter featuredOrder featuredAt"
    )
    .sort({ featuredOrder: 1, featuredAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return res.status(200).json(
    new apiSuccess(200, "Successfully extracted featured section", {
      title: content?.title,
      subtitle: content?.subtitle,
      items,
    })
  );
});

const upsertCategory = asyncHandler(async (req, res, next) => {
  const { name, title, section_title, section_sub_title } = req.body;
  const bgImg = req.file;
  const categoryId = req.params.categoryId;

  console.log(section_title, section_sub_title);

  let createdCategorySection = null;

  if (section_title || section_sub_title) {
    const isExistedCategorySection = await categorySection.findOne();

    if (isExistedCategorySection) {
      isExistedCategorySection.title =
        section_title || isExistedCategorySection.title;
      isExistedCategorySection.subTitle =
        section_sub_title || isExistedCategorySection.subTitle;

      createdCategorySection = await isExistedCategorySection.save();
    } else {
      const newSection = new categorySection({
        title: section_title,
        subtitle: section_sub_title,
      });

      createdCategorySection = await newSection.save();
    }

    // If only section data is provided, don't create or update the category
    if (!name || !title || !bgImg) {
      return res.status(200).json(
        new apiSuccess(200, "Section updated successfully", {
          categorySection: createdCategorySection,
        })
      );
    }
  }

  // If no categoryId is provided, proceed with category creation
  if (!categoryId) {
    // Validate category creation data
    if (!name || !title || !bgImg) {
      return res
        .status(400)
        .json(
          new apiError(400, "Category name, title, and image are required")
        );
    }

    // Check if the category already exists by name
    const isExistedCategory = await Category.findOne({ name });
    if (isExistedCategory) {
      return next(new apiError(400, "Category already exists"));
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadCloudinary(
      bgImg.buffer,
      "cms/categories/bg"
    );
    if (!uploadResult?.secure_url) {
      return res
        .status(500)
        .json(new apiError(500, "Category image upload failed"));
    }

    // Create new category
    const newCategory = new Category({
      name,
      title,
      bgImg: uploadResult.secure_url,
    });

    const createdCategory = await newCategory.save();

    return res.status(201).json(
      new apiSuccess(201, "Category created successfully", {
        category: createdCategory,
        categorySection: createdCategorySection,
      })
    );
  } else {
    // If categoryId is provided, proceed with category update
    const existingCategory = await Category.findById(categoryId);
    if (!existingCategory) {
      return res.status(404).json(new apiError(404, "Category not found"));
    }

    // Update category fields if provided
    existingCategory.name = name || existingCategory.name;
    existingCategory.title = title || existingCategory.title;

    if (bgImg) {
      try {
        // Delete old image if a new one is provided
        if (existingCategory.bgImg) {
          const isDeleted = await deleteCloudinaryAsset(existingCategory.bgImg);
          if (!isDeleted) {
            return res
              .status(500)
              .json(new apiError(500, "Error deleting old image"));
          }
        }

        // Upload the new image
        const uploadResult = await uploadCloudinary(
          bgImg.buffer,
          "cms/categories/bg"
        );
        if (!uploadResult?.secure_url) {
          return res
            .status(500)
            .json(new apiError(500, "Profile picture upload failed"));
        }

        existingCategory.bgImg = uploadResult.secure_url;
      } catch (error) {
        console.error("Cloudinary error:", error);
        return res
          .status(500)
          .json(new apiError(500, "Error updating category image"));
      }
    }

    const updatedCategory = await existingCategory.save();

    return res.status(200).json(
      new apiSuccess(200, "Category updated successfully", {
        category: updatedCategory,
        categorySection: createdCategorySection,
      })
    );
  }
});

const getCategorySection = asyncHandler(async (req, res, next) => {
  const categories = await Category.find();

  const categoryWithPropertyCount = await Promise.all(
    categories.map(async (category) => {
      const propertyCount = await Property.countDocuments({
        category: category._id,
      });
      return {
        ...category.toObject(),
        propertyCount,
      };
    })
  );

  // Retrieve the category section data (if needed)
  const sectionData = await categorySection.findOne();

  // Respond with category data and section data
  res.status(200).json(
    new apiSuccess(200, "Category section data retrieved successfully", {
      sectionData,
      categories: categoryWithPropertyCount,
    })
  );
});

const deleteCategory = asyncHandler(async (req, res, next) => {
  console.log(categoryId, "this is the category id");

  const category = await Category.findById(categoryId);

  if (!category) {
    return next(new apiError(404, "Category not found"));
  }

  const deletedCategory = await Category.findByIdAndDelete(categoryId);

  if (!deletedCategory) {
    return new apiError(
      500,
      "Can't delete category at the moment , please try again later"
    );
  }

  return res
    .status(200)
    .json(new apiError(200, "Successfully deleted category ", deletedCategory));
});

module.exports = {
  addProperty,
  getMyProperty,
  getAllProperties,
  requestATour,
  toggleFavouriteListing,
  getMyFavouritesListing,
  createSavedSearch,
  getMySavedSearches,
  upsertPropertyHero,
  getPropertyHero,
  setFeaturedProperties,
  getFeaturedProperties,
  upsertCategory,
  getCategorySection,
  deleteCategory,
};
