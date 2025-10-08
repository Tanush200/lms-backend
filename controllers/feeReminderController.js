const FeeReminder = require("../models/FeeReminder");
const User = require("../models/User");
const Course = require("../models/Course");

// Create or update fee reminder
const createOrUpdateReminder = async (req, res) => {
  try {
    const { studentId, courseId, amountDue, dueDate, remarks } = req.body;

    if (!studentId || !courseId || !amountDue || !dueDate) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    const reminder = await FeeReminder.findOneAndUpdate(
      { student: studentId, course: courseId, dueDate: new Date(dueDate) },
      { amountDue, remarks, updatedAt: new Date(), status: "pending" },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, reminder });
  } catch (error) {
    console.error("Create/Update Fee Reminder error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to create/update fee reminder",
        error: error.message,
      });
  }
};

// List all fee reminders (pagination + filters)
const listReminders = async (req, res) => {
  try {
    let { page = 1, limit = 20, studentId, courseId, status } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};
    if (studentId) filter.student = studentId;
    if (courseId) filter.course = courseId;
    if (status) filter.status = status;

    const reminders = await FeeReminder.find(filter)
      .populate("student", "name email studentId")
      .populate("course", "title")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ dueDate: 1 });

    const total = await FeeReminder.countDocuments(filter);

    res.json({
      success: true,
      data: reminders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List Fee Reminders error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to list fee reminders",
        error: error.message,
      });
  }
};

// Mark fee reminder as paid
const markAsPaid = async (req, res) => {
  try {
    const { reminderId } = req.params;

    const updated = await FeeReminder.findByIdAndUpdate(
      reminderId,
      { status: "paid", updatedAt: new Date() },
      { new: true }
    );
    if (!updated)
      return res
        .status(404)
        .json({ success: false, message: "Fee reminder not found" });

    res.json({ success: true, reminder: updated });
  } catch (error) {
    console.error("Mark fee as paid error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to mark fee as paid",
        error: error.message,
      });
  }
};

// Send reminders for due fees (scheduled task or API trigger)
const sendDueReminders = async (req, res) => {
  try {
    const now = new Date();
    // Find reminders pending or overdue and not reminded today
    const dueReminders = await FeeReminder.find({
      dueDate: { $lt: now },
      status: { $in: ["pending", "overdue"] },
      $or: [
        { reminderSentAt: null },
        {
          reminderSentAt: {
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          },
        },
      ],
    })
      .populate("student")
      .populate("course");

    // For demo: pretend to send email, update reminderSentAt
    for (const reminder of dueReminders) {
      console.log(
        `Sending fee reminder to ${reminder.student.email} for course ${reminder.course.title}, amount: ${reminder.amountDue}`
      );

      // Update reminderSentAt and status to overdue
      reminder.reminderSentAt = new Date();
      reminder.status = "overdue";
      await reminder.save();
    }

    res.json({ success: true, count: dueReminders.length });
  } catch (error) {
    console.error("Send Due Reminders error:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to send reminders",
        error: error.message,
      });
  }
};



module.exports = {
  createOrUpdateReminder,
  listReminders,    
    markAsPaid,
    sendDueReminders,
};
