// const School = require("../models/School");
// const User = require("../models/User");
// // const Subscription = require("../models/Subscription");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const { sendEmail } = require("../services/emailService");

// // @desc    Self-register a new school
// // @route   POST /api/school-registration/register
// // @access  Public
// const registerSchool = async (req, res) => {
//   try {
//     const {
//       schoolName,
//       schoolCode,
//       email,
//       phone,
//       password,
//       address,
//       adminName,
//     } = req.body;

//     // Validate required fields
//     if (
//       !schoolName ||
//       !schoolCode ||
//       !email ||
//       !phone ||
//       !password ||
//       !adminName
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Please provide all required fields",
//       });
//     }

//     // Check if school code already exists
//     const existingSchool = await School.findOne({
//       code: schoolCode.toUpperCase(),
//     });
//     if (existingSchool) {
//       return res.status(400).json({
//         success: false,
//         message: "School code already exists",
//       });
//     }

//     // Check if email already exists
//     const existingEmail = await School.findOne({ email: email.toLowerCase() });
//     if (existingEmail) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already registered",
//       });
//     }

//     // Check if user email exists
//     const existingUser = await User.findOne({ email: email.toLowerCase() });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already in use",
//       });
//     }

//     // Normalize address: allow either string or object from client
//     let addressStr = "";
//     let city, state, zipCode, country;
//     if (typeof address === "string") {
//       addressStr = address;
//     } else if (address && typeof address === "object") {
//       const parts = [address.street, address.city, address.state, address.zipCode, address.country]
//         .filter(Boolean);
//       addressStr = parts.join(", ");
//       city = address.city;
//       state = address.state;
//       zipCode = address.zipCode;
//       country = address.country;
//     }

//     // Create school (pending verification)
//     const school = await School.create({
//       name: schoolName,
//       code: schoolCode.toUpperCase(),
//       email: email.toLowerCase(),
//       phone,
//       address: addressStr,
//       ...(city ? { city } : {}),
//       ...(state ? { state } : {}),
//       ...(zipCode ? { zipCode } : {}),
//       ...(country ? { country } : {}),
//       verificationStatus: "pending",
//       registrationType: "self_registered",
//       isActive: false,
//     });

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create school admin user (but inactive until verified)
//     const schoolAdmin = await User.create({
//       name: adminName,
//       email: email.toLowerCase(),
//       password: hashedPassword,
//       phone,
//       role: "admin",
//       school: school._id,
//       isActive: false, // Inactive until school is verified
//     });

//     // Link owner to school
//     school.owner = schoolAdmin._id;
//     await school.save();

//     // Create inactive subscription
//     await Subscription.create({
//       school: school._id,
//       status: "inactive",
//       accessRestricted: true,
//       restrictionReason: "Pending verification and payment",
//     });

//     // Send verification request email to Super Admin
//     await sendVerificationRequestEmail(school, schoolAdmin);

//     // Send confirmation email to School Admin
//     await sendRegistrationConfirmationEmail(schoolAdmin.email, {
//       schoolName,
//       adminName,
//     });

//     res.status(201).json({
//       success: true,
//       message:
//         "Registration submitted successfully! You will receive an email once verified.",
//       data: {
//         schoolCode: school.code,
//         email: school.email,
//         status: "pending_verification",
//       },
//     });
//   } catch (error) {
//     console.error("School registration error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Registration failed",
//       error: error.message,
//     });
//   }
// };

// // @desc    Get pending school registrations
// // @route   GET /api/school-registration/pending
// // @access  Private (Super Admin)
// const getPendingRegistrations = async (req, res) => {
//   try {
//     const pendingSchools = await School.find({
//       verificationStatus: "pending",
//     })
//       .populate("owner", "name email phone")
//       .sort({ createdAt: -1 });

//     res.json({
//       success: true,
//       count: pendingSchools.length,
//       data: pendingSchools,
//     });
//   } catch (error) {
//     console.error("Get pending registrations error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch pending registrations",
//     });
//   }
// };

