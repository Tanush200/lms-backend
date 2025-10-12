const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"],
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, default: "India" },
    },

    role: {
      type: String,
      enum: {
        values: [
          "super_admin",
          "admin",
          "principal",
          "teacher",
          "student",
          "parent",
          "accountant",
          "librarian",
        ],
        message:
          "Role must be one of: admin, principal, teacher, student, parent, accountant, librarian",
      },
      required: [true, "Role is required"],
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: function () {
        return this.role !== "super_admin";
      },
    },

    profilePhoto: {
      url: String,
      public_id: String,
    },
    documents: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        public_id: String,
        type: {
          type: String,
          enum: [
            "id_proof",
            "address_proof",
            "qualification",
            "experience",
            "other",
          ],
          default: "other",
        },
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },

    // ✅ ADD THESE MISSING FIELDS
    studentId: {
      type: String,
      unique: true,
      sparse: true, // Only students will have this
    },
    employeeId: {
      type: String,
      unique: true,
      sparse: true, // Only employees will have this
    },
    isTemporaryPassword: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    parentOf: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],

    lastLogin: Date,
    passwordChangedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    parentContact: {
      name: String,
      email: String,
      phone: String,
      relationship: {
        type: String,
        enum: ["father", "mother", "guardian"],
      },
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to parent's user account if they have one
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Note: indexes for unique fields (email, studentId, employeeId) are created via schema definitions
// Avoid duplicating indexes here to prevent Mongoose duplicate index warnings

userSchema.virtual("fullAddress").get(function () {
  const { street, city, state, zipCode, country } = this.address || {};
  return [street, city, state, zipCode, country].filter(Boolean).join(", ");
});

// ✅ UPDATED PASSWORD HASHING MIDDLEWARE - PREVENT DOUBLE HASHING
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // ✅ CHECK IF PASSWORD IS ALREADY HASHED (bcrypt hashes start with $2b$ or $2a$)
  if (this.password.startsWith("$2b$") || this.password.startsWith("$2a$")) {
    console.log("🔒 Password already hashed, skipping hashing");
    return next();
  }

  console.log("🔐 Hashing password...");
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model("User", userSchema);
