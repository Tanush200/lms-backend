const Attendance = require("../models/Attendance");
const User = require("../models/User");
const Course = require("../models/Course");
const mongoose = require("mongoose");
const Enrollment = require("../models/Enrollment");

const markBulkAttendance = async (req, res) => {
  try {
    const { courseId, date, attendanceList } = req.body;
    // attendanceList: [{ studentId, status, remarks }]
    // Validate course and students exist
    const course = await Course.findById(courseId);
    if (!course)
      return res
        .status(400)
        .json({ success: false, message: "Course not found." });

    const records = [];
    for (const entry of attendanceList) {
      const user = await User.findById(entry.studentId);
      if (!user) continue;

      const record = await Attendance.findOneAndUpdate(
        { course: courseId, student: entry.studentId, date: date },
        {
          course: courseId,
          student: entry.studentId,
          date,
          status: entry.status || "present",
          markedBy: req.user._id,
          remarks: entry.remarks || "",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      records.push(record);
    }
    res.json({ success: true, records });
  } catch (error) {
    console.error("Mark bulk attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Could not mark attendance",
      error: error.message,
    });
  }
};

const listAttendanceForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { date } = req.query;
    const filter = { course: courseId };
    if (date) {
      // Support YYYY-MM-DD string: filter full day in UTC
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCHours(24, 0, 0, 0);
      filter.date = { $gte: start, $lt: end };
    }
    const records = await Attendance.find(filter)
      .populate("student", "name email studentId")
      .populate("markedBy", "name email");
    res.json({ success: true, records });
  } catch (error) {
    console.error("List course attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch attendance",
      error: error.message,
    });
  }
};

const listAttendanceForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date } = req.query;
    const filter = { student: studentId };
    if (date) filter.date = date;
    const records = await Attendance.find(filter)
      .populate("course", "title")
      .populate("markedBy", "name email");
    res.json({ success: true, records });
  } catch (error) {
    console.error("List student attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch attendance",
      error: error.message,
    });
  }
};

const updateAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, remarks } = req.body;
    const updated = await Attendance.findByIdAndUpdate(
      attendanceId,
      { status, remarks },
      { new: true }
    );
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Attendance not found." });
    res.json({ success: true, record: updated });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update attendance",
      error: error.message,
    });
  }
};

const courseAttendanceAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id",
      });
    }

    const records = await Attendance.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: "$student",
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          total: 1,
          present: 1,
          absent: 1,
          student: { _id: "$student._id", name: "$student.name", email: "$student.email" },
        },
      },
    ]);
    res.json({ success: true, analytics: records });
  } catch (error) {
    console.error("Attendance course analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Could not fetch analytics",
      error: error.message,
    });
  }
};

// Student self-mark attendance for today
const studentMarkToday = async (req, res) => {
  try {
    const { courseId, status = "present", remarks = "" } = req.body;
    const studentId = req.user._id;

    // Validate enrollment
    const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
    if (!enrollment) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this course" });
    }

    // Use date-only (UTC) to ensure one record per day
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await Attendance.findOneAndUpdate(
      { course: courseId, student: studentId, date: today },
      {
        course: courseId,
        student: studentId,
        date: today,
        status,
        markedBy: studentId,
        remarks,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, record });
  } catch (error) {
    console.error("Student mark today error:", error);
    res.status(500).json({ success: false, message: "Could not mark attendance", error: error.message });
  }
};

// Get student's today's record for a course
const studentToday = async (req, res) => {
  try {
    const { courseId } = req.query;
    const studentId = req.user._id;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await Attendance.findOne({ course: courseId, student: studentId, date: today });
    return res.json({ success: true, record });
  } catch (error) {
    console.error("Student today attendance fetch error:", error);
    res.status(500).json({ success: false, message: "Could not fetch attendance", error: error.message });
  }
};

module.exports = {
  markBulkAttendance,
  listAttendanceForCourse,
  listAttendanceForStudent,
  updateAttendance,
  courseAttendanceAnalytics,
  studentMarkToday,
  studentToday,
};