// // @desc    Approve school registration
// // @route   POST /api/school-registration/approve/:schoolId
// // @access  Private (Super Admin)
// const approveSchool = async (req, res) => {
//   try {
//     const { schoolId } = req.params;
//     const { note } = req.body;

//     const school = await School.findById(schoolId).populate("owner");

//     if (!school) {
//       return res.status(404).json({
//         success: false,
//         message: "School not found",
//       });
//     }

//     if (school.verificationStatus !== "pending") {
//       return res.status(400).json({
//         success: false,
//         message: "School is not pending verification",
//       });
//     }

//     // Update school verification status
//     school.verificationStatus = "verified";
//     school.verificationDetails = {
//       verifiedBy: req.user._id,
//       verifiedAt: new Date(),
//     };
//     await school.save();

//     // Activate school admin user
//     await User.findByIdAndUpdate(school.owner._id, {
//       isActive: true,
//     });

//     // Send approval email to school admin
//     await sendApprovalEmail(school, note);

//     res.json({
//       success: true,
//       message: "School approved successfully",
//       data: school,
//     });
//   } catch (error) {
//     console.error("Approve school error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to approve school",
//     });
//   }
// };

// // @desc    Reject school registration
// // @route   POST /api/school-registration/reject/:schoolId
// // @access  Private (Super Admin)
// const rejectSchool = async (req, res) => {
//   try {
//     const { schoolId } = req.params;
//     const { reason } = req.body;

//     if (!reason) {
//       return res.status(400).json({
//         success: false,
//         message: "Rejection reason is required",
//       });
//     }

//     const school = await School.findById(schoolId).populate("owner");

//     if (!school) {
//       return res.status(404).json({
//         success: false,
//         message: "School not found",
//       });
//     }

//     // Update school verification status
//     school.verificationStatus = "rejected";
//     school.verificationDetails = {
//       rejectedAt: new Date(),
//       rejectionReason: reason,
//     };
//     await school.save();

//     // Send rejection email
//     await sendRejectionEmail(school, reason);

//     res.json({
//       success: true,
//       message: "School registration rejected",
//       data: school,
//     });
//   } catch (error) {
//     console.error("Reject school error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to reject school",
//     });
//   }
// };

// // Helper function to send verification request email to Super Admin
// const sendVerificationRequestEmail = async (school, admin) => {
//   try {
//     const superAdmins = await User.find({ role: "super_admin" });

//     for (const superAdmin of superAdmins) {
//       await sendEmail({
//         to: superAdmin.email,
//         subject: "🔔 New School Registration Request",
//         html: `
//           <h2>New School Registration Request</h2>
//           <p>A new school has registered and requires verification:</p>
          
//           <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
//             <p><strong>School Name:</strong> ${school.name}</p>
//             <p><strong>School Code:</strong> ${school.code}</p>
//             <p><strong>Email:</strong> ${school.email}</p>
//             <p><strong>Phone:</strong> ${school.phone}</p>
//             <p><strong>Admin Name:</strong> ${admin.name}</p>
//             <p><strong>Registered On:</strong> ${new Date(
//               school.createdAt
//             ).toLocaleString()}</p>
//           </div>
          
//           <p>Please review and approve/reject this registration in your dashboard.</p>
          
//           <a href="${
//             process.env.FRONTEND_URL
//           }/dashboard/super-admin/school-verifications" 
//              style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
//             Review Registration
//           </a>
//         `,
//       });
//     }
//   } catch (error) {
//     console.error("Send verification request email error:", error);
//   }
// };

// // Helper function to send confirmation email to School Admin
// const sendRegistrationConfirmationEmail = async (email, data) => {
//   try {
//     await sendEmail({
//       to: email,
//       subject: "✅ School Registration Received",
//       html: `
//         <h2>Registration Received Successfully!</h2>
//         <p>Dear ${data.adminName},</p>
        
//         <p>Thank you for registering <strong>${data.schoolName}</strong> with our LMS platform.</p>
        
//         <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
//           <p><strong>⏳ Verification Pending</strong></p>
//           <p>Your registration is currently under review by our team. You will receive an email notification once your account is verified.</p>
//         </div>
        
