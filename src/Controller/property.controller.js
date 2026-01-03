const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { Property } = require("../Schema/property.schema");
const { uploadCloudinary } = require("../Helpers/uploadCloudinary");
const { decodeSessionToken } = require("../Helpers/helper");

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
  const validCategories = ["residential", "commercial", "industrial", "land"];

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

  // Normalize amenities
  const normalizedAmenities = Array.isArray(amenities)
    ? amenities
    : amenities
    ? [amenities]
    : [];

  // Upload media to Cloudinary
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

    media.push({
      url: result.secure_url,
      fileType: "image",
    });
  }

  for (const file of videoFiles) {
    const result = await uploadCloudinary(file.buffer, "property/media/videos");
    if (!result?.secure_url) {
      return next(
        new apiError(500, "Failed to upload property video", null, false)
      );
    }

    media.push({
      url: result.secure_url,
      fileType: "video",
    });
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

const getAllproperties = asyncHandler(async (req, res, next) => {
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

module.exports = { addProperty, getMyProperty, getAllproperties };
