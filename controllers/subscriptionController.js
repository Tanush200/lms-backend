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
      console.log("🔄 Initiating Dodo Payments...");
      console.log("📍 API URL:", `${process.env.DODO_BASE_URL}/subscriptions`);
      console.log("🔑 API Key:", process.env.DODO_API_KEY ? `${process.env.DODO_API_KEY.substring(0, 10)}...` : "NOT SET");
      
      // Get product ID based on plan
      const productId = plan === "yearly" 
        ? process.env.DODO_YEARLY_PRODUCT_ID 
        : process.env.DODO_MONTHLY_PRODUCT_ID;
      
      if (!productId) {
        throw new Error(`Product ID not configured for ${plan} plan. Please set DODO_${plan.toUpperCase()}_PRODUCT_ID in .env`);
      }
      
      console.log("📦 Product ID:", productId);
      
      const dodoResponse = await axios.post(
        `${process.env.DODO_BASE_URL}/subscriptions`,
        {
          product_id: productId,
          quantity: 1,
          payment_link: true,
          customer: {
            email: school.email,
            name: school.name,
          },
          billing: {
            country: "IN",
            city: school.city || "Mumbai",
            state: school.state || "Maharashtra",
            street: school.address || "123 Main Street",
            zipcode: school.zipCode || "400001",
          },
          metadata: {
            subscriptionId: subscription._id.toString(),
            schoolId: school._id.toString(),
            schoolName: school.name,
            schoolCode: school.code,
            plan: plan,
          },
          redirect_url: `${process.env.FRONTEND_URL}/dashboard?payment_return=true`,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.DODO_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Dodo Payments session created:", dodoResponse.data);

      // Store Dodo IDs in subscription for later verification
      subscription.dodoSubscriptionId = dodoResponse.data.subscription_id;
      subscription.dodoPaymentId = dodoResponse.data.payment_id || dodoResponse.data.id;
      await subscription.save();

      const paymentDetails = {
        subscriptionId: subscription._id,
        schoolId: school._id,
        schoolName: school.name,
        schoolCode: school.code,
        amount: subscription.amount,
        currency: "INR",
        plan: plan,
        paymentUrl: dodoResponse.data.payment_link,
        dodoSubscriptionId: dodoResponse.data.subscription_id,
        dodoPaymentId: dodoResponse.data.payment_id || dodoResponse.data.id,
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
      console.error("❌ Dodo Payments API error:");
      console.error("Status:", dodoError.response?.status);
      console.error("Status Text:", dodoError.response?.statusText);
      console.error("Error Data:", JSON.stringify(dodoError.response?.data, null, 2));
      console.error("Error Message:", dodoError.message);
      
      // Return detailed error to help with debugging
      const errorMessage = dodoError.response?.data?.message || dodoError.message;
      const errorDetails = {
        message: `Dodo Payments API failed: ${errorMessage}`,
        status: dodoError.response?.status,
        details: dodoError.response?.data,
      };
      
      return res.status(500).json({
        success: false,
        message: "Failed to create payment session with Dodo Payments",
        error: errorDetails,
        hint: "Please verify your Dodo Payments API credentials in the backend .env file",
      });
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
    console.log("📥 Received Dodo Payments webhook:", JSON.stringify(req.body, null, 2));

    const webhookData = req.body;
    
    // Dodo Payments webhook structure
    const eventType = webhookData.event_type || webhookData.type;
    const subscriptionData = webhookData.subscription || webhookData.data?.subscription || webhookData;
    const paymentData = webhookData.payment || webhookData.data?.payment || webhookData;
    
    console.log("🔍 Event Type:", eventType);
    console.log("🔍 Subscription Data:", subscriptionData);
    console.log("🔍 Payment Data:", paymentData);

    // Extract metadata (contains our custom data)
    const metadata = subscriptionData.metadata || paymentData.metadata || {};
    const subscriptionId = metadata.subscriptionId;
    const schoolId = metadata.schoolId;
    const plan = metadata.plan;

    console.log("🔍 Extracted Metadata:", { subscriptionId, schoolId, plan });

    if (!subscriptionId) {
      console.error("❌ No subscriptionId in webhook metadata");
      return res.status(400).json({
        success: false,
        message: "Missing subscriptionId in webhook",
      });
    }

    // Check if payment is successful
    const paymentStatus = paymentData.status || subscriptionData.status;
    const isSuccessful = 
      paymentStatus === "active" || 
      paymentStatus === "paid" || 
      paymentStatus === "completed" ||
      paymentStatus === "success" ||
      eventType === "subscription.activated" ||
      eventType === "payment.succeeded";

    console.log("💰 Payment Status:", paymentStatus);
    console.log("✅ Is Successful:", isSuccessful);

    if (isSuccessful) {
      // Find subscription
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        console.error("❌ Subscription not found:", subscriptionId);
        return res.status(404).json({
          success: false,
          message: "Subscription not found",
        });
      }

      console.log("📋 Found subscription:", subscription._id);

      // Activate subscription
      const paymentDetails = {
        transactionId: paymentData.payment_id || paymentData.id || subscriptionData.subscription_id || `DODO_${Date.now()}`,
        amount: subscription.amount,
        currency: "INR",
        paymentMethod: "dodo_payments",
      };

      console.log("💳 Payment Details:", paymentDetails);

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

      console.log("✅ Subscription activated successfully for school:", subscription.school);

      return res.json({
        success: true,
        message: "Payment processed successfully",
      });
    } else if (paymentStatus === "failed" || paymentStatus === "cancelled") {
      // Handle failed payment
      const subscription = await Subscription.findById(subscriptionId);
      if (subscription) {
        subscription.status = "inactive";
        subscription.paymentHistory.push({
          transactionId: paymentData.payment_id || paymentData.id || `FAILED_${Date.now()}`,
          amount: subscription.amount,
          currency: "INR",
          status: "failed",
          paidAt: new Date(),
          paymentMethod: "dodo_payments",
        });
        await subscription.save();
      }

      console.log("❌ Payment failed for subscription:", subscriptionId);

      return res.json({
        success: true,
        message: "Payment failure recorded",
      });
    }

    console.log("ℹ️ Webhook received but no action taken. Status:", paymentStatus);
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

// @desc    Verify and activate payment after redirect
// @route   POST /api/subscriptions/verify-payment
// @access  Private (School Admin)
const verifyAndActivatePayment = async (req, res) => {
  try {
    const schoolId = req.user.school;

    console.log("🔍 Verifying payment for school:", schoolId);

    // Find the subscription
    let subscription = await Subscription.findOne({ school: schoolId });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    // If already active, return success
    if (subscription.status === "active" && !subscription.accessRestricted) {
      return res.json({
        success: true,
        message: "Subscription already active",
        data: subscription,
      });
    }

    // If no Dodo IDs, can't verify
    if (!subscription.dodoSubscriptionId) {
      return res.json({
        success: false,
        message: "No pending payment to verify",
        data: subscription,
      });
    }

    console.log("🔍 Dodo Subscription ID:", subscription.dodoSubscriptionId);
    console.log("🔍 Dodo Payment ID:", subscription.dodoPaymentId);

    // Check payment status with Dodo Payments API
    try {
      // Try to get subscription details
      const dodoResponse = await axios.get(
        `${process.env.DODO_BASE_URL}/subscriptions/${subscription.dodoSubscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.DODO_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📥 Dodo Subscription Response:", JSON.stringify(dodoResponse.data, null, 2));

      // Also try to get payment details if payment ID exists
      let paymentResponse = null;
      if (subscription.dodoPaymentId) {
        try {
          paymentResponse = await axios.get(
            `${process.env.DODO_BASE_URL}/payments/${subscription.dodoPaymentId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.DODO_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );
          console.log("📥 Dodo Payment Response:", JSON.stringify(paymentResponse.data, null, 2));
        } catch (paymentError) {
          console.log("⚠️ Could not fetch payment details:", paymentError.message);
        }
      }

      // Check both subscription status and payment status
      const subscriptionStatus = dodoResponse.data.status;
      const paymentStatus = paymentResponse?.data?.status || dodoResponse.data.payment?.status || dodoResponse.data.payment_status;
      
      console.log("🔍 Subscription Status:", subscriptionStatus);
      console.log("🔍 Payment Status:", paymentStatus);
      
      // Check if payment is successful - be more lenient with status checks
      const isPaymentSuccessful = 
        subscriptionStatus === "active" || 
        subscriptionStatus === "paid" || 
        subscriptionStatus === "completed" ||
        subscriptionStatus === "trialing" ||
        paymentStatus === "paid" ||
        paymentStatus === "succeeded" ||
        paymentStatus === "completed" ||
        paymentStatus === "success" ||
        dodoResponse.data.paid === true ||
        paymentResponse?.data?.paid === true;
      
      console.log("✅ Is Payment Successful:", isPaymentSuccessful);
      
      // If payment is successful, activate subscription
      if (isPaymentSuccessful) {
        // Activate subscription
        const paymentDetails = {
          transactionId: subscription.dodoPaymentId || subscription.dodoSubscriptionId,
          amount: subscription.amount,
          currency: "INR",
          paymentMethod: "dodo_payments",
        };

        await Subscription.activateSubscription(schoolId, paymentDetails);

        // Update school status
        await School.findByIdAndUpdate(schoolId, {
          subscriptionStatus: "active",
          subscriptionId: subscription._id,
        });

        // Send confirmation email
        const school = await School.findById(schoolId).populate("owner");
        if (school && school.owner) {
          await sendSubscriptionConfirmationEmail(school, subscription);
        }

        // Fetch updated subscription
        subscription = await Subscription.findOne({ school: schoolId });

        console.log("✅ Subscription activated via verification");

        return res.json({
          success: true,
          message: "Payment verified and subscription activated",
          data: subscription,
        });
      } else {
        console.log("⏳ Payment still pending.");
        console.log("   Subscription Status:", subscriptionStatus);
        console.log("   Payment Status:", paymentStatus);
        
        return res.json({
          success: false,
          message: `Payment not completed yet. Status: ${subscriptionStatus || paymentStatus || 'unknown'}`,
          subscriptionStatus: subscriptionStatus,
          paymentStatus: paymentStatus,
          data: subscription,
          hint: "If you've completed the payment, please wait a few minutes and try again, or contact support.",
        });
      }
    } catch (dodoError) {
      console.error("❌ Dodo API verification error:", dodoError.response?.data || dodoError.message);
      
      // If we can't verify with Dodo, return current subscription status
      return res.json({
        success: false,
        message: "Unable to verify payment status with Dodo Payments",
        error: dodoError.response?.data || dodoError.message,
        currentStatus: subscription.status,
        data: subscription,
      });
    }
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
};

// @desc    Debug subscription (temporary - for testing)
// @route   GET /api/subscriptions/debug
// @access  Private (School Admin)
const debugSubscription = async (req, res) => {
  try {
    const schoolId = req.user.school;
    const subscription = await Subscription.findOne({ school: schoolId });
    
    if (!subscription) {
      return res.json({
        success: false,
        message: "No subscription found",
      });
    }

    res.json({
      success: true,
      data: {
        _id: subscription._id,
        status: subscription.status,
        plan: subscription.plan,
        amount: subscription.amount,
        dodoSubscriptionId: subscription.dodoSubscriptionId,
        dodoPaymentId: subscription.dodoPaymentId,
        accessRestricted: subscription.accessRestricted,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        paymentDetails: subscription.paymentDetails,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
    });
  } catch (error) {
    console.error("Debug subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription debug info",
      error: error.message,
    });
  }
};

module.exports = {
  getMySubscription,
  getSubscriptionStatus,
  initiatePayment,
  handlePaymentWebhook,
  manuallyActivateSubscription,
  getAllSubscriptions,
  verifyAndActivatePayment,
  debugSubscription,
};
