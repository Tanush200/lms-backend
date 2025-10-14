const Subscription = require("../models/Subscription");
const School = require("../models/School");
const { sendEmail } = require("../services/emailService");
const axios = require("axios");

// @desc    Get subscription details for a school
// @route   GET /api/subscriptions/my-subscription
// @access  Private (School Admin)
const getMySubscription = async (req, res) => {
  try {
    const schoolId = req.user.school;

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "No school associated with this user",
      });
    }

    let subscription = await Subscription.findOne({ school: schoolId }).populate(
      "school",
      "name code email"
    );

    // If no subscription exists, create one
    if (!subscription) {
      subscription = await Subscription.create({
        school: schoolId,
        status: "inactive",
        accessRestricted: true,
        restrictionReason: "Pending subscription payment",
        amount: 9999,
        plan: "monthly",
      });
      
      subscription = await Subscription.findById(subscription._id).populate(
        "school",
        "name code email"
      );
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription",
      error: error.message,
    });
  }
};

// @desc    Get subscription status
// @route   GET /api/subscriptions/status
// @access  Private (School Admin)
const getSubscriptionStatus = async (req, res) => {
  try {
    const schoolId = req.user.school;

    const subscription = await Subscription.findOne({ school: schoolId });

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          hasSubscription: false,
          status: "inactive",
          accessRestricted: true,
          message: "No active subscription",
        },
      });
    }

    res.json({
      success: true,
      data: {
        hasSubscription: true,
        status: subscription.status,
        accessRestricted: subscription.accessRestricted,
        isActive: subscription.isActive(),
        daysRemaining: subscription.daysRemaining,
        endDate: subscription.endDate,
        nextBillingDate: subscription.nextBillingDate,
      },
    });
  } catch (error) {
    console.error("Get subscription status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription status",
    });
  }
};

// @desc    Initiate subscription payment
// @route   POST /api/subscriptions/initiate-payment
// @access  Private (School Admin)
const initiatePayment = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const { plan = "monthly" } = req.body;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    // Check if school is verified
    if (school.verificationStatus !== "verified") {
      return res.status(403).json({
        success: false,
        message: "School must be verified before subscribing",
      });
    }

    let subscription = await Subscription.findOne({ school: schoolId });

    // Create subscription if it doesn't exist
    if (!subscription) {
      subscription = await Subscription.create({
        school: schoolId,
        plan,
        status: "pending_payment",
        amount: plan === "yearly" ? 99999 : 9999, // ₹99,999/year or ₹9,999/month
        accessRestricted: true,
        restrictionReason: "Pending payment",
      });
    } else {
      subscription.plan = plan;
      subscription.amount = plan === "yearly" ? 99999 : 9999;
      subscription.status = "pending_payment";
      await subscription.save();
    }

    // Create Dodo Payments checkout session
    try {
      const dodoResponse = await axios.post(
        `${process.env.DODO_BASE_URL}/v1/payment_intents`,
        {
          amount: subscription.amount * 100, // Convert to smallest currency unit (paise)
          currency: "INR",
          customer: {
            email: school.email,
            name: school.name,
          },
          metadata: {
            subscriptionId: subscription._id.toString(),
            schoolId: school._id.toString(),
            schoolName: school.name,
            schoolCode: school.code,
            plan: plan,
          },
          success_url: `${process.env.FRONTEND_URL}/subscription/success`,
          cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.DODO_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Dodo Payments session created:", dodoResponse.data);

      const paymentDetails = {
        subscriptionId: subscription._id,
        schoolId: school._id,
        schoolName: school.name,
        schoolCode: school.code,
        amount: subscription.amount,
        currency: "INR",
        plan: plan,
        paymentUrl: dodoResponse.data.payment_link || dodoResponse.data.url,
        paymentIntentId: dodoResponse.data.payment_intent_id || dodoResponse.data.id,
        successUrl: `${process.env.FRONTEND_URL}/subscription/success`,
        cancelUrl: `${process.env.FRONTEND_URL}/subscription/cancel`,
        webhookUrl: `${process.env.BACKEND_URL}/api/subscriptions/webhook`,
      };

      res.json({
        success: true,
        message: "Payment initiated successfully",
        data: paymentDetails,
      });
    } catch (dodoError) {
      console.error("❌ Dodo Payments API error:", dodoError.response?.data || dodoError.message);
      
      // Fallback: Return test payment URL for development
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️ Using test payment URL for development");
        const paymentDetails = {
          subscriptionId: subscription._id,
          schoolId: school._id,
          schoolName: school.name,
          schoolCode: school.code,
          amount: subscription.amount,
          currency: "INR",
          plan: plan,
          paymentUrl: `${process.env.FRONTEND_URL}/subscription/test-payment?subscriptionId=${subscription._id}&amount=${subscription.amount}`,
          successUrl: `${process.env.FRONTEND_URL}/subscription/success`,
          cancelUrl: `${process.env.FRONTEND_URL}/subscription/cancel`,
          webhookUrl: `${process.env.BACKEND_URL}/api/subscriptions/webhook`,
        };

        return res.json({
          success: true,
          message: "Test payment initiated (development mode)",
          data: paymentDetails,
        });
      }

      throw dodoError;
    }
  } catch (error) {
    console.error("Initiate payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
      error: error.message,
    });
  }
};

