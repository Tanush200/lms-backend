const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribePush,
  unsubscribePush,
} = require("../controllers/notificationController");

// All routes require authentication
router.use(protect);

router.get("/", getNotifications);
router.put("/mark-read", markAsRead);
router.put("/mark-all-read", markAllAsRead);
router.delete("/:id", deleteNotification);
router.post("/subscribe", subscribePush);
router.post("/unsubscribe", unsubscribePush);

module.exports = router;
