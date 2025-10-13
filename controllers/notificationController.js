const NotificationService = require("../services/notificationService");
const PushSubscription = require("../models/PushSubscription");

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const result = await NotificationService.getUserNotifications(
      req.user._id,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        unreadOnly: unreadOnly === "true",
      }
    );

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get notifications",
      error: error.message,
    });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/mark-read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        message: "notificationIds array is required",
      });
    }

    await NotificationService.markAsRead(notificationIds, req.user._id);

    res.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user._id);

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    await NotificationService.deleteNotification(req.params.id, req.user._id);

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

// @desc    Subscribe to push notifications
// @route   POST /api/notifications/subscribe
// @access  Private
const subscribePush = async (req, res) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription data",
      });
    }

    await PushSubscription.findOneAndUpdate(
      { user: req.user._id, endpoint },
      {
        user: req.user._id,
        endpoint,
        keys,
        userAgent: req.headers["user-agent"],
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: "Push notification subscription saved",
    });
  } catch (error) {
    console.error("Subscribe push error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe to push notifications",
      error: error.message,
    });
  }
};

// @desc    Unsubscribe from push notifications
// @route   POST /api/notifications/unsubscribe
// @access  Private
const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;

    await PushSubscription.findOneAndDelete({
      user: req.user._id,
      endpoint,
    });

    res.json({
      success: true,
      message: "Unsubscribed from push notifications",
    });
  } catch (error) {
    console.error("Unsubscribe push error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unsubscribe",
      error: error.message,
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribePush,
  unsubscribePush,
};
