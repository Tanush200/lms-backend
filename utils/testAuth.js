// backend/utils/testAuth.js
const axios = require("axios");

const API_BASE_URL = "http://localhost:5000/api";

// Test authentication flow
const testAuthFlow = async () => {
  console.log("🧪 Testing Authentication System...\n");

  try {
    // 1. Test Registration
    console.log("1️⃣ Testing Registration...");
    const registerData = {
      name: "Test Admin",
      email: "admin@test.com",
      password: "admin123",
      role: "admin",
      phone: "1234567890",
    };

    const registerResponse = await axios.post(
      `${API_BASE_URL}/auth/register`,
      registerData
    );
    console.log("✅ Registration successful");
    console.log(
      "User:",
      registerResponse.data.data.user.name,
      "-",
      registerResponse.data.data.user.role
    );

    const token = registerResponse.data.data.auth.token;
    console.log("🔑 Token received\n");

    // 2. Test Login
    console.log("2️⃣ Testing Login...");
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "admin@test.com",
      password: "admin123",
    });
    console.log("✅ Login successful");
    console.log("User:", loginResponse.data.data.user.name);
    console.log("Last Login:", loginResponse.data.data.user.lastLogin, "\n");

    // 3. Test Protected Route
    console.log("3️⃣ Testing Protected Route...");
    const profileResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Protected route access successful");
    console.log(
      "Profile:",
      profileResponse.data.data.user.name,
      "-",
      profileResponse.data.data.user.email,
      "\n"
    );

    // 4. Test Role-based Access
    console.log("4️⃣ Testing Role-based Access...");
    const usersResponse = await axios.get(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ Admin access to users list successful");
    console.log("Total users:", usersResponse.data.data.pagination.total, "\n");

    // 5. Test Change Password
    console.log("5️⃣ Testing Change Password...");
    await axios.patch(
      `${API_BASE_URL}/auth/change-password`,
      {
        currentPassword: "admin123",
        newPassword: "newadmin123",
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Password change successful\n");

    // 6. Test Login with New Password
    console.log("6️⃣ Testing Login with New Password...");
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: "admin@test.com",
      password: "newadmin123",
    });
    console.log("✅ Login with new password successful\n");

    console.log("🎉 All authentication tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
};

// Run tests if called directly
if (require.main === module) {
  testAuthFlow();
}

module.exports = testAuthFlow;
