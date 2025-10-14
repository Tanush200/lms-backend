# Subscription System Implementation

## Overview
This document describes the complete subscription flow for school admins using Dodo Payments integration.

## Complete Flow

### 1. School Self-Registration
**Endpoint:** `POST /api/school-registration/register`

- School admin fills registration form
- System creates:
  - School record (status: `pending`, isActive: `false`)
  - Admin user (isActive: `false`)
  - Subscription record (status: `inactive`, accessRestricted: `true`)
- Emails sent:
  - To Super Admin: Verification request
  - To School Admin: Registration confirmation

### 2. Super Admin Verification
**Endpoint:** `POST /api/school-registration/approve/:schoolId`

When Super Admin approves:
- School status: `verificationStatus: "verified"`, `isActive: true`, `subscriptionStatus: "pending_payment"`
- Admin user: `isActive: true` (can now login)
- Subscription: `status: "pending_payment"`
- Email sent to School Admin: "Account verified, please subscribe"

### 3. School Admin Login
**Endpoint:** `POST /api/auth/login`

Login behavior:
- If school not verified → Error: "Pending verification"
- If school rejected → Error: "Registration rejected"
- If admin role AND subscription not active:
  - Returns auth token (so they can access subscription page)
  - Returns `status: "subscription_required"`
  - Returns `redirectTo: "/subscription"`
  - Frontend should redirect to subscription page

### 4. Subscription Page Access
**Endpoints:**
- `GET /api/subscriptions/my-subscription` - Get subscription details
- `GET /api/subscriptions/status` - Get subscription status

School admin can view:
- Current subscription status
- Plan options (Monthly: ₹9,999, Yearly: ₹99,999)
- Payment button

### 5. Initiate Payment
**Endpoint:** `POST /api/subscriptions/initiate-payment`

Request body:
```json
{
  "plan": "monthly" // or "yearly"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "subscriptionId": "...",
    "amount": 9999,
    "currency": "INR",
    "paymentUrl": "https://dodopayments.com/checkout?ref=...",
    "successUrl": "https://yourfrontend.com/subscription/success",
    "cancelUrl": "https://yourfrontend.com/subscription/cancel",
    "webhookUrl": "https://yourbackend.com/api/subscriptions/webhook"
  }
}
```

Frontend should redirect user to `paymentUrl`.

### 6. Payment via Dodo Payments
User completes payment on Dodo Payments platform.

### 7. Webhook Processing
**Endpoint:** `POST /api/subscriptions/webhook` (Public - No Auth)

Dodo Payments sends webhook with:
```json
{
  "subscriptionId": "...",
  "transactionId": "...",
  "status": "success",
  "amount": 9999,
  "currency": "INR",
  "paymentMethod": "card",
  "schoolId": "..."
}
```

System automatically:
- Activates subscription (status: `active`)
- Sets start/end dates (30 days for monthly, 365 days for yearly)
- Updates school (subscriptionStatus: `active`)
- Removes access restrictions
- Adds payment to history
- Sends confirmation email to school admin

### 8. Post-Payment Access
After successful payment:
- School admin can access all features
- Can create teachers, students, parents
- Full platform access

## Database Models

### Subscription Model
```javascript
{
  school: ObjectId,
  plan: "monthly" | "yearly",
  status: "inactive" | "active" | "expired" | "cancelled" | "pending_payment",
  amount: Number,
  startDate: Date,
  endDate: Date,
  nextBillingDate: Date,
  paymentDetails: {
    transactionId: String,
    paymentMethod: String,
    paidAt: Date,
    amount: Number
  },
  paymentHistory: [...]
  accessRestricted: Boolean,
  restrictionReason: String
}
```

### School Model (Updated)
```javascript
{
  // ... existing fields
  subscriptionStatus: "inactive" | "active" | "expired" | "cancelled" | "pending_payment",
  subscriptionId: ObjectId
}
```

## API Endpoints

### Public Routes
- `POST /api/school-registration/register` - School self-registration
- `POST /api/subscriptions/webhook` - Payment webhook (Dodo Payments)

### Protected Routes (No Subscription Check)
- `POST /api/auth/login` - Login
- `GET /api/subscriptions/my-subscription` - Get subscription
- `GET /api/subscriptions/status` - Get status
- `POST /api/subscriptions/initiate-payment` - Start payment

### Super Admin Routes
- `GET /api/school-registration/pending` - Pending registrations
- `POST /api/school-registration/approve/:schoolId` - Approve school
- `POST /api/school-registration/reject/:schoolId` - Reject school
- `GET /api/subscriptions/all` - All subscriptions
- `POST /api/subscriptions/activate/:schoolId` - Manual activation

## Middleware

### checkSubscriptionAccess
Apply to routes that require active subscription:
```javascript
app.use("/api/users", protect, checkSubscriptionAccess, userRoutes);
```

Checks:
1. Super admins bypass
2. School must be verified
3. Subscription must exist
4. Subscription must be active
5. Subscription not expired
6. Access not restricted

Returns 403 with `redirectTo: "/subscription"` if checks fail.

## Email Templates

### 1. Registration Confirmation (To School Admin)
- Subject: "✅ School Registration Received"
- Content: Registration pending verification

### 2. Verification Request (To Super Admin)
- Subject: "🔔 New School Registration Request"
- Content: School details, review link

### 3. Approval Email (To School Admin)
- Subject: "🎉 Your School Has Been Verified - Please Subscribe!"
- Content: Login credentials, subscription required, payment amount

### 4. Subscription Confirmation (To School Admin)
- Subject: "🎉 Subscription Activated - Welcome to LMS!"
- Content: Subscription details, transaction ID, dashboard link

