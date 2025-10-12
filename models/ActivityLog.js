const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      "school_created",
      "school_updated",
      "school_deleted",
      "admin_created",
      "admin_updated",
      "admin_deleted",
      "user_created",
      "user_updated",
      "course_created",
      "system_settings_changed",
    ],
  },
  description: {
    type: String,
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  targetModel: {
    type: String,
    enum: ["School", "User", "Course", "Enrollment"],
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
  },
  schoolName: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ performedBy: 1 });
activityLogSchema.index({ school: 1 });
activityLogSchema.index({ type: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
