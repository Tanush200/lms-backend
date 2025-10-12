const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    }, // e.g., "SCH001"
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String,
    },
    contact: {
      phone: String,
      email: String,
      website: String,
    },
    logo: String,
    establishedYear: Number,
    isActive: { type: Boolean, default: true },
    settings: {
      academicYear: String,
      timezone: { type: String, default: "Asia/Kolkata" },
      currency: { type: String, default: "INR" },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("School", schoolSchema);
