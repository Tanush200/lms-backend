# Subscription API Reference

## Quick Reference

### Complete Flow Summary
```
1. School Registration → Creates inactive subscription
2. Super Admin Approves → Subscription becomes "pending_payment"
3. School Admin Logs In → Redirected to subscription page
4. Admin Initiates Payment → Gets Dodo Payment URL
5. Admin Pays → Dodo sends webhook
6. Webhook Activates Subscription → Status becomes "active"
7. Admin Can Create Users → Full access granted
```

---

## API Endpoints

### 1. School Registration (Public)

#### Register School
```http
POST /api/school-registration/register
Content-Type: application/json

{
  "schoolName": "ABC School",
  "schoolCode": "ABC001",
  "email": "admin@abcschool.com",
  "phone": "+919876543210",
  "password": "securepassword",
  "address": "123 Main St, City",
  "adminName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration submitted successfully! You will receive an email once verified.",
  "data": {
    "schoolCode": "ABC001",
    "email": "admin@abcschool.com",
    "status": "pending_verification"
  }
}
```

---

### 2. Super Admin Routes

#### Get Pending Registrations
```http
GET /api/school-registration/pending
Authorization: Bearer {super_admin_token}
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "...",
      "name": "ABC School",
      "code": "ABC001",
      "email": "admin@abcschool.com",
      "verificationStatus": "pending",
      "owner": {
        "name": "John Doe",
        "email": "admin@abcschool.com"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Approve School
```http
POST /api/school-registration/approve/{schoolId}
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "note": "Welcome to the platform!" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "School approved successfully",
  "data": {
    "_id": "...",
    "name": "ABC School",
    "verificationStatus": "verified",
    "subscriptionStatus": "pending_payment"
  }
}
```

#### Reject School
```http
POST /api/school-registration/reject/{schoolId}
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "reason": "Invalid documentation"
}
```

#### Get All Subscriptions
```http
GET /api/subscriptions/all?status=active&page=1&limit=20
Authorization: Bearer {super_admin_token}
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "totalPages": 1,
  "currentPage": 1,
  "data": [
    {
      "_id": "...",
      "school": {
        "name": "ABC School",
        "code": "ABC001"
      },
      "status": "active",
      "plan": "monthly",
      "amount": 9999,
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  ]
}
```

#### Manually Activate Subscription
```http
POST /api/subscriptions/activate/{schoolId}
Authorization: Bearer {super_admin_token}
Content-Type: application/json

{
  "plan": "monthly", // or "yearly"
  "note": "Complimentary activation"
}
```

---

### 3. Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@abcschool.com",
  "password": "securepassword"
}
```

**Response (Subscription Required):**
```json
{
  "success": true,
  "message": "Subscription required to access the platform",
  "status": "subscription_required",
  "subscriptionStatus": "pending_payment",
  "redirectTo": "/subscription",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "admin@abcschool.com",
    "role": "admin",
    "school": {
      "id": "...",
      "name": "ABC School",
      "code": "ABC001",
      "verificationStatus": "verified",
      "subscriptionStatus": "pending_payment"
    }
  },
  "auth": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "7d"
  }
}
```

**Response (Normal Login - Active Subscription):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "admin@abcschool.com",
    "role": "admin",
    "school": {
      "id": "...",
      "name": "ABC School",
      "subscriptionStatus": "active"
    }
  },
  "auth": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "7d"
  }
}
```

---

### 4. Subscription Management (Protected)

#### Get My Subscription
```http
GET /api/subscriptions/my-subscription
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "school": {
      "_id": "...",
      "name": "ABC School",
      "code": "ABC001"
    },
    "plan": "monthly",
    "status": "pending_payment",
    "amount": 9999,
    "currency": "INR",
    "accessRestricted": true,
    "restrictionReason": "Please complete subscription payment",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Get Subscription Status
```http
GET /api/subscriptions/status
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasSubscription": true,
    "status": "active",
    "accessRestricted": false,
    "isActive": true,
    "daysRemaining": 25,
    "endDate": "2024-01-31T00:00:00.000Z",
    "nextBillingDate": "2024-01-31T00:00:00.000Z"
  }
}
```

#### Initiate Payment
```http
POST /api/subscriptions/initiate-payment
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "plan": "monthly" // or "yearly"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "subscriptionId": "65abc123...",
    "schoolId": "65def456...",
    "schoolName": "ABC School",
    "schoolCode": "ABC001",
    "amount": 9999,
    "currency": "INR",
    "plan": "monthly",
    "paymentUrl": "https://dodopayments.com/checkout?ref=65abc123...",
    "successUrl": "https://yourfrontend.com/subscription/success",
    "cancelUrl": "https://yourfrontend.com/subscription/cancel",
    "webhookUrl": "https://yourbackend.com/api/subscriptions/webhook"
  }
}
```

