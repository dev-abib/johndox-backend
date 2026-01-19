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
const { serviceSection } = require("../Schema/section.schema");
const {
  listPropertySection,
} = require("../Schema/list.property.section.schema");
const {
  whyChooseUsSection,
} = require("../Schema/why.choose.us.section.cms.schema");
const { whyChooseUsItems } = require("../Schema/why.choose.items.schema");
const axios = require("axios");
const { UserRating } = require("../Schema/user.rating.schema");

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
  if (!addressString.trim()) {
    return next(new apiError(400, "Invalid address provided", null, false));
  }

  const key = process.env.LOCATIONIQ_KEY;
  if (!key) return next(new apiError(500, "No Location key provided"));

  const url = "https://us1.locationiq.com/v1/search";

  const response = await axios
    .get(url, {
      params: {
        key,
        q: fullAddress,
        format: "json",
        limit: 1,
        addressdetails: 1,
        normalizecity: 1,
      },
      timeout: 10000,
    })
    .catch((error) => {
      if (error.response) {
        return next(
          new apiError(
            error.response.status,
            `${error.response.data.error} address` ||
              "Geocoding request failed.",
            null,
            false
          )
        );
      } else if (error.request) {
        return next(
          new apiError(
            500,
            "Network error or no response from the geocoding service.",
            null,
            false
          )
        );
      } else {
        return next(
          new apiError(
            500,
            error.message || "An unknown error occurred during geocoding.",
            null,
            false
          )
        );
      }
    });

  if (!response?.data || response.data.length === 0) {
    return next(
      new apiError(400, "Unable to geocode the provided address", null, false)
    );
  }

  const lat = Number(response.data[0].lat);
  const lng = Number(response.data[0].lon);

  // Validate lat and lng
  if (!lat || !lng) {
    return next(new apiError(401, "Address not found."));
  }

  if (!lat || !lng) {
    return next(
      new apiError(400, "Unable to geocode the provided address", null, false)
    );
  }

  const files = req.files || {};
  const photoFiles = files.photos || [];
  const videoFiles = Array.isArray(files?.video)
    ? files.video
    : files?.video
      ? [files.video]
      : [];

  if (!videoFiles.length) {
    return next(new apiError(400, "Please include the video with the request"));
  }

  if (videoFiles.length > 1) {
    return next(new apiError(400, "You can add only one video"));
  }

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

  // Fetch the category by name (category is passed as the name by the user)
  const validCategory = await Category.findOne({ name: category });

  if (!validCategory) {
    errors.category = `Category '${category}' is not valid.`;
  }

  // Validate property type
  if (propertyType && !validPropertyTypes.includes(propertyType)) {
    errors.propertyType = `Property type must be one of: ${validPropertyTypes.join(
      ", "
    )}`;
  }

  // Validate listing type
  if (listingType && !validListingTypes.includes(listingType)) {
    errors.listingType = `Listing type must be one of: ${validListingTypes.join(
      ", "
    )}`;
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

  // Normalize amenities to array if it's not already
  const normalizedAmenities = Array.isArray(amenities)
    ? amenities
    : amenities
      ? [amenities]
      : [];

  const media = [];

  // Handle photo file uploads
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

  // Handle video file uploads
  for (const file of videoFiles) {
    const result = await uploadCloudinary(file.buffer, "property/media/videos");
    if (!result?.secure_url) {
      return next(
        new apiError(500, "Failed to upload property video", null, false)
      );
    }
    media.push({ url: result.secure_url, fileType: "video" });
  }

  // Ensure at least one media file is uploaded
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

  // Create the new property in the database
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
    category: validCategory._id,
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

  const User = await user.findById(decodedData?.userData?.userId);

  if (User) {
    User.activeListings = User.activeListings + 1;
    await User.save();
  }

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

const updateProperty = asyncHandler(async (req, res, next) => {
  const decodedData = await decodeSessionToken(req);

  if (decodedData?.userData?.role !== "seller") {
    return next(
      new apiError(401, "Only seller can update property listing", null, false)
    );
  }

  const { propertyId } = req.params;

  const property = await Property.findById(propertyId);

  if (!property) {
    return next(new apiError(404, "Property not found", null, false));
  }

  if (property.author.toString() !== decodedData?.userData?.userId) {
    return next(
      new apiError(
        403,
        "You are not authorized to update this property",
        null,
        false
      )
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
    deleteImages = [],
    // ✅ deleteVideos removed
  } = req.body;

  let deleteImagesArray = deleteImages;
  if (typeof deleteImages === "string") {
    try {
      deleteImagesArray = JSON.parse(deleteImages);
    } catch (err) {
      return next(
        new apiError(
          400,
          "Invalid deleteImages format, must be a JSON array",
          null,
          false
        )
      );
    }
  }

  const addressString = `${fullAddress}, ${city}, ${state}`;
  if (!addressString.trim()) {
    return next(new apiError(400, "Invalid address provided", null, false));
  }

  const key = process.env.LOCATIONIQ_KEY;
  if (!key) return next(new apiError(500, "No Location key provided"));

  const url = "https://us1.locationiq.com/v1/search";

  const response = await axios
    .get(url, {
      params: {
        key,
        q: fullAddress,
        format: "json",
        limit: 1,
        addressdetails: 1,
        normalizecity: 1,
      },
      timeout: 10000,
    })
    .catch((error) => {
      if (error.response) {
        return next(
          new apiError(
            error.response.status,
            `${error.response.data.error} address` ||
              "Geocoding request failed.",
            null,
            false
          )
        );
      } else if (error.request) {
        return next(
          new apiError(
            500,
            "Network error or no response from the geocoding service.",
            null,
            false
          )
        );
      } else {
        return next(
          new apiError(
            500,
            error.message || "An unknown error occurred during geocoding.",
            null,
            false
          )
        );
      }
    });

  if (!response?.data || response.data.length === 0) {
    return next(
      new apiError(400, "Unable to geocode the provided address", null, false)
    );
  }

  const lat = Number(response.data[0].lat);
  const lng = Number(response.data[0].lon);

  if (!lat || !lng) {
    return next(new apiError(401, "Address not found."));
  }

  if (!lat || !lng) {
    return next(
      new apiError(400, "Unable to geocode the provided address", null, false)
    );
  }

  const files = req.files || {};
  const photoFiles = files.photos || [];
  const videoFiles = files.video || [];

  const errors = {};

  if (price && isNaN(price)) errors.price = "Price must be a number";
  if (bedrooms && isNaN(bedrooms))
    errors.bedrooms = "Bedrooms must be a number";
  if (bathrooms && isNaN(bathrooms))
    errors.bathrooms = "Bathrooms must be a number";
  if (yearBuilt && isNaN(yearBuilt))
    errors.yearBuilt = "Year built must be a number";
  if (areaInMeter && isNaN(areaInMeter))
    errors.areaInMeter = "Area in meter must be a number";
  if (areaInSqMeter && isNaN(areaInSqMeter))
    errors.areaInSqMeter = "Area in square meters must be a number";

  if (Object.keys(errors).length > 0) {
    return next(new apiError(400, "Validation error", errors, false));
  }

  const normalizedAmenities = Array.isArray(amenities)
    ? amenities
    : amenities
      ? [amenities]
      : [];

  let updatedImages = [
    ...(property.media.filter((m) => m.fileType === "image") || []),
  ];

  let updatedVideos = [
    ...(property.media.filter((m) => m.fileType === "video") || []),
  ];

  // Delete selected images from Cloudinary
  if (Array.isArray(deleteImagesArray) && deleteImagesArray.length > 0) {
    try {
      for (const imageUrl of deleteImagesArray) {
        const result = await deleteCloudinaryAsset(imageUrl);
        if (result) {
          updatedImages = updatedImages.filter((img) => img.url !== imageUrl);
        }
      }
    } catch (err) {
      console.error("Error deleting images from Cloudinary:", err);
      return next(
        new apiError(500, "Failed to delete old images", null, false)
      );
    }
  }

  // Upload new files (photos and videos)

  // Upload new photos
  for (const file of photoFiles) {
    const result = await uploadCloudinary(file.buffer, "property/media/photos");
    if (!result?.secure_url) {
      return next(new apiError(500, "Failed to upload new photo", null, false));
    }
    updatedImages.push({ url: result.secure_url, fileType: "image" });
  }

  // ✅ SINGLE VIDEO LOGIC:
  // If user uploads a new video, delete the previous one and replace it.
  if (videoFiles.length > 0) {
    // Delete existing video if any
    if (updatedVideos.length > 0) {
      try {
        await deleteCloudinaryAsset(updatedVideos[0].url);
      } catch (err) {
        console.error("Error deleting video from Cloudinary:", err);
        return next(
          new apiError(500, "Failed to delete old video", null, false)
        );
      }
    }

    // Upload the new video (first one only)
    const file = videoFiles[0];
    const result = await uploadCloudinary(file.buffer, "property/media/videos");

    if (!result?.secure_url) {
      return next(new apiError(500, "Failed to upload new video", null, false));
    }

    // Replace with the new video
    updatedVideos = [{ url: result.secure_url, fileType: "video" }];
  }

  // Combine images and videos
  const updatedMedia = [...updatedImages, ...updatedVideos];

  // Ensure at least one image/video is uploaded
  if (updatedMedia.length === 0) {
    return next(
      new apiError(
        400,
        "At least one media is required",
        { media: "Upload at least 1 image/video" },
        false
      )
    );
  }

  // Update the property in the database with the provided fields, or keep the existing ones if not provided
  property.propertyName = propertyName || property.propertyName;
  property.description = description || property.description;
  property.propertyType = propertyType || property.propertyType;
  property.listingType = listingType || property.listingType;
  property.fullAddress = fullAddress || property.fullAddress;
  property.city = city || property.city;
  property.state = state || property.state;
  property.price = price || property.price;
  property.bedrooms = bedrooms || property.bedrooms;
  property.bathrooms = bathrooms || property.bathrooms;
  property.yearBuilt = yearBuilt || property.yearBuilt;
  property.areaInMeter = areaInMeter || property.areaInMeter;
  property.areaInSqMeter = areaInSqMeter || property.areaInSqMeter;
  property.amenities =
    normalizedAmenities.length > 0 ? normalizedAmenities : property.amenities;
  property.media = updatedMedia.length > 0 ? updatedMedia : property.media;

  property.category = category
    ? (await Category.findOne({ name: category }))._id
    : property.category;

  // Handle lat/lng: if lat and lng are provided, update; if not, use existing values
  property.location.geo.coordinates =
    lat && lng ? [lng, lat] : property.location.geo.coordinates;
  property.location.lat = lat ?? property.location.lat;
  property.location.lng = lng ?? property.location.lng;

  await property.save();

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Property updated successfully", property, false)
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
    Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(), // Use .lean() for performance if you don't need Mongoose document methods
    Property.countDocuments(filter),
  ]);

  if (total < 1) {
    return next(
      new apiError(404, "You don't have any listing currently", null, false)
    );
  }

  // Check if each property is a favorite for the logged-in user
  const propertiesWithFavorites = myProperties.map((property) => {
    const isFavorite = property.favourites.includes(userId);
    return { ...property, isFavorite };
  });

  const totalPages = Math.ceil(total / limit);

  return res.status(200).send(
    new apiSuccess(
      200,
      "Property listing retrieved successfully",
      {
        items: propertiesWithFavorites,
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

const deleteProperty = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;

  const property = await Property.findById(propertyId);

  if (!property) {
    return next(new apiError(404, "Property not found", null, false));
  }

  const decodedData = await decodeSessionToken(req);

  if (property.author.toString() !== decodedData?.userData?.userId) {
    return next(
      new apiError(
        403,
        "You are not authorized to delete this property",
        null,
        false
      )
    );
  }

  const User = await user.findById(decodedData?.userData?.userId);

  if (User) {
    User.activeListings = User.activeListings - 1;
    await User.save();
  }

  try {
    for (const media of property.media.filter((m) => m.fileType === "image")) {
      const result = await deleteCloudinaryAsset(media.url);
      if (!result) {
        return next(
          new apiError(
            500,
            "Failed to delete image from Cloudinary",
            null,
            false
          )
        );
      }
    }

    for (const media of property.media.filter((m) => m.fileType === "video")) {
      const result = await deleteCloudinaryAsset(media.url);
      if (!result) {
        return next(
          new apiError(
            500,
            "Failed to delete video from Cloudinary",
            null,
            false
          )
        );
      }
    }
  } catch (err) {
    console.error("Error deleting assets from Cloudinary:", err);
    return next(
      new apiError(500, "Error deleting assets from Cloudinary", null, false)
    );
  }

  await Property.findByIdAndDelete(propertyId);

  return res
    .status(200)
    .json(
      new apiSuccess(
        200,
        "Property and its assets deleted successfully",
        null,
        false
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

  // --- Search (propertyName / description)
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

  if (req.query.propertyType)
    filter.propertyType = String(req.query.propertyType).trim();
  if (req.query.category) filter.category = String(req.query.category).trim();
  if (req.query.listingType)
    filter.listingType = String(req.query.listingType).trim();

  // --- Location (city/state)
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

  // --- Price range
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

  // --- Bedrooms
  if (
    req.query.bedrooms !== undefined &&
    String(req.query.bedrooms).trim() !== ""
  ) {
    const b = Number(req.query.bedrooms);
    if (Number.isNaN(b)) {
      return next(new apiError(400, "bedrooms must be a number", null, false));
    }
    filter.bedrooms = b;
  } else if (
    req.query.minBedrooms !== undefined &&
    String(req.query.minBedrooms).trim() !== ""
  ) {
    const mb = Number(req.query.minBedrooms);
    if (Number.isNaN(mb)) {
      return next(
        new apiError(400, "minBedrooms must be a number", null, false)
      );
    }
    filter.bedrooms = { $gte: mb };
  }

  // --- Bathrooms
  if (
    req.query.bathrooms !== undefined &&
    String(req.query.bathrooms).trim() !== ""
  ) {
    const b = Number(req.query.bathrooms);
    if (Number.isNaN(b)) {
      return next(new apiError(400, "bathrooms must be a number", null, false));
    }
    filter.bathrooms = b;
  } else if (
    req.query.minBathrooms !== undefined &&
    String(req.query.minBathrooms).trim() !== ""
  ) {
    const mb = Number(req.query.minBathrooms);
    if (Number.isNaN(mb)) {
      return next(
        new apiError(400, "minBathrooms must be a number", null, false)
      );
    }
    filter.bathrooms = { $gte: mb };
  }

  // --- Amenities ($all)
  if (req.query.amenities) {
    const amenitiesArr = Array.isArray(req.query.amenities)
      ? req.query.amenities
      : [req.query.amenities];

    const cleaned = amenitiesArr.map((a) => String(a).trim()).filter(Boolean);

    if (cleaned.length) {
      filter.amenities = { $all: cleaned };
    }
  }

  // --- Sorting
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

  // --- Fetch properties + total
  const [items, total] = await Promise.all([
    Property.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "author",
        select: "firstName lastName email phoneNumber profilePicture",
      })
      .lean(),
    Property.countDocuments(filter),
  ]);

  if (total < 1) {
    return next(
      new apiError(404, "No listing available currently", null, false)
    );
  }

  // --- Favorite flag (safe)
  const userId = req.userId ? String(req.userId) : null;

  // --- Collect unique authorIds
  const authorIds = [
    ...new Set(
      items
        .map((p) => p?.author?._id)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];

  // --- Rating stats for all authors in one aggregation
  let ratingMap = new Map(); // authorId -> { averageRating, ratingCount }

  if (authorIds.length) {
    const stats = await UserRating.aggregate([
      {
        $match: {
          receiver: {
            $in: authorIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $group: {
          _id: "$receiver",
          averageRating: { $avg: "$rating" },
          ratingCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 1,
          averageRating: { $round: ["$averageRating", 1] },
          ratingCount: 1,
        },
      },
    ]);

    ratingMap = new Map(
      stats.map((s) => [
        String(s._id),
        {
          averageRating: s.averageRating ?? 0,
          ratingCount: s.ratingCount ?? 0,
        },
      ])
    );
  }

  // --- Attach isFavorite + author.rating (avg + count)
  const propertiesWithExtras = items.map((property) => {
    const favArr = Array.isArray(property.favourites)
      ? property.favourites
      : [];
    const isFavorite = userId
      ? favArr.map(String).includes(String(userId))
      : false;

    const aId = property?.author?._id ? String(property.author._id) : null;
    const rating = ratingMap.get(aId) || { averageRating: 0, ratingCount: 0 };

    return {
      ...property,
      isFavorite,
      author: property.author
        ? {
            ...property.author,
            rating, // ✅ { averageRating, ratingCount }
          }
        : null,
    };
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return res.status(200).send(
    new apiSuccess(
      200,
      "Property listing retrieved successfully",
      {
        items: propertiesWithExtras,
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

  // Ensure userId is cast to ObjectId before comparison
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const isFavourite = property.favourites?.some(
    (id) => id.toString() === userObjectId.toString()
  );

  if (isFavourite) {
    property.favourites.pull(userObjectId);
  } else {
    property.favourites.push(userObjectId);
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

  // Fetch the content for the featured section (title, subtitle)
  const content = await featuredCms.findOne();

  // Fetch the featured properties
  const items = await Property.find({ isFeatured: true })
    .select(
      "propertyName price city state media propertyType listingType bedrooms bathrooms areaInSqMeter featuredOrder featuredAt favourites"
    )
    .sort({ featuredOrder: 1, featuredAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  // Check if each property is a favorite for the logged-in user
  const userId = req.userId; // Assume this is set via authentication middleware
  const itemsWithFavorites = items.map((property) => {
    const isFavorite = property.favourites.includes(userId);
    return { ...property, isFavorite };
  });

  return res.status(200).json(
    new apiSuccess(200, "Successfully extracted featured section", {
      title: content?.title,
      subtitle: content?.subtitle,
      items: itemsWithFavorites,
    })
  );
});

const upsertCategory = asyncHandler(async (req, res, next) => {
  const { name, title, section_title, section_sub_title } = req.body;
  const bgImg = req.file;
  const categoryId = req.params.categoryId;

  let createdCategorySection = null;

  // Validate inputs early for section updates
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

  // Category creation and validation
  if (!categoryId) {
    // Validate category creation data
    if (!name || !title || !bgImg) {
      return res
        .status(400)
        .json(
          new apiError(400, "Category name, title, and image are required")
        );
    }

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
    // Category update logic if categoryId is provided
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
  const categoryId = req.params.categoryId;

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

const createUpdateWhyChooseSection = asyncHandler(async (req, res, next) => {
  const { sectionTitle, sectionSubTitle } = req.body;

  let section = await whyChooseUsSection.findOne();

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
    section = new whyChooseUsSection({
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

const addWhyChooseUsItems = asyncHandler(async (req, res, next) => {
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
    "cms/why-choose/icons"
  );
  if (!uploadResult?.secure_url) {
    return res.status(500).json(new apiError(500, "icon upload filed"));
  }

  const newItem = new whyChooseUsItems({
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

const updateWhyChooseUsItems = asyncHandler(async (req, res, next) => {
  const { title, shortDescription } = req.body;

  const iconImg = req?.file;

  console.log(title, shortDescription, iconImg);

  const { itemId } = req.params;
  console.log(itemId);

  const item = await whyChooseUsItems.findById(itemId);

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
      "cms/why-choose/icons"
    );
    if (!uploadResult?.secure_url) {
      return next(new apiError(500, "Icon upload failed"));
    }

    item.iconImg = uploadResult.secure_url;
  }

  await item.save();

  res.status(200).json(new apiSuccess(200, "Item added successfully", item));
});

const deleteWhyChooseItem = asyncHandler(async (req, res, next) => {
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

  const isDeleted = await whyChooseUsItems.findByIdAndDelete(itemId);

  if (!isDeleted) {
    return next(new apiError(500, "Can't delete item at the moment"));
  }

  res.status(200).json(new apiSuccess(200, "Item deleted successfully"));
});

const getWhyChooseUs = asyncHandler(async (req, res) => {
  const section = await whyChooseUsSection.findOne();

  const items = await whyChooseUsItems.find();

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

const upsertListPropertySection = asyncHandler(async (req, res, next) => {
  const { title, subtitle, extraTxt, btnTxt } = req.body;

  if (!title || !subtitle) {
    return next(new apiError(400, "Title and Subtitle are required"));
  }

  let section = await listPropertySection.findOne();

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
    const newSection = new listPropertySection({
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

const getListPropertySections = asyncHandler(async (req, res, next) => {
  const section = await listPropertySection.findOne();

  if (!section) {
    return next(new apiError(404, "Section not found"));
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "Section retrieved successfully", section));
});

const loanEstimator = asyncHandler(async (req, res, next) => {
  const { asset_price, down_payment, loan_terms_years, interest_rate } =
    req.body;

  if (!asset_price || !down_payment || !loan_terms_years || !interest_rate) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const assetPrice = parseFloat(asset_price);
  const downPayment = parseFloat(down_payment);
  const loanTermsYears = parseInt(loan_terms_years);
  const interestRate = parseFloat(interest_rate);

  const loanAmount = assetPrice - downPayment;

  const monthlyInterestRate = interestRate / 100 / 12;

  const numberOfPayments = loanTermsYears * 12;

  let monthlyPayment = 0;
  if (monthlyInterestRate > 0) {
    monthlyPayment =
      (loanAmount *
        monthlyInterestRate *
        Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
  } else {
    monthlyPayment = loanAmount / numberOfPayments;
  }

  const esitmated_price = {
    monthly_payment: monthlyPayment.toFixed(2),
    loan_amount: loanAmount.toFixed(2),
    interest_rate: interestRate,
    loan_terms_years: loanTermsYears,
  };

  return res
    .status(200)
    .json(new apiSuccess(200, "Price estimated successfully", esitmated_price));
});

const getSingleProperty = asyncHandler(async (req, res, next) => {
  const { propertyId } = req.params;

  const property = await Property.findById(propertyId).populate({
    path: "author",
    select: "firstName lastName email phoneNumber profilePicture",
  });

  if (!property) {
    return next(new apiError(404, "Property not found"));
  }

  const authorId = property?.author?._id;

  let rating = { averageRating: 0, ratingCount: 0 };

  if (authorId) {
    const stats = await UserRating.aggregate([
      { $match: { receiver: new mongoose.Types.ObjectId(authorId) } },
      {
        $group: {
          _id: "$receiver",
          averageRating: { $avg: "$rating" },
          ratingCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          averageRating: { $round: ["$averageRating", 1] },
          ratingCount: 1,
        },
      },
    ]);

    if (stats.length) rating = stats[0];
  }

  const data = property.toObject();
  data.author = {
    ...data.author,
    rating,
  };

  return res
    .status(200)
    .json(new apiSuccess(200, "Property details retrieved successfully", data));
});

const convertCurrency = asyncHandler(async (req, res, next) => {
  const { lempira } = req.body;

  if (lempira === undefined || isNaN(Number(lempira))) {
    return next(new apiError(400, "Invalid lempira amount"));
  }

  const amount = Number(lempira);
  if (amount < 0) {
    return next(new apiError(400, "Lempira amount cannot be negative"));
  }

  let response;
  try {
    response = await axios.get(
      "https://open.er-api.com/v6/latest/HNL",
      { timeout: 10000 }
    );
  } catch (err) {
    return next(new apiError(502, "Currency service unavailable"));
  }

  if (response?.data?.result !== "success") {
    return next(new apiError(502, "Failed to fetch exchange rate"));
  }

  const rate = response.data?.rates?.USD;

  if (!rate) {
    return next(new apiError(502, "USD rate not available"));
  }

  const data = {
    lempira: amount,
    usd: Number((amount * rate).toFixed(2)),
    rate: Number(rate),
    convertedAt: response.data.time_last_update_utc,
  };

  return res
    .status(200)
    .json(new apiSuccess(200, "Currency converted successfully", data));
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
  upsertListPropertySection,
  getListPropertySections,
  loanEstimator,
  updateProperty,
  deleteProperty,
  addWhyChooseUsItems,
  createUpdateWhyChooseSection,
  updateWhyChooseUsItems,
  deleteWhyChooseItem,
  getWhyChooseUs,
  getSingleProperty,
  convertCurrency,
};
