const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      maxlength: [200, "Course title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Course description is required"],
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, "Short description cannot exceed 300 characters"],
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    class: {
      type: String,
      required: [true, "Class is required"],
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    category: {
      type: String,
      enum: [
        "academic",
        "extracurricular",
        "technical",
        "language",
        "arts",
        "sports",
      ],
      default: "academic",
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    thumbnail: {
      url: String,
      public_id: String,
    },
    materials: [
      {
        name: {
          type: String,
          required: true,
        },
        description: String,
        type: {
          type: String,
          enum: ["pdf", "video", "audio", "document", "link", "image"],
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        public_id: String,
        size: Number,
        duration: Number,
        order: {
          type: Number,
          default: 0,
        },
        isRequired: {
          type: Boolean,
          default: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        uploadedBy: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
          required: true,
        },
      },
    ],

    modules: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        order: {
          type: Number,
          default: 0,
        },
        materials: [
          {
            type: mongoose.Schema.ObjectId,
            ref: "Material",
          },
        ],
        isRequired: {
          type: Boolean,
          default: true,
        },
      },
    ],

    instructor: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Course instructor is required"],
    },
    assistantInstructors: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],

    maxStudents: {
      type: Number,
      default: 1000,
    },
    enrollmentDeadline: Date,
    startDate: Date,
    endDate: Date,

    status: {
      type: String,
      enum: ["draft", "published", "archived", "suspended"],
      default: "draft",
    },
    isPublic: {
      type: Boolean,
      default: false,
    },

    prerequisites: [
      {
        course: {
          type: mongoose.Schema.ObjectId,
          ref: "Course",
        },
        isRequired: {
          type: Boolean,
          default: true,
        },
      },
    ],

    allowSelfEnrollment: {
      type: Boolean,
      default: true,
    },
    requireApproval: {
      type: Boolean,
      default: false,
    },
    certificateEnabled: {
      type: Boolean,
      default: false,
    },

    stats: {
      totalStudents: {
        type: Number,
        default: 0,
      },
      completedStudents: {
        type: Number,
        default: 0,
      },
      averageProgress: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
      totalRatings: {
        type: Number,
        default: 0,
      },
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


courseSchema.index({ title: "text", description: "text" });
courseSchema.index({ instructor: 1 });
courseSchema.index({ class: 1, subject: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ createdAt: -1 });


courseSchema.virtual("durationInDays").get(function () {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24));
  }
  return null;
});


courseSchema.virtual("enrollmentStatus").get(function () {
  const now = new Date();
  if (this.enrollmentDeadline && now > this.enrollmentDeadline) {
    return "closed";
  }
  if (this.stats.totalStudents >= this.maxStudents) {
    return "full";
  }
  return "open";
});


courseSchema.virtual("enrolledStudents", {
  ref: "Enrollment",
  localField: "_id",
  foreignField: "course",
  count: true,
});


courseSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});


courseSchema.methods.canEnroll = function (user) {
  const now = new Date();
  console.log("🔍 Course Enrollment Check:");
  console.log("- Course Status:", this.status);
  console.log("- Course Public:", this.isPublic);
  console.log("- Current Students:", this.stats.totalStudents);
  console.log("- Max Students:", this.maxStudents);
  console.log("- Enrollment Deadline:", this.enrollmentDeadline);
  console.log("- Allow Self Enrollment:", this.allowSelfEnrollment);

  if (this.status !== "published") {
    return { canEnroll: false, reason: "Course is not published" };
  }


  if (this.enrollmentDeadline && now > this.enrollmentDeadline) {
    return { canEnroll: false, reason: "Enrollment deadline has passed" };
  }


  if (this.maxStudents && this.stats.totalStudents >= this.maxStudents) {
    return { canEnroll: false, reason: "Course is full" };
  }

  if (!this.allowSelfEnrollment && !["admin", "principal", "teacher"].includes(user.role)) {
    return { canEnroll: false, reason: "Self-enrollment not allowed" };
  }

    console.log("✅ Enrollment allowed");
  return { canEnroll: true };
};


courseSchema.methods.getCompletionPercentage = function (studentId) {
  // This will be implemented with enrollment tracking
  return 0;
};


courseSchema.statics.findByInstructor = function (instructorId) {
  return this.find({
    $or: [{ instructor: instructorId }, { assistantInstructors: instructorId }],
  }).populate("instructor", "name email");
};

courseSchema.statics.searchCourses = function (query, filters = {}) {
  let searchQuery = {};


  if (query) {
    searchQuery.$text = { $search: query };
  }


  if (filters.class) searchQuery.class = filters.class;
  if (filters.subject) searchQuery.subject = filters.subject;
  if (filters.category) searchQuery.category = filters.category;
  if (filters.level) searchQuery.level = filters.level;
  if (filters.status) searchQuery.status = filters.status;

  return this.find(searchQuery)
    .populate("instructor", "name email")
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model("Course", courseSchema);
