const express = require("express");
const router = express.Router();
const {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getUpcomingEvents,
} = require("../controllers/academicCalendarController");
const { protect, authorize } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// Public routes (all authenticated users)
router.get("/", getCalendarEvents);
router.get("/upcoming", getUpcomingEvents);

// Admin/Principal/Teacher routes
router.post("/", authorize("admin", "principal", "teacher"), createCalendarEvent);
router.put("/:id", authorize("admin", "principal", "teacher"), updateCalendarEvent);
router.delete("/:id", authorize("admin", "principal", "teacher"), deleteCalendarEvent);

module.exports = router;
