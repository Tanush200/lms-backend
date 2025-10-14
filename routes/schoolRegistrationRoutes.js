const express = require("express");
const router = express.Router();
const {
  registerSchool,
  getPendingRegistrations,
  approveSchool,
  rejectSchool,
} = require("../controllers/schoolRegistrationController");
const { protect, authorize } = require("../middleware/auth");

// Public route - School self-registration
router.post("/register", registerSchool);

// Super Admin routes
router.get(
  "/pending",
  protect,
  authorize("super_admin"),
  getPendingRegistrations
);

router.post(
  "/approve/:schoolId",
  protect,
  authorize("super_admin"),
  approveSchool
);

router.post(
  "/reject/:schoolId",
  protect,
  authorize("super_admin"),
  rejectSchool
);

module.exports = router;
