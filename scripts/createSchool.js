const mongoose = require("mongoose");
require("dotenv").config();
const School = require("../models/School");

// ===== CONFIGURATION - CHANGE THESE VALUES =====
const SCHOOL_DATA = {
  name: "Tanush Saha School", // School name
  code: "TSS002", // Unique school code
  address: {
    street: "Sector 45, Near Metro", // Street address
    city: "Gurgaon", // City
    state: "Haryana", // State
    country: "India", // Country
    pincode: "122003", // Pincode
  },
  contact: {
    phone: "+91-9876543210", // Contact phone
    email: "contact@dps.com", // Contact email
    website: "www.dps.com", // Website (optional)
  },
  establishedYear: 1985, // Year established
  logo: "", // Logo URL (optional)
  settings: {
    academicYear: "2025-2026", // Current academic year
    timezone: "Asia/Kolkata", // Timezone
    currency: "INR", // Currency
  },
};
// ==============================================

const createSchool = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!MONGO_URI) {
      console.error("❌ MongoDB URI not found in .env file");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check if school with same code already exists
    const existingSchool = await School.findOne({ code: SCHOOL_DATA.code });
    if (existingSchool) {
      console.log(`❌ School with code "${SCHOOL_DATA.code}" already exists!`);
      console.log(`   Name: ${existingSchool.name}`);
      console.log(`   ID: ${existingSchool._id}`);
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create the school
    const school = await School.create(SCHOOL_DATA);

    console.log("🎉 School created successfully!");
    console.log("═══════════════════════════════════════");
    console.log("🏫 Name:", school.name);
    console.log("🔖 Code:", school.code);
    console.log("🆔 School ID:", school._id);
    console.log(
      "📍 Location:",
      `${school.address.city}, ${school.address.state}`
    );
    console.log("📧 Email:", school.contact.email);
    console.log("📞 Phone:", school.contact.phone);
    console.log("📅 Established:", school.establishedYear);
    console.log("🎓 Academic Year:", school.settings.academicYear);
    console.log("═══════════════════════════════════════");
    console.log("\n💡 Next steps:");
    console.log("   1. Create admin for this school:");
    console.log(
      `      Edit scripts/createSchoolAdmin.js with code "${school.code}"`
    );
    console.log("      Run: node scripts/createSchoolAdmin.js");
    console.log("   2. Or use this School ID to create admin via API");

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating school:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createSchool();
