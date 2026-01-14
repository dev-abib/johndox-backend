// external dependencies

// internal dependencies
const { apiError } = require("./api.error");

const asyncHandler = (fun = () => {}) => {
  return async (req, res, next) => {
    try {
      await fun(req, res, next);
    } catch (error) {
      console.log(error);
      return next(new apiError(500, error, null, false));
    }
  };
};

module.exports = {
  asyncHandler
}
