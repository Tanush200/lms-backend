// const User = require("../models/User");
// const { createTokenResponse } = require("../utils/jwt");
// const bcrypt = require("bcryptjs");
// const crypto = require("crypto");
// const EmailService = require("../services/emailService");

// const register = async (req, res) => {
//   try {
//     const { name, email, password, role, phone, address, school } = req.body;

//     // ✅ Only allow student registration
//     if (role !== "student") {
//       return res.status(403).json({
//         success: false,
//         message:
//           "Only student registration is allowed. Teachers are created by administrators.",
//       });
//     }

//     // Check if user already exists
//     const existingUser = await User.findOne({ email: email.toLowerCase() });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "User already exists with this email",
//       });
//     }

//     // Check if first user (make them super_admin)
//     const userCount = await User.countDocuments();
//     const isFirstUser = userCount === 0;

//     let actualRole = "student";
//     let userSchool = school;

//     if (isFirstUser) {
//       // First user becomes super_admin (no school required)
//       actualRole = "super_admin";
//       userSchool = null;
//     } else {
//       // Regular students must have a school
//       if (!school) {
//         return res.status(400).json({
//           success: false,
//           message: "School is required for student registration",
//         });
//       }
//     }

//     // Generate student ID
//     const studentCount = await User.countDocuments({ role: "student" });
//     const studentId =
//       actualRole === "student" ? `STU${Date.now()}${studentCount + 1}` : null;

//     // Create user (password hashed by pre-save middleware)
//     const user = await User.create({
//       name,
//       email: email.toLowerCase(),
//       password,
//       role: actualRole,
//       school: userSchool,
//       phone,
//       address,
//       studentId,
//       isActive: true,
//       emailVerified: false,
//       phoneVerified: false,
//     });

//     // Generate token using your existing utility
//     const tokenData = createTokenResponse(user);
//     user.password = undefined;

//     res.status(201).json({
//       success: true,
//       message: isFirstUser
//         ? "Super admin account created successfully"
//         : "Student registration successful",
//       data: {
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           school: user.school,
//           phone: user.phone,
//           address: user.address,
//           studentId: user.studentId,
//           isActive: user.isActive,
//           emailVerified: user.emailVerified,
//           phoneVerified: user.phoneVerified,
//           createdAt: user.createdAt,
//         },
//         auth: tokenData,
//       },
//     });
//   } catch (error) {
//     console.error("Registration error:", error);

//     if (error.name === "ValidationError") {
//       const errors = Object.values(error.errors).map((err) => err.message);
//       return res.status(400).json({
//         success: false,
//         message: "Validation error",
//         errors,
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: "Registration failed",
//       error: error.message,
//     });
//   }
// };

// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     console.log("🔍 Login attempt for:", email);

//     if (!email || !password) {
//       console.log("❌ Missing email or password");
//       return res.status(400).json({
//         success: false,
//         message: "Please provide email and password",
//       });
//     }

//     // Find user with password field included and populate school
//     const user = await User.findOne({
//       email: email.toLowerCase(),
//     })
//       .select("+password")
//       .populate("school", "name code logo");

//     console.log("🔍 User found:", user ? "YES" : "NO");
//     if (user) {
//       console.log("🔍 User details:");
//       console.log("   - Name:", user.name);
//       console.log("   - Email:", user.email);
//       console.log("   - Role:", user.role);
//       console.log("   - School:", user.school?.name || "N/A (Super Admin)");
//       console.log("   - Active:", user.isActive);
//     }

//     if (!user) {
//       console.log("❌ User not found");
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       });
//     }

//     if (!user.isActive) {
//       console.log("❌ User inactive");
//       return res.status(401).json({
//         success: false,
//         message:
//           "Your account has been deactivated. Please contact administrator.",
//       });
//     }

//     // Check password
//     console.log("🔍 Checking password...");

//     let isValidPassword = false;
//     if (typeof user.correctPassword === "function") {
//       console.log("🔍 Using user.correctPassword() method");
//       isValidPassword = await user.correctPassword(password);
//     } else {
//       console.log("🔍 Using direct bcrypt.compare()");
//       isValidPassword = await bcrypt.compare(password, user.password);
//     }

