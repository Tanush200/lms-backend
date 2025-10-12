const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

// @desc    Get conversations for logged-in user
// @route   GET /api/messages/conversations
// @access  Private (Teacher/Parent)
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const schoolId = req.user.school?._id
      ? req.user.school._id.toString()
      : req.user.school
      ? req.user.school.toString()
      : null;
    const schoolFilter = schoolId ? { school: schoolId } : {};

    // Primary: conversations where user is already a participant
    let conversations = await Conversation.find({
      participants: userId,
      ...schoolFilter,
    })
      .populate("participants", "name email role")
      .populate("student", "name email")
      .populate("course", "title")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 });

    // Backfill for parents: ensure they see conversations linked to their children
    if (req.user.role === "parent" || req.user.role === "guardian") {
      // Find students that belong to this parent via parentContact.email OR parentOf linkage
      const parentEmail = req.user.email;
      const [emailStudents, linkedStudents] = await Promise.all([
        User.find({
          role: "student",
          "parentContact.email": parentEmail,
          ...(req.user.school ? { school: req.user.school } : {}),
        }).select("_id"),
        // Direct linkage via parent.parentOf array
        (Array.isArray(req.user.parentOf) && req.user.parentOf.length)
          ? User.find({ _id: { $in: req.user.parentOf }, role: "student", ...(req.user.school ? { school: req.user.school } : {}) }).select("_id")
          : Promise.resolve([]),
      ]);

      const allStudentIds = [...emailStudents, ...linkedStudents].map((s) => s._id.toString());
      const uniqueStudentIds = Array.from(new Set(allStudentIds));

      if (uniqueStudentIds.length > 0) {
        const extra = await Conversation.find({
          student: { $in: uniqueStudentIds },
          ...schoolFilter,
        })
          .populate("participants", "name email role")
          .populate("student", "name email")
          .populate("course", "title")
          .populate("lastMessage")
          .sort({ lastMessageAt: -1 });

        // Ensure parent is a participant to receive future updates
        await Promise.all(
          extra.map(async (conv) => {
            const hasParent = conv.participants.some(
              (p) => p._id.toString() === userId.toString()
            );
            if (!hasParent) {
              conv.participants.push(userId);
              await conv.save();
            }
          })
        );

        // Merge and dedupe by _id
        const map = new Map();
        for (const c of [...conversations, ...extra]) {
          map.set(c._id.toString(), c);
        }
        conversations = Array.from(map.values()).sort(
          (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
        );
      }
    }

    res.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get conversations",
      error: error.message,
    });
  }
};

// @desc    Get messages in a conversation
// @route   GET /api/messages/conversation/:conversationId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    // Verify user is participant
    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const messages = await Message.find({
      student: conversation.student,
      course: conversation.course,
    })
      .populate("sender", "name email role")
      .populate("receiver", "name email role")
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Message.countDocuments({
      student: conversation.student,
      course: conversation.course,
    });

    res.json({
      success: true,
      data: messages, // Oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get messages",
      error: error.message,
    });
  }
};

// @desc    Get students with their parents for a teacher's course
// @route   GET /api/messages/students/:courseId
// @access  Private (Teacher)
const getStudentsWithParents = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify teacher has access to this course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (
      course.instructor.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get enrolled students
      const enrollments = await Enrollment.find({
      course: courseId,
      status: "active",
    }).populate("student", "name email parentContact");

    // Try to resolve a real parent User by email if parentContact exists; otherwise via parent.parentOf linkage
    const studentsWithParents = [];
    for (const enrollment of enrollments) {
      let parent = null;
      const contact = enrollment.student.parentContact || null;
      if (contact?.email) {
        const parentUser = await User.findOne({
          email: contact.email,
          role: { $in: ["parent", "guardian"] },
          ...(req.user.role !== "super_admin" && req.user.school
            ? { school: req.user.school }
            : {}),
        }).select("_id name email role");

        if (parentUser) {
          parent = { _id: parentUser._id, name: parentUser.name, email: parentUser.email };
        } else {
          // Fall back to contact info without _id
          parent = contact;
        }
      }

      // If still no parent with an account, try to find via parent.parentOf linkage (admin linking)
      if (!parent || !parent._id) {
        const linkedParent = await User.findOne({
          role: { $in: ["parent", "guardian"] },
          parentOf: enrollment.student._id,
          ...(req.user.role !== "super_admin" && req.user.school
            ? { school: req.user.school }
            : {}),
        }).select("_id name email role");

        if (linkedParent) {
          parent = { _id: linkedParent._id, name: linkedParent.name, email: linkedParent.email };
        }
      }

      studentsWithParents.push({
        student: {
          _id: enrollment.student._id,
          name: enrollment.student.name,
          email: enrollment.student.email,
        },
        parent: parent,
      });
    }

    res.json({
      success: true,
      data: studentsWithParents,
    });
  } catch (error) {
    console.error("Get students with parents error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get students",
      error: error.message,
    });
  }
};

// @desc    Start new conversation
// @route   POST /api/messages/conversation
// @access  Private (Teacher)
const startConversation = async (req, res) => {
  try {
    const { studentId, courseId, parentId } = req.body;

    // Verify enrollment
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(400).json({
        success: false,
        message: "Student is not enrolled in this course",
      });
    }

    // Resolve parent user if parentId not provided or invalid
    let finalParentId = parentId;
    const isValidObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v));

    if (!finalParentId || !isValidObjectId(finalParentId)) {
      const studentDoc = await User.findById(studentId).select("parentContact");
      const parentEmail = studentDoc?.parentContact?.email;
      if (parentEmail) {
        const parentUser = await User.findOne({
          email: parentEmail,
          role: { $in: ["parent", "guardian"] },
          ...(req.user.role !== "super_admin" && req.user.school
            ? { school: req.user.school }
            : {}),
        }).select("_id");
        if (parentUser) finalParentId = parentUser._id;
      }
      // Fallback: find parent by parent.parentOf linkage when email-based resolution fails
      if (!finalParentId) {
        const linkedParent = await User.findOne({
          role: { $in: ["parent", "guardian"] },
          parentOf: studentId,
          ...(req.user.role !== "super_admin" && req.user.school
            ? { school: req.user.school }
            : {}),
        }).select("_id");
        if (linkedParent) finalParentId = linkedParent._id;
      }
    }

    if (!finalParentId || !isValidObjectId(finalParentId)) {
      return res.status(400).json({
        success: false,
        message: "Parent account not found for this student",
      });
    }

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      student: studentId,
      course: courseId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, finalParentId],
        student: studentId,
        course: courseId,
        school: req.user.school,
        unreadCount: { teacher: 0, parent: 0 },
      });
    }

    await conversation.populate([
      { path: "participants", select: "name email role" },
      { path: "student", select: "name email" },
      { path: "course", select: "title" },
    ]);

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("Start conversation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start conversation",
      error: error.message,
    });
  }
};

module.exports = {
  getConversations,
  getMessages,
  getStudentsWithParents,
  startConversation,
};
