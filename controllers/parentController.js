const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const QuizAttempt = require("../models/QuizAttempt");
const Course = require("../models/Course");

// Get children linked to a parent
const getChildren = async (req, res) => {
  try {
    const parentId = req.params.parentId;

    // Parent can only access their own children or admin can access all
    if (req.user.role !== "admin" && req.user._id.toString() !== parentId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Can only access your own children",
      });
    }

    const parent = await User.findById(parentId)
      .populate({
        path: "parentOf",
        select: "name grade studentId email avatar",
        match: { isActive: true },
      })
      .lean();

    if (!parent) {
      return res
        .status(404)
        .json({ success: false, message: "Parent not found" });
    }

    res.json({ success: true, children: parent.parentOf });
  } catch (error) {
    console.error("Error fetching parent's children:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get progress summary for a child
const getChildProgress = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Validate parent owns the student or admin access

    if (
      req.user.role !== "admin" &&
      !(req.user.parentOf || []).some((cid) => cid.toString() === studentId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cannot access progress for this student",
      });
    }

    // Count enrolled courses
    const enrollments = await Enrollment.find({
      student: studentId,
      status: "active",
    });
    const totalCourses = enrollments.length;

    // Count completed quizzes and average score from QuizAttempts
    const attempts = await QuizAttempt.find({
      student: studentId,
      status: { $in: ["submitted", "auto_submitted"] },
    });

    const completedQuizzes = attempts.length;
    const averageScore =
      attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
      (attempts.length || 1);

    // Calculate total study hours (aggregate from enrollments' performance)
    const studyHours = enrollments.reduce(
      (sum, e) => sum + (e.performance.totalTimeSpent || 0),
      0
    );

    res.json({
      success: true,
      progress: {
        totalCourses,
        completedQuizzes,
        averageScore: Math.round(averageScore),
        studyHours,
      },
    });
  } catch (error) {
    console.error("Error fetching child's progress:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get recent activities for a child
const getChildActivities = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Validate parent owns the student or admin access
    if (
      req.user.role !== "admin" &&
      !(req.user.parentOf || []).some((cid) => cid.toString() === studentId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cannot access activities for this student",
      });
    }

    // Fetch recent quiz attempts
    const attempts = await QuizAttempt.find({ student: studentId })
      .populate("quiz", "title course")
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean();

    const activities = attempts.map((attempt) => ({
      id: attempt._id,
      type: "quiz_completed",
      title: `Completed Quiz: ${attempt.quiz?.title}`,
      course: attempt.quiz?.course,
      score: attempt.percentage,
      time: attempt.submittedAt,
      icon: "check-circle",
      color: "text-green-600 bg-green-100",
    }));

    // Could extend with assignments, enrollment progresses, etc.

    res.json({ success: true, activities });
  } catch (error) {
    console.error("Error fetching child's activities:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get upcoming events relevant to the child
const getChildEvents = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Validate parent owns the student or admin access
    if (
      req.user.role !== "admin" &&
      !(req.user.parentOf || []).some((cid) => cid.toString() === studentId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Cannot access events for this student",
      });
    }

    // In a real system, query upcoming quizzes, assignments, meetings linked to student's courses

    // Mock events for demo:
    const upcomingEvents = [
      {
        id: 1,
        title: "Math Quiz",
        course: "Mathematics",
        type: "quiz",
        date: "2025-10-01",
        time: "10:00 AM",
        status: "upcoming",
      },
      {
        id: 2,
        title: "Science Project Due",
        course: "Science",
        type: "assignment",
        date: "2025-10-05",
        time: "11:59 PM",
        status: "upcoming",
      },
    ];

    res.json({ success: true, events: upcomingEvents });
  } catch (error) {
    console.error("Error fetching child's events:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getChildEvents,
  getChildActivities,
  getChildProgress,
  getChildren
};
