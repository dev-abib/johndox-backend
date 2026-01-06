const jwt = require("jsonwebtoken");
const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");

const adminAuthGuard = asyncHandler(async (req, res, next) => {
  const { cookie, authorization } = req.headers;

  // header token
  let token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : null;

  // cookie token (admin_token or token)
  const cookiesToken = cookie
    ?.split("; ")
    .find((c) => c.startsWith("admin_token=") || c.startsWith("token="))
    ?.split("=")[1];

  // fallback to cookie token if header token missing
  token = token || cookiesToken;

  console.log(token);

  if (!token) {
    return next(
      new apiError(401, "Unauthorized. Admin token is missing.", null, false)
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_SECRET_KEY);
    req.admin = decoded;
    return next();
  } catch (err) {
    return next(
      new apiError(401, "Invalid or expired admin token.", err.message, false)
    );
  }
});

module.exports = { adminAuthGuard };
