// external dependencies

// internal dependencies
const { apiError } = require("./api.error");

const asyncHandler = (fun = () => {}) => {
  return async (req, res, next) => {
    try {
      await fun(req, res, next);
    } catch (error) {
      console.log(error);
      let errorMessage = error.message || errorMessage;
      let errorDetails = error.stack || null;
      return next(
        new apiError(500, "External server error", errorDetails, false)
      );
    }
  };
};

module.exports = {
  asyncHandler
}
