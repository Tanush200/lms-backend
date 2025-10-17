// routes/brandingRoutes.js
const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { uploadProfilePhoto } = require("../config/cloudinary");
const {
  getBranding,
  updateBranding,
  uploadLogo,
} = require("../controllers/brandingController");

router.get("/:schoolId/branding", protect, getBranding);
router.put("/:schoolId/branding", protect, authorize("admin"), updateBranding);
router.post(
  "/:schoolId/branding/logo",
  protect,
  authorize("admin"),
  uploadProfilePhoto.single("logo"),
  uploadLogo
);

module.exports = router;
