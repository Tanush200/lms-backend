// const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");
// const User = require("../models/User");

// const protect = async (req, res, next) => {
//   try {
//     let token;
//     if (req.headers.authorization) {
//       token = extractTokenFromHeader(req.headers.authorization);
//     }

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Access denied. No token provided.",
//       });
//     }

//     const decoded = verifyToken(token);

//     const user = await User.findById(decoded.id).select("-password");

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Token is valid but user no longer exists",
//       });
//     }

//     if (!user.isActive) {
//       return res.status(401).json({
//         success: false,
//         message: "Your account has been deactivated",
//       });
//     }

//     if (user.changedPasswordAfter(decoded.iat)) {
//       return res.status(401).json({
//         success: false,
//         message: "Password was changed recently. Please login again.",
//       });
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(401).json({
//       success: false,
//       message: "Invalid token",
//       error: error.message,
//     });
//   }
// };

// const authorize = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({
//         success: false,
//         message: "Please login to access this resource",
//       });
//     }
//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({
//         success: false,
//         message: `Access denied. Required roles: ${roles.join(
//           ", "
//         )}. Your role: ${req.user.role}`,
//       });
//     }
//     next();
//   };
// };



// const optionalAuth = async (req, res, next) => {
//   try {
//     if (req.headers.authorization) {
//       const token = extractTokenFromHeader(req.headers.authorization);
//       const decoded = verifyToken(token);
//       const user = await User.findById(decoded.id).select("-password");

//       if (user && user.isActive) {
//         req.user = user;
//       }
//     }
//     next();
//   } catch (error) {
//     next();
//   }
// };


// const ownerOrAdmin = (req, res, next) => {
//   if (!req.user) {
//     return res.status(401).json({
//       success: false,
//       message: "Authentication required",
//     });
//   }

//   const resourceUserId = req.params.userId || req.body.userId || req.params.id;

//   if (req.user.role === "admin" || req.user._id.toString() === resourceUserId) {
//     return next();
//   }

//   return res.status(403).json({
//     success: false,
//     message: "Access denied. You can only access your own resources.",
//   });
// };


// module.exports = {
//     protect,
//     authorize,
//     optionalAuth,
//     ownerOrAdmin
// }




const { verifyToken, extractTokenFromHeader } = require("../utils/jwt");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = verifyToken(token);

    // Populate school information along with user
    const user = await User.findById(decoded.id)
      .select("-password")
      .populate("school", "name code logo isActive");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is valid but user no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    // Check if user's school is active (only for non-super_admin)
    if (user.role !== "super_admin" && user.school && !user.school.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your school has been deactivated. Please contact support.",
      });
    }

    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: "Password was changed recently. Please login again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message,
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login to access this resource",
      });
    }

    // Super admin can access everything
    if (req.user.role === "super_admin") {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(
          ", "
        )}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const token = extractTokenFromHeader(req.headers.authorization);
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id)
        .select("-password")
        .populate("school", "name code logo isActive");

      if (user && user.isActive) {
        // Check school active status
        if (
          user.role === "super_admin" ||
          !user.school ||
          user.school.isActive
        ) {
          req.user = user;
        }
      }
    }
    next();
  } catch (error) {
    next();
  }
};

const ownerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const resourceUserId = req.params.userId || req.body.userId || req.params.id;

  // Super admin has access to everything
  if (req.user.role === "super_admin") {
    return next();
  }

  // School admin can access resources from their school
  if (req.user.role === "admin" || req.user._id.toString() === resourceUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Access denied. You can only access your own resources.",
  });
};

// NEW: Middleware to check if user belongs to a specific school
const belongsToSchool = (schoolIdParam = "schoolId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Super admin bypasses school check
    if (req.user.role === "super_admin") {
      return next();
    }

    const schoolId = req.params[schoolIdParam] || req.body.school;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "School ID is required",
      });
    }

    // Check if user belongs to the specified school
    if (req.user.school._id.toString() !== schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You can only access resources from your school.",
      });
    }

    next();
  };
};

// NEW: Middleware to ensure user has a school (not super_admin)
const requireSchool = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role === "super_admin") {
    return next();
  }

  if (!req.user.school) {
    return res.status(403).json({
      success: false,
      message: "User must be associated with a school",
    });
  }

  next();
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  ownerOrAdmin,
  belongsToSchool,
  requireSchool,
};
