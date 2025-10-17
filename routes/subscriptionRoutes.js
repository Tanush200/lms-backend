const express = require("express");
const router = express.Router();
const {
  getMySubscription,
  getSubscriptionStatus,
  initiatePayment,
  handlePaymentWebhook,
  manuallyActivateSubscription,
  getAllSubscriptions,
  verifyAndActivatePayment,
  debugSubscription,
} = require("../controllers/subscriptionController");
const { protect, authorize } = require("../middleware/auth");

// Public webhook route (must be before protected routes)
router.post("/webhook", handlePaymentWebhook);

// Protected routes (School Admin)
router.get("/my-subscription", protect, getMySubscription);
router.get("/status", protect, getSubscriptionStatus);
router.get("/debug", protect, debugSubscription);
router.post("/initiate-payment", protect, initiatePayment);
router.post("/verify-payment", protect, verifyAndActivatePayment);

// Super Admin routes
router.get("/all", authorize("super_admin"), getAllSubscriptions);
router.post(
  "/activate/:schoolId",
  authorize("super_admin"),
  manuallyActivateSubscription
);

module.exports = router;
