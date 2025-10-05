const mongoose = require("mongoose");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const User = require("../models/User");

// @desc    Enroll student in course
// @route   POST /api/courses/:courseId/enroll
// @access  Private (Student) or Admin/Principal
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    let { studentId } = req.body;

    // If no studentId provided and user is student, enroll themselves
    if (!studentId && req.user.role === "student") {
      studentId = req.user._id;
    }

    // Validate required data
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    console.log("🔍 Enrollment Debug:");
    console.log("- User ID:", req.user._id.toString());
    console.log("- Student ID:", studentId.toString());
    console.log("- User Role:", req.user.role);

    // Check permissions - FIXED comparison
    const canEnrollOthers = ["admin", "principal"].includes(req.user.role);
    const isEnrollingSelf = studentId.toString() === req.user._id.toString();

    if (!isEnrollingSelf && !canEnrollOthers) {
      return res.status(403).json({
        success: false,
        message: `You can only enroll yourself. Trying to enroll: ${studentId}, Your ID: ${req.user._id}`,
      });
    }

    // Get course and verify it exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Get student and verify they exist
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    if (existingEnrollment) {
      // Idempotent response: treat as success to simplify admin flows
      return res.status(200).json({
        success: true,
        message: "Student is already enrolled in this course",
        data: { enrollment: existingEnrollment },
      });
    }

    // Check if course allows enrollment
    const enrollmentCheck = course.canEnroll(student);
    if (!enrollmentCheck.canEnroll && !canEnrollOthers) {
      return res.status(400).json({
        success: false,
        message: enrollmentCheck.reason,
      });
    }

    // Create enrollment
    const enrollmentData = {
      student: studentId,
      course: courseId,
      enrolledBy: req.user._id,
      status: course.requireApproval && !canEnrollOthers ? "pending" : "active",
    };

    const enrollment = await Enrollment.create(enrollmentData);

    // Update course statistics
    await Course.findByIdAndUpdate(courseId, {
      $inc: { "stats.totalStudents": 1 },
    });

    // Populate enrollment data
    await enrollment.populate([
      { path: "student", select: "name email studentId" },
      { path: "course", select: "title description instructor" },
      { path: "enrolledBy", select: "name email role" },
    ]);

    res.status(201).json({
      success: true,
      message: `Student ${
        enrollment.status === "pending"
          ? "enrollment pending approval"
          : "enrolled successfully"
      }`,
      data: { enrollment },
    });
  } catch (error) {
    console.error("Enroll in course error:", error);
    res.status(500).json({
      success: false,
      message: "Could not enroll in course",
      error: error.message,
    });
  }
};



// @desc    Get student enrollments
// @route   GET /api/enrollments/student/:studentId
// @access  Private (Own enrollments or Admin/Principal/Teacher)
const getStudentEnrollments = async (req, res) => {
  try {
    const { studentId } = req.params;
    const status = req.query.status;

    const canViewOthers = ["admin", "principal", "teacher"].includes(
      req.user.role
    );
    if (studentId !== req.user._id.toString() && !canViewOthers) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own enrollments",
      });
    }


    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const enrollments = await Enrollment.getStudentEnrollments(
      studentId,
      status
    );

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          studentId: student.studentId,
        },
        enrollmentsCount: enrollments.length,
        enrollments,
      },
    });
  } catch (error) {
    console.error("Get student enrollments error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get student enrollments",
      error: error.message,
    });
  }
};



// @desc    Get course enrollments
// @route   GET /api/courses/:courseId/enrollments
// @access  Private (Course instructor or Admin/Principal)
const getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const status = req.query.status;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }


    const isInstructor =
      course.instructor.toString() === req.user._id.toString();
    const isAssistant = course.assistantInstructors.includes(req.user._id);
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isInstructor && !isAssistant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view course enrollments",
      });
    }

    const enrollments = await Enrollment.getCourseEnrollments(courseId, status);

    res.json({
      success: true,
      data: {
        course: {
          id: course._id,
          title: course.title,
          instructor: course.instructor,
        },
        enrollmentsCount: enrollments.length,
        enrollments,
      },
    });
  } catch (error) {
    console.error("Get course enrollments error:", error);
    res.status(500).json({
      success: false,
      message: "Could not get course enrollments",
      error: error.message,
    });
  }
};



