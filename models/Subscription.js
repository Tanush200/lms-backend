const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["inactive", "active", "expired", "cancelled", "pending_payment"],
      default: "inactive",
    },
    amount: {
      type: Number,
      required: true,
      default: 9999, // ₹9,999 per month
    },
    currency: {
      type: String,
      default: "INR",
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    nextBillingDate: {
      type: Date,
    },
    
    // Payment details
    paymentDetails: {
      transactionId: String,
      paymentMethod: String,
      paymentGateway: {
        type: String,
        default: "dodo_payments",
      },
      paidAt: Date,
      amount: Number,
      currency: String,
    },
    
    // Dodo Payments IDs
    dodoSubscriptionId: String,
    dodoPaymentId: String,
    
    // Payment history
    paymentHistory: [
      {
        transactionId: String,
        amount: Number,
        currency: String,
        status: {
          type: String,
          enum: ["success", "failed", "pending", "refunded"],
        },
        paidAt: Date,
        periodStart: Date,
        periodEnd: Date,
        paymentMethod: String,
        receiptUrl: String,
      },
    ],
    
    // Access control
    accessRestricted: {
      type: Boolean,
      default: true,
    },
    restrictionReason: {
      type: String,
      default: "Pending subscription payment",
    },
    
    // Trial period (optional)
    trialEndsAt: {
      type: Date,
    },
    isTrialActive: {
      type: Boolean,
      default: false,
    },
    
    // Cancellation
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
    },
    
    // Auto-renewal
    autoRenew: {
      type: Boolean,
      default: true,
    },
    
    // Metadata
    notes: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
subscriptionSchema.index({ school: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ nextBillingDate: 1 });

// Virtual for days remaining
subscriptionSchema.virtual("daysRemaining").get(function () {
  if (!this.endDate || this.status !== "active") return 0;
  const now = new Date();
  const diff = this.endDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function () {
  if (this.status !== "active") return false;
  if (!this.endDate) return false;
  return new Date() < this.endDate;
};

// Method to check if subscription is expiring soon (within 7 days)
subscriptionSchema.methods.isExpiringSoon = function () {
  if (!this.isActive()) return false;
  const daysRemaining = this.daysRemaining;
  return daysRemaining > 0 && daysRemaining <= 7;
};

// Static method to activate subscription after payment
subscriptionSchema.statics.activateSubscription = async function (
  schoolId,
  paymentDetails
) {
  const subscription = await this.findOne({ school: schoolId });
  
  if (!subscription) {
    throw new Error("Subscription not found");
  }

  const startDate = new Date();
  const endDate = new Date();
  
  // Set end date based on plan (monthly = 30 days, yearly = 365 days)
  if (subscription.plan === "yearly") {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setDate(endDate.getDate() + 30);
  }

  const nextBillingDate = new Date(endDate);

  subscription.status = "active";
  subscription.startDate = startDate;
  subscription.endDate = endDate;
  subscription.nextBillingDate = nextBillingDate;
  subscription.accessRestricted = false;
  subscription.restrictionReason = null;
  subscription.paymentDetails = {
    ...paymentDetails,
    paidAt: new Date(),
  };

  // Add to payment history
  subscription.paymentHistory.push({
    transactionId: paymentDetails.transactionId,
    amount: paymentDetails.amount,
    currency: paymentDetails.currency || "INR",
    status: "success",
    paidAt: new Date(),
    periodStart: startDate,
    periodEnd: endDate,
    paymentMethod: paymentDetails.paymentMethod,
  });

  await subscription.save();
  return subscription;
};

module.exports = mongoose.model("Subscription", subscriptionSchema);