//     console.log("🔍 Password valid:", isValidPassword);

//     if (!isValidPassword) {
//       console.log("❌ Invalid password");
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       });
//     }

//     console.log("✅ Login successful");

//     // Update last login
//     user.lastLogin = new Date();
//     await user.save({ validateBeforeSave: false });

//     // Generate token
//     const tokenData = createTokenResponse(user);
//     user.password = undefined;

//     res.json({
//       success: true,
//       message: "Login successful",
//       data: {
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           role: user.role,
//           school: user.school
//             ? {
//                 id: user.school._id,
//                 name: user.school.name,
//                 code: user.school.code,
//                 logo: user.school.logo,
//               }
//             : null,
//           phone: user.phone,
//           address: user.address,
//           studentId: user.studentId,
//           employeeId: user.employeeId,
//           profilePhoto: user.profilePhoto,
//           isActive: user.isActive,
//           emailVerified: user.emailVerified,
//           phoneVerified: user.phoneVerified,
//           lastLogin: user.lastLogin,
//           createdAt: user.createdAt,
//         },
//         auth: tokenData,
//       },
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Login failed",
//       error: error.message,
//     });
//   }
// };

// const getMe = async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).populate(
//       "school",
//       "name code logo"
//     );

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     res.json({
//       success: true,
//       data: {
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           phone: user.phone,
//           address: user.address,
//           role: user.role,
//           school: user.school
//             ? {
//                 id: user.school._id,
//                 name: user.school.name,
//                 code: user.school.code,
//                 logo: user.school.logo,
//               }
//             : null,
//           studentId: user.studentId,
//           employeeId: user.employeeId,
//           profilePhoto: user.profilePhoto,
//           isActive: user.isActive,
//           emailVerified: user.emailVerified,
//           phoneVerified: user.phoneVerified,
//           lastLogin: user.lastLogin,
//           createdAt: user.createdAt,
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Get profile error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not get user profile",
//       error: error.message,
//     });
//   }
// };

// const logout = async (req, res) => {
//   try {
//     res.json({
//       success: true,
//       message: "Logged out successfully",
//     });
//   } catch (error) {
//     console.error("Logout error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Logout failed",
//       error: error.message,
//     });
//   }
// };

// const changePassword = async (req, res) => {
//   try {
//     const { currentPassword, newPassword } = req.body;

//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide current password and new password",
//       });
//     }

//     if (newPassword.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: "New password must be at least 6 characters long",
//       });
//     }

//     const user = await User.findById(req.user.id).select("+password");

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const isCurrentPasswordValid = await user.correctPassword(currentPassword);
//     if (!isCurrentPasswordValid) {
//       return res.status(400).json({
//         success: false,
//         message: "Current password is incorrect",
//       });
//     }

//     user.password = newPassword;
//     user.passwordChangedAt = new Date();
//     await user.save();

//     res.json({
//       success: true,
//       message: "Password changed successfully",
//     });
//   } catch (error) {
//     console.error("Change password error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Could not change password",
//       error: error.message,
//     });
//   }
// };

// module.exports = {
//   register,
//   login,
//   getMe,
//   logout,
//   changePassword,
//   // added below
//   requestPasswordReset,
//   resetPassword,
// };

// // ================= PASSWORD RESET FLOW =================
// async function requestPasswordReset(req, res) {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ success: false, message: "Email is required" });
//     }

//     const user = await User.findOne({ email: String(email).toLowerCase() });

//     // Always respond success to prevent user enumeration
//     if (!user) {
//       return res.json({ success: true, message: "If an account exists, a reset email has been sent." });
//     }

//     const resetToken = user.createPasswordResetToken();
//     await user.save({ validateBeforeSave: false });

//     try {
//       await EmailService.sendPasswordResetEmail(user.email, resetToken, user.name || "User");
//     } catch (e) {
//       // Cleanup token on email failure
//       user.passwordResetToken = undefined;
//       user.passwordResetExpires = undefined;
//       await user.save({ validateBeforeSave: false });
//       return res.status(500).json({ success: false, message: "Failed to send password reset email" });
//     }

//     return res.json({ success: true, message: "If an account exists, a reset email has been sent." });
//   } catch (error) {
//     console.error("Request password reset error:", error);
//     res.status(500).json({ success: false, message: "Could not process request", error: error.message });
//   }
// }

// async function resetPassword(req, res) {
//   try {
//     const { token, password } = req.body;

//     if (!token || !password) {
//       return res.status(400).json({ success: false, message: "Token and new password are required" });
//     }

//     if (String(password).length < 6) {
//       return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
//     }

//     const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");

//     const user = await User.findOne({
//       passwordResetToken: hashedToken,
//       passwordResetExpires: { $gt: Date.now() },
//     }).select("+password");

//     if (!user) {
//       return res.status(400).json({ success: false, message: "Token is invalid or has expired" });
//     }

//     user.password = password;
//     user.passwordChangedAt = new Date();
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     await user.save();

//     // Optional: auto login after reset
//     const tokenData = createTokenResponse(user);
//     user.password = undefined;

//     return res.json({ success: true, message: "Password reset successful", auth: tokenData });
//   } catch (error) {
//     console.error("Reset password error:", error);
//     res.status(500).json({ success: false, message: "Could not reset password", error: error.message });
//   }
// }



const User = require("../models/User");
const { createTokenResponse } = require("../utils/jwt");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const EmailService = require("../services/emailService");

const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address, school } = req.body;

    // ✅ Only allow student registration
    if (role !== "student") {
      return res.status(403).json({
        success: false,
        message:
          "Only student registration is allowed. Teachers are created by administrators.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Check if first user (make them super_admin)
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    let actualRole = "student";
    let userSchool = school;

    if (isFirstUser) {
      // First user becomes super_admin (no school required)
      actualRole = "super_admin";
      userSchool = null;
    } else {
      // Regular students must have a school
      if (!school) {
        return res.status(400).json({
          success: false,
          message: "School is required for student registration",
        });
      }
    }

    // Generate student ID
    const studentCount = await User.countDocuments({ role: "student" });
    const studentId =
      actualRole === "student" ? `STU${Date.now()}${studentCount + 1}` : null;

    // Create user (password hashed by pre-save middleware)
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: actualRole,
      school: userSchool,
      phone,
      address,
      studentId,
      isActive: true,
      emailVerified: false,
      phoneVerified: false,
    });

    // Generate token using your existing utility
    const tokenData = createTokenResponse(user);
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: isFirstUser
        ? "Super admin account created successfully"
        : "Student registration successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          school: user.school,
          phone: user.phone,
          address: user.address,
          studentId: user.studentId,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          createdAt: user.createdAt,
        },
        auth: tokenData,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔍 Login attempt for:", email);

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user with password field included and populate school
    const user = await User.findOne({
      email: email.toLowerCase(),
    })
      .select("+password")
      .populate(
        "school",
        "name code logo verificationStatus subscriptionStatus isActive"
      );

    console.log("🔍 User found:", user ? "YES" : "NO");
    if (user) {
      console.log("🔍 User details:");
      console.log("   - Name:", user.name);
      console.log("   - Email:", user.email);
      console.log("   - Role:", user.role);
      console.log("   - School:", user.school?.name || "N/A (Super Admin)");
      console.log("   - Active:", user.isActive);
      if (user.school) {
        console.log(
          "   - School Verification:",
          user.school.verificationStatus
        );
        console.log(
          "   - School Subscription:",
          user.school.subscriptionStatus
        );
      }
    }

    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      console.log("❌ User inactive");
      return res.status(401).json({
        success: false,
        message:
          "Your account has been deactivated. Please contact administrator.",
      });
    }

    // ✅ NEW: Check school verification status
    if (user.school && user.role !== "super_admin") {
      if (user.school.verificationStatus === "pending") {
        console.log("❌ School pending verification");
        return res.status(403).json({
          success: false,
          message:
            "Your school registration is pending verification. You will receive an email once approved.",
          status: "pending_verification",
          schoolName: user.school.name,
        });
      }

      if (user.school.verificationStatus === "rejected") {
        console.log("❌ School rejected");
        return res.status(403).json({
          success: false,
          message:
            "Your school registration was rejected. Please contact support.",
          status: "rejected",
        });
      }

      // ✅ Check subscription status (for admin only)
      if (
        user.role === "admin" &&
        user.school.subscriptionStatus !== "active"
      ) {
        console.log("❌ Subscription required - issuing limited auth and redirect hint");

        // Issue auth so the user can access subscription endpoints/pages
        const tokenData = createTokenResponse(user);
        user.password = undefined;

        return res.json({
          success: true,
          message: "Subscription required to access the platform",
          status: "subscription_required",
          subscriptionStatus: user.school.subscriptionStatus,
          redirectTo: "/subscription",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            school: user.school
              ? {
                  id: user.school._id,
                  name: user.school.name,
                  code: user.school.code,
                  logo: user.school.logo,
                  verificationStatus: user.school.verificationStatus,
                  subscriptionStatus: user.school.subscriptionStatus,
                  isActive: user.school.isActive,
                }
              : null,
          },
          auth: tokenData,
        });
      }
    }

    // Check password
    console.log("🔍 Checking password...");

    let isValidPassword = false;
    if (typeof user.correctPassword === "function") {
      console.log("🔍 Using user.correctPassword() method");
      isValidPassword = await user.correctPassword(password);
    } else {
      console.log("🔍 Using direct bcrypt.compare()");
      isValidPassword = await bcrypt.compare(password, user.password);
    }

    console.log("🔍 Password valid:", isValidPassword);

    if (!isValidPassword) {
      console.log("❌ Invalid password");
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("✅ Login successful");

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const tokenData = createTokenResponse(user);
    user.password = undefined;

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school
          ? {
              id: user.school._id,
              name: user.school.name,
              code: user.school.code,
              logo: user.school.logo,
              verificationStatus: user.school.verificationStatus,
              subscriptionStatus: user.school.subscriptionStatus,
              isActive: user.school.isActive,
            }
          : null,
        phone: user.phone,
        address: user.address,
        studentId: user.studentId,
        employeeId: user.employeeId,
        profilePhoto: user.profilePhoto,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      auth: tokenData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "school",
      "name code logo verificationStatus subscriptionStatus isActive"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          role: user.role,
          school: user.school
            ? {
                id: user.school._id,
                name: user.school.name,
                code: user.school.code,
                logo: user.school.logo,
                verificationStatus: user.school.verificationStatus,
                subscriptionStatus: user.school.subscriptionStatus,
                isActive: user.school.isActive,
              }
            : null,
          studentId: user.studentId,
          employeeId: user.employeeId,
          profilePhoto: user.profilePhoto,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get user profile",
      error: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current password and new password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isCurrentPasswordValid = await user.correctPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Could not change password",
      error: error.message,
    });
  }
};

// ================= PASSWORD RESET FLOW =================
async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() });

    // Always respond success to prevent user enumeration
    if (!user) {
      return res.json({
        success: true,
        message: "If an account exists, a reset email has been sent.",
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      await EmailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.name || "User"
      );
    } catch (e) {
      // Cleanup token on email failure
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res
        .status(500)
        .json({
          success: false,
          message: "Failed to send password reset email",
        });
    }

    return res.json({
      success: true,
      message: "If an account exists, a reset email has been sent.",
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Could not process request",
        error: error.message,
      });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Token and new password are required",
        });
    }

    if (String(password).length < 6) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 6 characters",
        });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(String(token))
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Token is invalid or has expired" });
    }

    user.password = password;
    user.passwordChangedAt = new Date();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Optional: auto login after reset
    const tokenData = createTokenResponse(user);
    user.password = undefined;

    return res.json({
      success: true,
      message: "Password reset successful",
      auth: tokenData,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Could not reset password",
        error: error.message,
      });
  }
}

module.exports = {
  register,
  login,
  getMe,
  logout,
  changePassword,
  requestPasswordReset,
  resetPassword,
};