// @desc    Handle Dodo Payments webhook
// @route   POST /api/subscriptions/webhook
// @access  Public (Webhook)
const handlePaymentWebhook = async (req, res) => {
  try {
    console.log("📥 Received payment webhook:", req.body);

    const {
      subscriptionId,
      transactionId,
      status,
      amount,
      currency,
      paymentMethod,
      schoolId,
    } = req.body;

    // Verify webhook signature (implement based on Dodo Payments documentation)
    // const isValid = verifyWebhookSignature(req);
    // if (!isValid) {
    //   return res.status(401).json({ success: false, message: "Invalid signature" });
    // }

    if (status === "success" || status === "completed") {
      // Find subscription
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        console.error("❌ Subscription not found:", subscriptionId);
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      // Activate subscription
      const paymentDetails = {
        transactionId,
        amount,
        currency: currency || "INR",
        paymentMethod: paymentMethod || "online",
      };

      await Subscription.activateSubscription(subscription.school, paymentDetails);

      // Update school status
      await School.findByIdAndUpdate(subscription.school, {
        subscriptionStatus: "active",
        subscriptionId: subscription._id,
      });

      // Send confirmation email
      const school = await School.findById(subscription.school).populate("owner");
      if (school && school.owner) {
        await sendSubscriptionConfirmationEmail(school, subscription);
      }

      console.log("✅ Subscription activated successfully");

      return res.json({
        success: true,
        message: "Payment processed successfully",
      });
    } else if (status === "failed") {
      // Handle failed payment
      const subscription = await Subscription.findById(subscriptionId);
      if (subscription) {
        subscription.status = "inactive";
        subscription.paymentHistory.push({
          transactionId,
          amount,
          currency: currency || "INR",
          status: "failed",
          paidAt: new Date(),
          paymentMethod,
        });
        await subscription.save();
      }

      console.log("❌ Payment failed");

      return res.json({
        success: true,
        message: "Payment failure recorded",
      });
    }

    res.json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Webhook processing failed",
      error: error.message,
    });
  }
};

// @desc    Manually activate subscription (Super Admin only)
// @route   POST /api/subscriptions/activate/:schoolId
// @access  Private (Super Admin)
const manuallyActivateSubscription = async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { plan = "monthly", note } = req.body;

    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "School not found",
      });
    }

    let subscription = await Subscription.findOne({ school: schoolId });

    if (!subscription) {
      subscription = await Subscription.create({
        school: schoolId,
        plan,
        amount: plan === "yearly" ? 99999 : 9999,
      });
    }

    // Activate subscription
    const paymentDetails = {
      transactionId: `MANUAL_${Date.now()}`,
      amount: subscription.amount,
      currency: "INR",
      paymentMethod: "manual_activation",
    };

    await Subscription.activateSubscription(schoolId, paymentDetails);

    // Update school
    await School.findByIdAndUpdate(schoolId, {
      subscriptionStatus: "active",
      subscriptionId: subscription._id,
    });

    res.json({
      success: true,
      message: "Subscription activated manually",
      data: subscription,
    });
  } catch (error) {
    console.error("Manual activation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to activate subscription",
      error: error.message,
    });
  }
};

// @desc    Get all subscriptions (Super Admin)
// @route   GET /api/subscriptions/all
// @access  Private (Super Admin)
const getAllSubscriptions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const subscriptions = await Subscription.find(query)
      .populate("school", "name code email verificationStatus")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Subscription.countDocuments(query);

    res.json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: subscriptions,
    });
  } catch (error) {
    console.error("Get all subscriptions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscriptions",
    });
  }
};

// Helper function to send subscription confirmation email
const sendSubscriptionConfirmationEmail = async (school, subscription) => {
  try {
    const admin = school.owner;

    await sendEmail({
      to: admin.email,
      subject: "🎉 Subscription Activated - Welcome to LMS!",
      html: `
        <h2>Subscription Activated Successfully!</h2>
        <p>Dear ${admin.name},</p>
        
        <p>Great news! Your subscription for <strong>${school.name}</strong> has been activated.</p>
        
        <div style="background: #D1FAE5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
          <p><strong>✅ Your account is now fully active!</strong></p>
          <p>You can now access all platform features and start creating teachers, students, and parents.</p>
        </div>
        
        <p><strong>Subscription Details:</strong></p>
        <ul>
          <li><strong>Plan:</strong> ${subscription.plan === "yearly" ? "Yearly" : "Monthly"}</li>
          <li><strong>Amount:</strong> ₹${subscription.amount.toLocaleString()}</li>
          <li><strong>Start Date:</strong> ${new Date(subscription.startDate).toLocaleDateString()}</li>
          <li><strong>End Date:</strong> ${new Date(subscription.endDate).toLocaleDateString()}</li>
          <li><strong>Transaction ID:</strong> ${subscription.paymentDetails.transactionId}</li>
        </ul>
        
        <a href="${process.env.FRONTEND_URL}/dashboard" 
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Go to Dashboard
        </a>
        
        <p style="margin-top: 20px;">Welcome aboard! 🚀</p>
      `,
    });
  } catch (error) {
    console.error("Send subscription confirmation email error:", error);
  }
};

module.exports = {
  getMySubscription,
  getSubscriptionStatus,
  initiatePayment,
  handlePaymentWebhook,
  manuallyActivateSubscription,
  getAllSubscriptions,
};