---

### 5. Payment Webhook (Public)

#### Dodo Payments Webhook
```http
POST /api/subscriptions/webhook
Content-Type: application/json

{
  "subscriptionId": "65abc123...",
  "transactionId": "TXN_123456789",
  "status": "success", // or "failed"
  "amount": 9999,
  "currency": "INR",
  "paymentMethod": "card",
  "schoolId": "65def456..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment processed successfully"
}
```

**What Happens:**
1. Subscription status → `active`
2. Start date → Current date
3. End date → Current date + 30 days (monthly) or + 365 days (yearly)
4. School subscriptionStatus → `active`
5. Access restrictions removed
6. Payment added to history
7. Confirmation email sent to school admin

---

## Status Values

### Subscription Status
- `inactive` - Initial state, no payment
- `pending_payment` - School verified, awaiting payment
- `active` - Payment successful, full access
- `expired` - Subscription period ended
- `cancelled` - Manually cancelled

### School Verification Status
- `pending` - Awaiting super admin approval
- `verified` - Approved by super admin
- `rejected` - Rejected by super admin

---

## Error Responses

### 403 - Subscription Required
```json
{
  "success": false,
  "message": "Your subscription is not active. Please renew to continue.",
  "requiresSubscription": true,
  "subscriptionStatus": "expired",
  "redirectTo": "/subscription"
}
```

### 403 - Verification Pending
```json
{
  "success": false,
  "message": "Your school registration is pending verification. You will receive an email once approved.",
  "status": "pending_verification",
  "schoolName": "ABC School"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "School not found"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Failed to process request",
  "error": "Error details..."
}
```

---

## Frontend Integration Examples

### React - Login with Subscription Check
```javascript
const handleLogin = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.status === 'subscription_required') {
      // Store token
      localStorage.setItem('token', data.auth.token);
      // Redirect to subscription
      navigate('/subscription');
    } else if (data.success) {
      // Normal login
      localStorage.setItem('token', data.auth.token);
      navigate('/dashboard');
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### React - Subscription Page
```javascript
const SubscriptionPage = () => {
  const [subscription, setSubscription] = useState(null);
  
  useEffect(() => {
    fetchSubscription();
  }, []);
  
  const fetchSubscription = async () => {
    const response = await fetch('/api/subscriptions/my-subscription', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setSubscription(data.data);
  };
  
  const handlePayment = async (plan) => {
    const response = await fetch('/api/subscriptions/initiate-payment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ plan })
    });
    
    const data = await response.json();
    // Redirect to payment gateway
    window.location.href = data.data.paymentUrl;
  };
  
  return (
    <div>
      <h1>Subscribe to Continue</h1>
      <p>Status: {subscription?.status}</p>
      <button onClick={() => handlePayment('monthly')}>
        Pay ₹9,999/month
      </button>
      <button onClick={() => handlePayment('yearly')}>
        Pay ₹99,999/year
      </button>
    </div>
  );
};
```

### React - Protected Route
```javascript
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  // Super admin bypass
  if (user.role === 'super_admin') {
    return children;
  }
  
  // Check subscription for admin
  if (user.role === 'admin' && 
      user.school?.subscriptionStatus !== 'active') {
    return <Navigate to="/subscription" />;
  }
  
  return children;
};
```

---

## Testing Commands

### Test Webhook (Success)
```bash
curl -X POST http://localhost:5000/api/subscriptions/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "PASTE_SUBSCRIPTION_ID_HERE",
    "transactionId": "TEST_TXN_'$(date +%s)'",
    "status": "success",
    "amount": 9999,
    "currency": "INR",
    "paymentMethod": "test_card",
    "schoolId": "PASTE_SCHOOL_ID_HERE"
  }'
```

### Test Manual Activation
```bash
curl -X POST http://localhost:5000/api/subscriptions/activate/SCHOOL_ID \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "monthly",
    "note": "Test activation"
  }'
```

---

## Pricing

- **Monthly Plan**: ₹9,999/month
- **Yearly Plan**: ₹99,999/year (Save ₹20,000!)

To change pricing, update the amounts in:
- `backend/models/Subscription.js` (default amount)
- `backend/controllers/subscriptionController.js` (initiatePayment function)
