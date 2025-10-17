// const mongoose = require("mongoose");

// const schoolSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: [true, "School name is required"],
//     trim: true,
//   },
//   code: {
//     type: String,
//     required: [true, "School code is required"],
//     unique: true,
//     uppercase: true,
//     trim: true,
//   },
//   email: {
//     type: String,
//     required: [true, "Email is required"],
//     lowercase: true,
//     trim: true,
//   },
//   phone: {
//     type: String,
//     trim: true,
//   },
//   logo: {
//     type: String, // Cloudinary URL
//   },
//   address: {
//     type: String,
//     trim: true,
//   },
//   city: {
//     type: String,
//     trim: true,
//   },
//   state: {
//     type: String,
//     trim: true,
//   },
//   zipCode: {
//     type: String,
//     trim: true,
//   },
//   country: {
//     type: String,
//     default: "India",
//   },
//   website: {
//     type: String,
//     trim: true,
//   },
//   verificationStatus: {
//     type: String,
//     enum: ["pending", "verified", "rejected"],
//     default: "pending",
//   },

//   verificationDetails: {
//     verifiedBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//     },
//     verifiedAt: Date,
//     rejectedAt: Date,
//     rejectionReason: String,
//   },

//   registrationType: {
//     type: String,
//     enum: ["self_registered", "admin_created"],
//     default: "self_registered",
//   },
//   description: {
//     type: String,
//     trim: true,
//   },
//   isActive: {
//     type: Boolean,
//     default: true,
//   },
//   // Owner admin user created during self-registration
//   owner: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//   },
  
//   // Subscription status
//   subscriptionStatus: {
//     type: String,
//     enum: ["inactive", "active", "expired", "cancelled", "pending_payment"],
//     default: "inactive",
//   },
//   subscriptionId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Subscription",
//   },
  
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
//   updatedAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Indexes
// schoolSchema.index({ isActive: 1 });
// schoolSchema.index({ name: "text", code: "text" });

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
    type: String, // Cloudinary URL or fallback from branding.logo
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
  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "rejected"],
    default: "pending",
  },

  verificationDetails: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: Date,
    rejectedAt: Date,
    rejectionReason: String,
  },

  registrationType: {
    type: String,
    enum: ["self_registered", "admin_created"],
    default: "self_registered",
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Owner admin user created during self-registration
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  // Subscription status
  subscriptionStatus: {
    type: String,
    enum: ["inactive", "active", "expired", "cancelled", "pending_payment"],
    default: "inactive",
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
  },

  // Customizable Branding Section
  branding: {
    logo: {
      type: String, // Cloudinary URL or S3 URL for primary logo (overrides logo field)
      default: "/logo1.png",
    },
    favicon: {
      type: String, // Favicon URL
      default: "/favicon.ico",
    },
    schoolName: {
      type: String, // Display name for UI/branding (can differ from .name)
      trim: true,
    },
    colors: {
      primary: { type: String, default: "#3B82F6" }, // blue-600
      secondary: { type: String, default: "#8B5CF6" }, // purple-600
      accent: { type: String, default: "#10B981" }, // green-500
      sidebar: { type: String, default: "#1F2937" }, // gray-800
      sidebarText: { type: String, default: "#F9FAFB" }, // gray-50
    },
    fonts: {
      heading: { type: String, default: "Inter" },
      body: { type: String, default: "Inter" },
    },
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
schoolSchema.index({ isActive: 1 });
schoolSchema.index({ name: "text", code: "text" });

module.exports = mongoose.model("School", schoolSchema);
