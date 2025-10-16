const mongoose = require("mongoose");

const academicCalendarSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    eventType: {
      type: String,
      enum: [
        "holiday",
        "exam",
        "meeting",
        "event",
        "vacation",
        "sports",
        "cultural",
        "academic",
        "parent_meeting",
        "teacher_training",
        "other",
      ],
      required: true,
    },
    startDate: {
      type: String, // Changed from Date to String
      required: true,
    },
    endDate: {
      type: String, // Changed from Date to String
      required: true,
    },
    isAllDay: {
      type: Boolean,
      default: true,
    },
    startTime: {
      type: String,
    },
    endTime: {
      type: String,
    },
    location: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: "#3B82F6",
    },
    targetAudience: [
      {
        type: String,
        enum: ["all", "students", "teachers", "parents", "staff"],
      },
    ],
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AcademicCalendar", academicCalendarSchema);
