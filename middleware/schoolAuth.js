// // Middleware to filter data by school for school admins
// const getSchoolFilter = (req) => {
//   if (req.user.role === "super_admin") {
//     return {}; // Super admin sees all schools
//   }

//   if (!req.user.school) {
//     throw new Error("User must be associated with a school");
//   }

//   return { school: req.user.school }; // School admin sees only their school
// };

// // Middleware to validate school access
// const validateSchoolAccess = async (req, res, next) => {
//   try {
//     const { schoolId } = req.params;

//     if (req.user.role === "super_admin") {
//       return next(); // Super admin can access any school
//     }

//     if (!req.user.school) {
//       return res.status(403).json({
//         success: false,
//         message: "User not associated with any school",
//       });
//     }

//     if (schoolId && schoolId !== req.user.school.toString()) {
//       return res.status(403).json({
//         success: false,
//         message: "Access denied to this school",
//       });
//     }

//     next();
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "School validation error",
//       error: error.message,
//     });
//   }
// };

// module.exports = { getSchoolFilter, validateSchoolAccess };



// Middleware to filter data by school for school admins
const getSchoolFilter = (req) => {
  if (req.user.role === "super_admin") {
    return {}; // Super admin sees all schools
  }

  if (!req.user.school) {
    throw new Error("User must be associated with a school");
  }

  // ✅ FIX: Extract the _id from the populated school object
  const schoolId = req.user.school._id || req.user.school;
  
  return { school: schoolId }; // ✅ Use school ID, not the whole object
};

// Middleware to validate school access
const validateSchoolAccess = async (req, res, next) => {
  try {
    const { schoolId } = req.params;

    if (req.user.role === "super_admin") {
      return next(); // Super admin can access any school
    }

    if (!req.user.school) {
      return res.status(403).json({
        success: false,
        message: "User not associated with any school",
      });
    }

    // ✅ FIX: Compare using _id
    const userSchoolId = req.user.school._id || req.user.school;
    
    if (schoolId && schoolId !== userSchoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this school",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "School validation error",
      error: error.message,
    });
  }
};

module.exports = { getSchoolFilter, validateSchoolAccess };