//         <p><strong>What's Next?</strong></p>
//         <ol>
//           <li>Our team will verify your school details (usually within 24-48 hours)</li>
//           <li>Once verified, you'll receive login credentials</li>
//           <li>Complete the subscription payment</li>
//           <li>Start using the platform!</li>
//         </ol>
        
//         <p>If you have any questions, please contact our support team.</p>
//       `,
//     });
//   } catch (error) {
//     console.error("Send confirmation email error:", error);
//   }
// };

// // Helper function to send approval email
// const sendApprovalEmail = async (school, note) => {
//   try {
//     const admin = school.owner;

//     await sendEmail({
//       to: admin.email,
//       subject: "🎉 Your School Has Been Verified!",
//       html: `
//         <h2>Congratulations! Your School is Verified</h2>
//         <p>Dear ${admin.name},</p>
        
//         <p>Great news! Your school <strong>${
//           school.name
//         }</strong> has been successfully verified.</p>
        
//         ${
//           note
//             ? `
//           <div style="background: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0;">
//             <p><strong>Note from our team:</strong></p>
//             <p>${note}</p>
//           </div>
//         `
//             : ""
//         }
        
//         <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
//           <p><strong>⚠️ Action Required: Complete Subscription</strong></p>
//           <p>To start using the platform, you need to subscribe to our monthly plan (₹9,999/month).</p>
//         </div>
        
//         <p><strong>Your Login Credentials:</strong></p>
//         <ul>
//           <li><strong>Email:</strong> ${admin.email}</li>
//           <li><strong>School Code:</strong> ${school.code}</li>
//         </ul>
        
//         <a href="${process.env.FRONTEND_URL}/login" 
//            style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
//           Login Now
//         </a>
//       `,
//     });
//   } catch (error) {
//     console.error("Send approval email error:", error);
//   }
// };

// // Helper function to send rejection email
// const sendRejectionEmail = async (school, reason) => {
//   try {
//     const admin = school.owner;

//     await sendEmail({
//       to: admin.email,
//       subject: "❌ School Registration Status",
//       html: `
//         <h2>School Registration Update</h2>
//         <p>Dear ${admin.name},</p>
        
//         <p>Thank you for your interest in our LMS platform. Unfortunately, we are unable to approve your school registration at this time.</p>
        
//         <div style="background: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
//           <p><strong>Reason:</strong></p>
//           <p>${reason}</p>
//         </div>
        
//         <p>If you believe this is an error or would like to discuss further, please contact our support team.</p>
//       `,
//     });
//   } catch (error) {
//     console.error("Send rejection email error:", error);
//   }
// };

// module.exports = {
//   registerSchool,
//   getPendingRegistrations,
//   approveSchool,
//   rejectSchool,
// };


const School = require("../models/School");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../services/emailService");