## Environment Variables Required

```env
# Frontend URLs
FRONTEND_URL=https://yourfrontend.com

# Backend URLs
BACKEND_URL=https://yourbackend.com

# Dodo Payments (if using actual integration)
DODO_PAYMENT_URL=https://dodopayments.com/checkout
DODO_API_KEY=your_api_key
DODO_WEBHOOK_SECRET=your_webhook_secret

# Email Service
SENDGRID_API_KEY=your_sendgrid_key
FROM_EMAIL=noreply@yourdomain.com
```

## Frontend Implementation Guide

### 1. Login Response Handling
```javascript
const response = await login(email, password);

if (response.status === "subscription_required") {
  // Store auth token
  localStorage.setItem("token", response.auth.token);
  // Redirect to subscription page
  navigate("/subscription");
} else if (response.success) {
  // Normal login - go to dashboard
  navigate("/dashboard");
}
```

### 2. Subscription Page
```javascript
// Fetch subscription status
const subscription = await fetch("/api/subscriptions/my-subscription");

// Show payment button
const initiatePayment = async (plan) => {
  const response = await fetch("/api/subscriptions/initiate-payment", {
    method: "POST",
    body: JSON.stringify({ plan })
  });
  
  // Redirect to payment gateway
  window.location.href = response.data.paymentUrl;
};
```

### 3. Payment Success Page
```javascript
// After redirect from Dodo Payments
// Poll subscription status or wait for webhook
const checkStatus = async () => {
  const status = await fetch("/api/subscriptions/status");
  if (status.data.status === "active") {
    navigate("/dashboard");
  }
};
```

### 4. Protected Routes
```javascript
// Add subscription check to route guards
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (user.role === "admin" && user.school.subscriptionStatus !== "active") {
    return <Navigate to="/subscription" />;
  }
  
  return children;
};
```

## Testing

### Manual Testing Flow
1. Register a new school
2. Check email for confirmation
3. Login as super admin
4. Approve the school
5. Check school admin email for approval
6. Login as school admin
7. Should redirect to subscription page
8. Initiate payment
9. Simulate webhook call (see below)
10. Verify subscription activated
11. Access should be granted

### Simulate Webhook (For Testing)
```bash
curl -X POST http://localhost:5000/api/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "YOUR_SUBSCRIPTION_ID",
    "transactionId": "TEST_TXN_123",
    "status": "success",
    "amount": 9999,
    "currency": "INR",
    "paymentMethod": "test",
    "schoolId": "YOUR_SCHOOL_ID"
  }'
```

### Super Admin Manual Activation (For Testing)
```bash
curl -X POST http://localhost:5000/api/subscriptions/activate/SCHOOL_ID \
  -H "Authorization: Bearer SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "monthly",
    "note": "Test activation"
  }'
```

## Security Considerations

1. **Webhook Verification**: Implement signature verification for Dodo Payments webhooks
2. **Rate Limiting**: Add rate limiting to payment initiation endpoint
3. **Idempotency**: Ensure webhook can be called multiple times safely
4. **Audit Logging**: Log all subscription changes
5. **Payment History**: Maintain complete payment history for auditing

## Subscription Expiry Handling

### Cron Jobs (Commented in app.js - Uncomment when ready)
```javascript
// Daily check at midnight
cron.schedule("0 0 * * *", async () => {
  await checkExpiringSubscriptions(); // Send reminder emails
  await checkExpiredSubscriptions(); // Deactivate expired
});

// Hourly check
cron.schedule("0 * * * *", async () => {
  await checkExpiredSubscriptions();
});
```

### Expiry Logic
- 7 days before expiry: Send reminder email
- On expiry: Set status to `expired`, restrict access
- Auto-renewal: If enabled, attempt to charge

## Troubleshooting

### Issue: School admin can't login after approval
- Check: `user.isActive` should be `true`
- Check: `school.verificationStatus` should be `"verified"`

### Issue: Webhook not working
- Check: Webhook URL is publicly accessible
- Check: Dodo Payments webhook configuration
- Check: Webhook signature verification (if implemented)

### Issue: Subscription not activating
- Check: Webhook payload format
- Check: `subscriptionId` matches
- Check: Database connection
- Check: Email service for confirmation

### Issue: Access still restricted after payment
- Check: `subscription.status` is `"active"`
- Check: `subscription.accessRestricted` is `false`
- Check: `school.subscriptionStatus` is `"active"`
- Check: `subscription.endDate` is in the future

## Next Steps

1. **Integrate with actual Dodo Payments API**
   - Get API credentials
   - Implement payment link generation
   - Implement webhook signature verification

2. **Add subscription renewal flow**
   - Auto-renewal logic
   - Manual renewal option
   - Grace period handling

3. **Add subscription management features**
   - Upgrade/downgrade plans
   - Cancel subscription
   - Refund handling

4. **Implement usage limits (optional)**
   - Max teachers per plan
   - Max students per plan
   - Storage limits

5. **Add analytics**
   - Subscription metrics
   - Revenue tracking
   - Churn analysis

## Files Created/Modified

### New Files
- `backend/models/Subscription.js` - Subscription model
- `backend/controllers/subscriptionController.js` - Subscription logic
- `backend/routes/subscriptionRoutes.js` - Subscription routes
- `backend/middleware/checkSubscription.js` - Subscription middleware
- `backend/SUBSCRIPTION_IMPLEMENTATION.md` - This documentation

### Modified Files
- `backend/models/School.js` - Added subscription fields
- `backend/controllers/schoolRegistrationController.js` - Added subscription creation, updated emails
- `backend/controllers/authController.js` - Already had subscription redirect logic
- `backend/app.js` - Added subscription routes and webhook
