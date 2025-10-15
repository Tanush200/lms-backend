const express = require("express");
const router = express.Router();
const {
  getMySubscription,
  getSubscriptionStatus,
  initiatePayment,
  handlePaymentWebhook,
  manuallyActivateSubscription,
  getAllSubscriptions,
} = require("../controllers/subscriptionController");
const { protect, authorize } = require("../middleware/auth");

// Protected routes (School Admin)
router.get("/my-subscription", protect, getMySubscription);
router.get("/status", protect, getSubscriptionStatus);
router.post("/initiate-payment", protect, initiatePayment);

// Super Admin routes
router.get("/all", authorize("super_admin"), getAllSubscriptions);
router.post(
  "/activate/:schoolId",
  authorize("super_admin"),
  manuallyActivateSubscription
);

module.exports = router;
