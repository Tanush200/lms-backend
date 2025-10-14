const Subscription = require("../models/Subscription");
const School = require("../models/School");

/**
 * Middleware to check if a school has an active subscription
 * This should be applied to routes that require subscription access
 */
const checkSubscriptionAccess = async (req, res, next) => {
  try {
    // Super admins bypass subscription checks
    if (req.user.role === "super_admin") {
      return next();
    }

    // Get school ID from user
    const schoolId = req.user.school;

    if (!schoolId) {
      return res.status(403).json({
        success: false,
        message: "No school associated with this user",
        requiresSubscription: true,
      });
    }

    // Check school verification status
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    if (school.verificationStatus !== "verified") {
      return res.status(403).json({
        success: false,
        message: "School is not verified yet",
        requiresVerification: true,
      });
    }

    // Check subscription
    const subscription = await Subscription.findOne({ school: schoolId });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: "No subscription found. Please subscribe to continue.",
        requiresSubscription: true,
        redirectTo: "/subscription",
      });
    }

    // Check if subscription is active
    if (subscription.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your subscription is not active. Please renew to continue.",
        requiresSubscription: true,
        subscriptionStatus: subscription.status,
        redirectTo: "/subscription",
      });
    }

    // Check if subscription has expired
    if (!subscription.isActive()) {
      // Update status to expired
      subscription.status = "expired";
      subscription.accessRestricted = true;
      subscription.restrictionReason = "Subscription expired";
      await subscription.save();

      // Update school status
      await School.findByIdAndUpdate(schoolId, {
        subscriptionStatus: "expired",
      });

      return res.status(403).json({
        success: false,
        message: "Your subscription has expired. Please renew to continue.",
        requiresSubscription: true,
        subscriptionStatus: "expired",
        redirectTo: "/subscription",
      });
    }

    // Check if access is restricted
    if (subscription.accessRestricted) {
      return res.status(403).json({
        success: false,
        message: subscription.restrictionReason || "Access restricted",
        requiresSubscription: true,
        redirectTo: "/subscription",
      });
    }

    // All checks passed - allow access
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify subscription",
      error: error.message,
    });
  }
};

/**
 * Middleware to check subscription for school admins only
 * Other roles (teachers, students, parents) inherit school's subscription status
 */
const checkAdminSubscription = async (req, res, next) => {
  try {
    // Only check for admin role
    if (req.user.role !== "admin") {
      return next();
    }

    return checkSubscriptionAccess(req, res, next);
  } catch (error) {
    console.error("Admin subscription check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify subscription",
    });
  }
};

/**
 * Get subscription info for current user's school
 */
const getSubscriptionInfo = async (req, res, next) => {
  try {
    if (req.user.role === "super_admin") {
      req.subscriptionInfo = {
        hasSubscription: true,
        isActive: true,
        isSuperAdmin: true,
      };
      return next();
    }

    const schoolId = req.user.school;
    if (!schoolId) {
      req.subscriptionInfo = {
        hasSubscription: false,
        isActive: false,
      };
      return next();
    }

    const subscription = await Subscription.findOne({ school: schoolId });

    if (!subscription) {
      req.subscriptionInfo = {
        hasSubscription: false,
        isActive: false,
        requiresSubscription: true,
      };
      return next();
    }

    req.subscriptionInfo = {
      hasSubscription: true,
      isActive: subscription.isActive(),
      status: subscription.status,
      daysRemaining: subscription.daysRemaining,
      endDate: subscription.endDate,
      isExpiringSoon: subscription.isExpiringSoon(),
    };

    next();
  } catch (error) {
    console.error("Get subscription info error:", error);
    next(); // Continue even if there's an error
  }
};

module.exports = {
  checkSubscriptionAccess,
  checkAdminSubscription,
  getSubscriptionInfo,
};