// @desc    Self-register a new school
// @route   POST /api/school-registration/register
// @access  Public
const registerSchool = async (req, res) => {
  try {
    const {
      schoolName,
      schoolCode,
      email,
      phone,
      password,
      address,
      adminName,
    } = req.body;

    // Validate required fields
    if (
      !schoolName ||
      !schoolCode ||
      !email ||
      !phone ||
      !password ||
      !adminName
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if school code already exists
    const existingSchool = await School.findOne({
      code: schoolCode.toUpperCase(),
    });
    if (existingSchool) {
      return res.status(400).json({
        success: false,
        message: "School code already exists",
      });
    }

    // Check if email already exists
    const existingEmail = await School.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Check if user email exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Normalize address: allow either string or object from client
    let addressStr = "";
    let city, state, zipCode, country;
    if (typeof address === "string") {
      addressStr = address;
    } else if (address && typeof address === "object") {
      const parts = [
        address.street,
        address.city,
        address.state,
        address.zipCode,
        address.country,
      ].filter(Boolean);
      addressStr = parts.join(", ");
      city = address.city;
      state = address.state;
      zipCode = address.zipCode;
      country = address.country;
    }

    // Create school (pending verification)
    const school = await School.create({
      name: schoolName,
      code: schoolCode.toUpperCase(),
      email: email.toLowerCase(),
      phone,
      address: addressStr,
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      ...(zipCode ? { zipCode } : {}),
      ...(country ? { country } : {}),
      verificationStatus: "pending",
      registrationType: "self_registered",
      isActive: false,
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create school admin user (but inactive until verified)
    const schoolAdmin = await User.create({
      name: adminName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: "admin",
      school: school._id,
      isActive: false, // Inactive until school is verified
    });

    // Link owner to school
    school.owner = schoolAdmin._id;
    await school.save();

    // Create inactive subscription
    const subscription = await Subscription.create({
      school: school._id,
      status: "inactive",
      accessRestricted: true,
      restrictionReason: "Pending verification and payment",
      amount: 9999,
      plan: "monthly",
    });

    // Link subscription to school
    school.subscriptionId = subscription._id;
    school.subscriptionStatus = "inactive";
    await school.save();

    // Send verification request email to Super Admin
    await sendVerificationRequestEmail(school, schoolAdmin);

    // Send confirmation email to School Admin
    await sendRegistrationConfirmationEmail(schoolAdmin.email, {
      schoolName,
      adminName,
    });

    res.status(201).json({
      success: true,
      message:
        "Registration submitted successfully! You will receive an email once verified.",
      data: {
        schoolCode: school.code,
        email: school.email,
        status: "pending_verification",
      },
    });
  } catch (error) {
    console.error("School registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

// @desc    Get pending school registrations
// @route   GET /api/school-registration/pending
// @access  Private (Super Admin)
const getPendingRegistrations = async (req, res) => {
  try {
    const pendingSchools = await School.find({
      verificationStatus: "pending",
    })
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingSchools.length,
      data: pendingSchools,
    });
  } catch (error) {
    console.error("Get pending registrations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending registrations",
    });
  }
};

// @desc    Approve school registration
// @route   POST /api/school-registration/approve/:schoolId
// @access  Private (Super Admin)
const approveSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { note } = req.body;

    const school = await School.findById(schoolId).populate("owner");

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    if (school.verificationStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "School is not pending verification",
      });
    }

    // Update school verification status
    school.verificationStatus = "verified";
    school.isActive = true; // ✅ Activate school for login
    school.subscriptionStatus = "pending_payment"; // ⚠️ But subscription is pending
    school.verificationDetails = {
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
    };
    await school.save();

    // Activate school admin user (so they can login)
    await User.findByIdAndUpdate(school.owner._id, {
      isActive: true,
    });

    // Update subscription status to pending_payment
    const subscription = await Subscription.findOne({ school: school._id });
    if (subscription) {
      subscription.status = "pending_payment";
      subscription.restrictionReason = "Please complete subscription payment";
      await subscription.save();
    }

    // Send approval email to school admin
    await sendApprovalEmail(school, note);

    res.json({
      success: true,
      message: "School approved successfully",
      data: school,
    });
  } catch (error) {
    console.error("Approve school error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve school",
    });
  }
};

// @desc    Reject school registration
// @route   POST /api/school-registration/reject/:schoolId
// @access  Private (Super Admin)
const rejectSchool = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const school = await School.findById(schoolId).populate("owner");

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    // Update school verification status
    school.verificationStatus = "rejected";
    school.verificationDetails = {
      rejectedAt: new Date(),
      rejectionReason: reason,
    };
    await school.save();

    // Send rejection email
    await sendRejectionEmail(school, reason);

    res.json({
      success: true,
      message: "School registration rejected",
      data: school,
    });
  } catch (error) {
    console.error("Reject school error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject school",
    });
  }
};

