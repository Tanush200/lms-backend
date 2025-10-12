const mongoose = require("mongoose");

const attendanceRecordSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: { type: Date, required: true },
  status: {
    type: String,
    enum: ["present", "absent", "late", "excused"],
    default: "present",
  },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  remarks: { type: String },
  createdAt: { type: Date, default: Date.now },
});

attendanceRecordSchema.index(
  { course: 1, student: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("AttendanceRecord", attendanceRecordSchema);
