// controllers/brandingController.js
const School = require("../models/School");
const { cloudinary } = require("../config/cloudinary"); // For logo upload

// Get school branding
exports.getBranding = async (req, res) => {
  try {
    const school = await School.findById(req.params.schoolId).select(
      "branding name"
    );

    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    // If no custom branding, return defaults with school name
    const branding = school.branding || {
      logo: "/logo1.png",
      favicon: "/favicon.ico",
      schoolName: school.name,
      colors: {
        primary: "#3B82F6",
        secondary: "#8B5CF6",
        accent: "#10B981",
        sidebar: "#1F2937",
        sidebarText: "#F9FAFB",
      },
    };

    res.json({
      success: true,
      data: {
        branding: {
          ...branding,
          schoolName: branding.schoolName || school.name,
        },
      },
    });
  } catch (error) {
    console.error("Get branding error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get branding",
    });
  }
};

// Update school branding (Admin only)
exports.updateBranding = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { colors, schoolName, fonts } = req.body;

    // Verify user is admin of this school
    const userSchoolId = req.user.school?._id?.toString() || req.user.school?.toString();
    if (req.user.role !== "admin" || userSchoolId !== schoolId) {
      console.log("❌ Authorization failed:", {
        userRole: req.user.role,
        userSchoolId,
        requestedSchoolId: schoolId,
      });
      return res.status(403).json({
        success: false,
        message: "Not authorized to update branding",
      });
    }

    const updateData = {
      "branding.colors": colors,
      "branding.schoolName": schoolName,
      "branding.fonts": fonts,
    };

    const school = await School.findByIdAndUpdate(
      schoolId,
      { $set: updateData },
      { new: true }
    ).select("branding name");

    res.json({
      success: true,
      message: "Branding updated successfully",
      data: { branding: school.branding },
    });
  } catch (error) {
    console.error("Update branding error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update branding",
    });
  }
};

// Upload logo
exports.uploadLogo = async (req, res) => {
  try {
    const { schoolId } = req.params;

    // Verify admin
    const userSchoolId = req.user.school?._id?.toString() || req.user.school?.toString();
    if (req.user.role !== "admin" || userSchoolId !== schoolId) {
      console.log("❌ Authorization failed:", {
        userRole: req.user.role,
        userSchoolId,
        requestedSchoolId: schoolId,
      });
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if file was uploaded via multer
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No logo file provided",
      });
    }

    // File is already uploaded to Cloudinary by multer middleware
    const logoUrl = req.file.path; // Cloudinary URL

    // Update school
    const school = await School.findByIdAndUpdate(
      schoolId,
      { "branding.logo": logoUrl },
      { new: true }
    );

    res.json({
      success: true,
      message: "Logo uploaded successfully",
      data: { logoUrl: logoUrl },
    });
  } catch (error) {
    console.error("Upload logo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload logo",
    });
  }
};