// Helper function to send verification request email to Super Admin
const sendVerificationRequestEmail = async (school, admin) => {
  try {
    const superAdmins = await User.find({ role: "super_admin" });

    for (const superAdmin of superAdmins) {
      await sendEmail({
        to: superAdmin.email,
        subject: "🔔 New School Registration Request",
        html: `
          <h2>New School Registration Request</h2>
          <p>A new school has registered and requires verification:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>School Name:</strong> ${school.name}</p>
            <p><strong>School Code:</strong> ${school.code}</p>
            <p><strong>Email:</strong> ${school.email}</p>
            <p><strong>Phone:</strong> ${school.phone}</p>
            <p><strong>Admin Name:</strong> ${admin.name}</p>
            <p><strong>Registered On:</strong> ${new Date(
              school.createdAt
            ).toLocaleString()}</p>
          </div>
          
          <p>Please review and approve/reject this registration in your dashboard.</p>
          
          <a href="${
            process.env.FRONTEND_URL
          }/dashboard/super-admin/school-verifications" 
             style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Review Registration
          </a>
        `,
      });
    }
  } catch (error) {
    console.error("Send verification request email error:", error);
  }
};

// Helper function to send confirmation email to School Admin
const sendRegistrationConfirmationEmail = async (email, data) => {
  try {
    await sendEmail({
      to: email,
      subject: "✅ School Registration Received",
      html: `
        <h2>Registration Received Successfully!</h2>
        <p>Dear ${data.adminName},</p>
        
        <p>Thank you for registering <strong>${data.schoolName}</strong> with our LMS platform.</p>
        
        <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
          <p><strong>⏳ Verification Pending</strong></p>
          <p>Your registration is currently under review by our team. You will receive an email notification once your account is verified.</p>
        </div>
        
        <p><strong>What's Next?</strong></p>
        <ol>
          <li>Our team will verify your school details (usually within 24-48 hours)</li>
          <li>Once verified, you'll receive login credentials</li>
          <li>Start using the platform!</li>
        </ol>
        
        <p>If you have any questions, please contact our support team.</p>
      `,
    });
  } catch (error) {
    console.error("Send confirmation email error:", error);
  }
};

// Helper function to send approval email
const sendApprovalEmail = async (school, note) => {
  try {
    const admin = school.owner;

    await sendEmail({
      to: admin.email,
      subject: "🎉 Your School Has Been Verified - Please Subscribe!",
      html: `
        <h2>Congratulations! Your School is Verified</h2>
        <p>Dear ${admin.name},</p>
        
        <p>Great news! Your school <strong>${
          school.name
        }</strong> has been successfully verified.</p>
        
        ${
          note
            ? `
          <div style="background: #DBEAFE; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Note from our team:</strong></p>
            <p>${note}</p>
          </div>
        `
            : ""
        }
        
        <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
          <p><strong>⚠️ Action Required: Complete Subscription</strong></p>
          <p>To start using the platform, you need to subscribe to our monthly plan.</p>
          <p><strong>Subscription Plan:</strong> ₹9,999/month</p>
        </div>
        
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Log in to your account using the credentials below</li>
          <li>You will be redirected to the subscription page</li>
          <li>Complete the payment via Dodo Payments</li>
          <li>Start creating teachers, students, and parents!</li>
        </ol>
        
        <p><strong>Your Login Credentials:</strong></p>
        <ul>
          <li><strong>Email:</strong> ${admin.email}</li>
          <li><strong>School Code:</strong> ${school.code}</li>
        </ul>
        
        <a href="${process.env.FRONTEND_URL}/login" 
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Login & Subscribe Now
        </a>
        
        <p style="margin-top: 20px;">Welcome to the platform! 🎉</p>
      `,
    });
  } catch (error) {
    console.error("Send approval email error:", error);
  }
};

// Helper function to send rejection email
const sendRejectionEmail = async (school, reason) => {
  try {
    const admin = school.owner;

    await sendEmail({
      to: admin.email,
      subject: "❌ School Registration Status",
      html: `
        <h2>School Registration Update</h2>
        <p>Dear ${admin.name},</p>
        
        <p>Thank you for your interest in our LMS platform. Unfortunately, we are unable to approve your school registration at this time.</p>
        
        <div style="background: #FEE2E2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #EF4444;">
          <p><strong>Reason:</strong></p>
          <p>${reason}</p>
        </div>
        
        <p>If you believe this is an error or would like to discuss further, please contact our support team.</p>
      `,
    });
  } catch (error) {
    console.error("Send rejection email error:", error);
  }
};

module.exports = {
  registerSchool,
  getPendingRegistrations,
  approveSchool,
  rejectSchool,
};
