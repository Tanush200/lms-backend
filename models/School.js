// const mongoose = require("mongoose");

// const schoolSchema = new mongoose.Schema(
//   {
//     name: { type: String, required: true, unique: true, trim: true },
//     code: {
//       type: String,
//       required: true,
//       unique: true,
//       uppercase: true,
//       trim: true,
//     }, // e.g., "SCH001"
//     address: {
//       street: String,
//       city: String,
//       state: String,
//       country: String,
//       pincode: String,
//     },
//     contact: {
//       phone: String,
//       email: String,
//       website: String,
//     },
//     logo: String,
//     establishedYear: Number,
//     isActive: { type: Boolean, default: true },
//     settings: {
//       academicYear: String,
//       timezone: { type: String, default: "Asia/Kolkata" },
//       currency: { type: String, default: "INR" },
//     },
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("School", schoolSchema);


const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "School name is required"],
    trim: true,
  },
  code: {
    type: String,
    required: [true, "School code is required"],
    unique: true,
    uppercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  logo: {
    type: String, // Cloudinary URL
  },
  address: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  state: {
    type: String,
    trim: true,
  },
  zipCode: {
    type: String,
    trim: true,
  },
  country: {
    type: String,
    default: "India",
  },
  website: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
schoolSchema.index({ code: 1 });
schoolSchema.index({ isActive: 1 });
schoolSchema.index({ name: "text", code: "text" });

module.exports = mongoose.model("School", schoolSchema);
