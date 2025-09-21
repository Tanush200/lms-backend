const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.ObjectId,
      ref: "Course",
      required: true,
    },


    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "active",
        "completed",
        "dropped",
        "suspended",
      ],
      default: "active",
    },


    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: Date,
    completedAt: Date,
    droppedAt: Date,


    progress: {
      materialsViewed: [
        {
          material: {
            type: mongoose.Schema.ObjectId,
            required: true,
          },
          viewedAt: {
            type: Date,
            default: Date.now,
          },
          timeSpent: {
            type: Number,
            default: 0,
          },
          completed: {
            type: Boolean,
            default: false,
          },
        },
      ],

      modulesCompleted: [
        {
          module: {
            type: mongoose.Schema.ObjectId,
            required: true,
          },
          completedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],

      overallProgress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },

      lastAccessedAt: {
        type: Date,
        default: Date.now,
      },
    },


    performance: {
      totalTimeSpent: {
        type: Number,
        default: 0,
      },

      assignmentsSubmitted: {
        type: Number,
        default: 0,
      },

      quizzesTaken: {
        type: Number,
        default: 0,
      },

      averageScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },


    rating: {
      score: {
        type: Number,
        min: 1,
        max: 5,
      },
      feedback: String,
      ratedAt: Date,
    },


    notes: String,
    enrolledBy: {
      type: mongoose.Schema.ObjectId,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);


enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, status: 1 });
enrollmentSchema.index({ student: 1, status: 1 });
enrollmentSchema.index({ enrolledAt: -1 });


enrollmentSchema.virtual("enrollmentDuration").get(function () {
  const endDate = this.completedAt || this.droppedAt || new Date();
  return Math.ceil((endDate - this.enrolledAt) / (1000 * 60 * 60 * 24));
});


enrollmentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();


  if (this.isModified("progress")) {
    this.progress.lastAccessedAt = new Date();
  }

  next();
});


enrollmentSchema.methods.updateMaterialProgress = function (
  materialId,
  timeSpent,
  completed = false
) {
  const existingProgress = this.progress.materialsViewed.find(
    (m) => m.material.toString() === materialId.toString()
  );

  if (existingProgress) {
    existingProgress.timeSpent += timeSpent;
    existingProgress.completed = completed;
    existingProgress.viewedAt = new Date();
  } else {
    this.progress.materialsViewed.push({
      material: materialId,
      timeSpent,
      completed,
      viewedAt: new Date(),
    });
  }


  this.performance.totalTimeSpent += timeSpent;


  this.calculateOverallProgress();
};


enrollmentSchema.methods.calculateOverallProgress = function () {
  // This will be enhanced when we have the full course structure
  const totalMaterials = this.progress.materialsViewed.length;
  const completedMaterials = this.progress.materialsViewed.filter(
    (m) => m.completed
  ).length;

  if (totalMaterials > 0) {
    this.progress.overallProgress = Math.round(
      (completedMaterials / totalMaterials) * 100
    );
  }

  return this.progress.overallProgress;
};


enrollmentSchema.methods.markAsCompleted = function () {
  this.status = "completed";
  this.completedAt = new Date();
  this.progress.overallProgress = 100;
};


enrollmentSchema.statics.getStudentEnrollments = function (
  studentId,
  status = null
) {
  let query = { student: studentId };
  if (status) query.status = status;

  return this.find(query)
    .populate("course", "title description instructor startDate endDate")
    .populate("course.instructor", "name email")
    .sort({ enrolledAt: -1 });
};


enrollmentSchema.statics.getCourseEnrollments = function (
  courseId,
  status = null
) {
  let query = { course: courseId };
  if (status) query.status = status;

  return this.find(query)
    .populate("student", "name email studentId")
    .sort({ enrolledAt: -1 });
};

module.exports = mongoose.model("Enrollment", enrollmentSchema);