// @desc    Update enrollment status
// @route   PATCH /api/enrollments/:enrollmentId
// @access  Private (Course instructor or Admin/Principal)
const updateEnrollmentStatus = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { status, notes } = req.body;

    const enrollment = await Enrollment.findById(enrollmentId).populate(
      "course",
      "instructor assistantInstructors title"
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // ✅ FIXED: Allow students to mark their own enrollment as completed
    const isStudent = enrollment.student.toString() === req.user._id.toString();
    const isInstructor =
      enrollment.course.instructor.toString() === req.user._id.toString();
    const isAssistant = enrollment.course.assistantInstructors.includes(
      req.user._id
    );
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    // Students can only mark their own enrollment as completed
    if (isStudent && status === "completed") {
      // Allow students to mark their own enrollment as completed
    } else if (!isInstructor && !isAssistant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update enrollment status",
      });
    }


    const validStatuses = [
      "pending",
      "approved",
      "active",
      "completed",
      "dropped",
      "suspended",
    ];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses: ${validStatuses.join(", ")}`,
      });
    }

    const updates = {};
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;


    if (status === "approved") updates.approvedAt = new Date();
    if (status === "completed") updates.completedAt = new Date();
    if (status === "dropped") updates.droppedAt = new Date();

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      enrollmentId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).populate([
      { path: "student", select: "name email studentId" },
      { path: "course", select: "title description" },
    ]);

    res.json({
      success: true,
      message: "Enrollment status updated successfully",
      data: { enrollment: updatedEnrollment },
    });
  } catch (error) {
    console.error("Update enrollment error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update enrollment",
      error: error.message,
    });
  }
};


// @desc    Update enrollment progress
// @route   PATCH /api/enrollments/:enrollmentId/progress
// @access  Private (Student themselves or Course instructor)
const updateProgress = async (req, res) => {
  try {
    const { enrollmentId } = req.params;
    const { materialId, timeSpent, completed } = req.body;

    const enrollment = await Enrollment.findById(enrollmentId).populate({
      path: "course",
      select: "instructor assistantInstructors materials",
      populate: {
        path: "materials",
        select: "title type duration"
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }


    const isStudent = enrollment.student.toString() === req.user._id.toString();
    const isInstructor =
      enrollment.course.instructor.toString() === req.user._id.toString();
    const isAssistant = enrollment.course.assistantInstructors.includes(
      req.user._id
    );
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isStudent && !isInstructor && !isAssistant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update progress",
      });
    }


    const material = enrollment.course.materials.id(materialId);
    if (!material) {
      return res.status(400).json({
        success: false,
        message: "Material not found in course",
      });
    }


    // ✅ FIXED: Use atomic update with upsert to prevent version conflicts
    const materialObjectId = new mongoose.Types.ObjectId(materialId);
    
    // First, try to update existing material progress
    let updateResult = await Enrollment.findOneAndUpdate(
      { 
        _id: enrollmentId,
        "progress.materialsViewed.material": materialObjectId
      },
      {
        $set: {
          "progress.materialsViewed.$.timeSpent": timeSpent || 0,
          "progress.materialsViewed.$.completed": completed,
          "progress.materialsViewed.$.viewedAt": new Date()
        },
        $inc: {
          "performance.totalTimeSpent": timeSpent || 0
        },
        $set: {
          "progress.lastAccessedAt": new Date()
        }
      },
      { 
        new: true,
        runValidators: true
      }
    ).populate({
      path: "course",
      select: "instructor assistantInstructors materials",
      populate: {
        path: "materials",
        select: "title type duration"
      }
    });

    // If no existing material found, add it as new
    if (!updateResult) {
      updateResult = await Enrollment.findOneAndUpdate(
        { _id: enrollmentId },
        {
          $push: {
            "progress.materialsViewed": {
              material: materialObjectId,
              timeSpent: timeSpent || 0,
              completed: completed,
              viewedAt: new Date()
            }
          },
          $inc: {
            "performance.totalTimeSpent": timeSpent || 0
          },
          $set: {
            "progress.lastAccessedAt": new Date()
          }
        },
        { 
          new: true,
          runValidators: true
        }
      ).populate({
        path: "course",
        select: "instructor assistantInstructors materials",
        populate: {
          path: "materials",
          select: "title type duration"
        }
      });
    }

    if (!updateResult) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Calculate and update overall progress
    const totalMaterials = updateResult.course?.materials?.length || 0;
    const completedMaterials = updateResult.progress.materialsViewed.filter(
      (m) => m && m.completed === true
    ).length;
    
    let overallProgress = 0;
    if (totalMaterials > 0) {
      overallProgress = Math.round((completedMaterials / totalMaterials) * 100);
    }
    
    // Ensure progress is within bounds
    overallProgress = Math.min(100, Math.max(0, overallProgress));
    
    // Update the overall progress
    await Enrollment.findByIdAndUpdate(
      enrollmentId,
      { 
        $set: { 
          "progress.overallProgress": overallProgress 
        } 
      }
    );

    // Get the final updated enrollment for response
    const finalEnrollment = await Enrollment.findById(enrollmentId).populate({
      path: "course",
      select: "instructor assistantInstructors materials",
      populate: {
        path: "materials",
        select: "title type duration"
      }
    });

    res.json({
      success: true,
      message: "Progress updated successfully",
      data: {
        overallProgress: finalEnrollment.progress.overallProgress,
        materialProgress: finalEnrollment.progress.materialsViewed.find(
          (m) => m.material.toString() === materialId
        ),
      },
    });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({
      success: false,
      message: "Could not update progress",
      error: error.message,
    });
  }
};

// @desc    Drop from course
// @route   DELETE /api/enrollments/:enrollmentId
// @access  Private (Student themselves or Admin/Principal)
const dropFromCourse = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await Enrollment.findById(enrollmentId)
      .populate("student", "name email")
      .populate("course", "title instructor");

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }


    const isStudent =
      enrollment.student._id.toString() === req.user._id.toString();
    const isAdmin = ["admin", "principal"].includes(req.user.role);

    if (!isStudent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to drop this enrollment",
      });
    }

    enrollment.status = "dropped";
    enrollment.droppedAt = new Date();
    await enrollment.save();


    await Course.findByIdAndUpdate(enrollment.course._id, {
      $inc: { "stats.totalStudents": -1 },
    });

    res.json({
      success: true,
      message: "Successfully dropped from course",
      data: { enrollment },
    });
  } catch (error) {
    console.error("Drop from course error:", error);
    res.status(500).json({
      success: false,
      message: "Could not drop from course",
      error: error.message,
    });
  }
};

// @desc    Mark course as completed by student
// @route   PATCH /api/enrollments/:enrollmentId/complete
// @access  Private (Student themselves)
const markCourseCompleted = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    const enrollment = await Enrollment.findById(enrollmentId).populate(
      "course",
      "instructor assistantInstructors title materials"
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    // Check if user is the student
    if (enrollment.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only complete your own courses",
      });
    }

    // Check if already completed
    if (enrollment.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Course is already completed",
      });
    }

    // Calculate progress based on completed materials
    const totalMaterials = enrollment.course.materials.length;
    const completedMaterials = enrollment.progress.materialsViewed.filter(
      (m) => m.completed
    ).length;
    const progressPercentage = totalMaterials > 0 
      ? Math.round((completedMaterials / totalMaterials) * 100) 
      : 0;

    // Only allow completion if progress is 100% or close to it
    if (progressPercentage < 90) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete course. Progress is only ${progressPercentage}%. Complete more materials first.`,
        data: { progress: progressPercentage }
      });
    }

    // Update enrollment status
    enrollment.status = "completed";
    enrollment.completedAt = new Date();
    enrollment.progress.overallProgress = 100; // ✅ Explicitly set to 100 for completed courses
    
    await enrollment.save();

    res.json({
      success: true,
      message: "Course marked as completed successfully! 🎉",
      data: { 
        enrollment,
        progress: progressPercentage,
        completedMaterials,
        totalMaterials
      },
    });
  } catch (error) {
    console.error("Mark course completed error:", error);
    res.status(500).json({
      success: false,
      message: "Could not mark course as completed",
      error: error.message,
    });
  }
};

module.exports = {
  enrollInCourse,
  getStudentEnrollments,
  getCourseEnrollments,
  updateEnrollmentStatus,
  updateProgress,
  dropFromCourse,
  markCourseCompleted,
};
