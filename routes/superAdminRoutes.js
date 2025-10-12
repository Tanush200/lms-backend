const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/superAdminAuth");
const {
  getDashboardStats,
  getRecentActivity,
  getPlatformHealth,
  getSchoolsOverview,
  getAllUsers,
} = require("../controllers/superAdminController");

const {
  getSchoolAdmins,
  getSchoolAdminById,
  createSchoolAdmin,
  updateSchoolAdmin,
  deleteSchoolAdmin,
  resetAdminPassword,
} = require("../controllers/schoolAdminController");

// All routes require authentication and super admin role
router.use(protect);
router.use(requireSuperAdmin);

// =================== DASHBOARD ===================
router.get("/dashboard/stats", getDashboardStats);
router.get("/activity", getRecentActivity);
router.get("/health", getPlatformHealth);
router.get("/schools/overview", getSchoolsOverview);

// =================== USERS MANAGEMENT ===================
router.get("/users", getAllUsers);

// =================== SCHOOL ADMINS MANAGEMENT ===================
router.get("/school-admins", getSchoolAdmins);
router.post("/school-admins", createSchoolAdmin);
router.get("/school-admins/:id", getSchoolAdminById);
router.put("/school-admins/:id", updateSchoolAdmin);
router.delete("/school-admins/:id", deleteSchoolAdmin);
router.post("/school-admins/:id/reset-password", resetAdminPassword);

module.exports = router;
