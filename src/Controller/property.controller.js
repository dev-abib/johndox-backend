const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const { Property } = require("../Schema/property.schema");
const { uploadCloudinary } = require("../Helpers/uploadCloudinary");


const addProperty = asyncHandler(async (req, res, next) => {
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

module.exports = { addProperty };
