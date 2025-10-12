// const FeeReminder = require("../models/FeeReminder");
// const User = require("../models/User");
// const nodemailer = require("nodemailer");
// const Course = require("../models/Course");






// const transporter = nodemailer.createTransport({
//   service: "gmail", // Or use custom SMTP settings for other providers
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });


// async function sendMail({ to, subject, html }) {
//   return transporter.sendMail({
//     from: `"LMS Admin" <${process.env.EMAIL_USER}>`,
//     to,
//     subject,
//     html,
//   });
// }

// // Create or update fee reminder
// const createOrUpdateReminder = async (req, res) => {
//   try {
//     const { studentId, courseId, amountDue, dueDate, remarks } = req.body;

//     if (!studentId || !courseId || !amountDue || !dueDate) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Missing required fields" });
//     }

//     const student = await User.findById(studentId);
//     if (!student || student.role !== "student") {
//       return res
//         .status(404)
//         .json({ success: false, message: "Student not found" });
//     }

//     const course = await Course.findById(courseId);
//     if (!course) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Course not found" });
//     }

//     const reminder = await FeeReminder.findOneAndUpdate(
//       { student: studentId, course: courseId, dueDate: new Date(dueDate) },
//       { amountDue, remarks, updatedAt: new Date(), status: "pending" },
//       { new: true, upsert: true, setDefaultsOnInsert: true }
//     );

//     res.json({ success: true, reminder });
//   } catch (error) {
//     console.error("Create/Update Fee Reminder error:", error);
//     res
//       .status(500)
//       .json({
//         success: false,
//         message: "Failed to create/update fee reminder",
//         error: error.message,
//       });
//   }
// };

// // List all fee reminders (pagination + filters)
// const listReminders = async (req, res) => {
//   try {
//     let { page = 1, limit = 20, studentId, courseId, status } = req.query;
//     page = parseInt(page);
//     limit = parseInt(limit);

//     const filter = {};
//     if (studentId) filter.student = studentId;
//     if (courseId) filter.course = courseId;
//     if (status) filter.status = status;

//     const reminders = await FeeReminder.find(filter)
//       .populate("student", "name email studentId")
//       .populate("course", "title")
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .sort({ dueDate: 1 });

//     const total = await FeeReminder.countDocuments(filter);

//     res.json({
//       success: true,
//       data: reminders,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error("List Fee Reminders error:", error);
//     res
//       .status(500)
//       .json({
//         success: false,
//         message: "Failed to list fee reminders",
//         error: error.message,
//       });
//   }
// };

// // Mark fee reminder as paid
// const markAsPaid = async (req, res) => {
//   try {
//     const { reminderId } = req.params;

//     const updated = await FeeReminder.findByIdAndUpdate(
//       reminderId,
//       { status: "paid", updatedAt: new Date() },
//       { new: true }
//     );
//     if (!updated)
//       return res
//         .status(404)
//         .json({ success: false, message: "Fee reminder not found" });

//     res.json({ success: true, reminder: updated });
//   } catch (error) {
//     console.error("Mark fee as paid error:", error);
//     res
//       .status(500)
//       .json({
//         success: false,
//         message: "Failed to mark fee as paid",
//         error: error.message,
//       });
//   }
// };

// // Send reminders for due fees (scheduled task or API trigger)
// const sendDueReminders = async (req, res) => {
//   try {
//     const now = new Date();
//     // Find reminders pending or overdue and not reminded today
//     const dueReminders = await FeeReminder.find({
//       dueDate: { $lt: now },
//       status: { $in: ["pending", "overdue"] },
//       $or: [
//         { reminderSentAt: null },
//         {
//           reminderSentAt: {
//             $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
//           },
//         },
//       ],
//     })
//       .populate("student")
//       .populate("course");

// for (const reminder of dueReminders) {
//   try {
//     await sendMail({
//       to: reminder.student.email,
//       subject: `Fee Due Reminder - ${reminder.course.title}`,
//       html: `
//         <div style="font-family: Arial, sans-serif;">
//           <h2>Dear ${reminder.student.name},</h2>
//           <p>This is a reminder that your fee for the course <b>${
//         reminder.course.title
//       }</b> is due.</p>
//           <ul>
//             <li>Amount Due: <b>₹${reminder.amountDue}</b></li>
//             <li>Due Date: <b>${new Date(
//         reminder.dueDate
//       ).toLocaleDateString()}</b></li>
//           </ul>
//           <p>Please pay as soon as possible. If you have already paid, please ignore this mail.</p>
//           <hr>
//           <small>This is an automated fee reminder from LMS.</small>
//         </div>
//       `,
//     }); // Update reminderSentAt and status to overdue
//     reminder.reminderSentAt = new Date();
//     reminder.status = "overdue";
//     await reminder.save();
//   } catch (emailError) {
//     console.error(
//       "Failed to send email for reminder:",
//       reminder._id,
//       emailError
//     );
//   }
// }


//     res.json({ success: true, count: dueReminders.length });
//   } catch (error) {
//     console.error("Send Due Reminders error:", error);
//     res
//       .status(500)
//       .json({
//         success: false,
//         message: "Failed to send reminders",
//         error: error.message,
//       });
//   }
// };



// module.exports = {
//   createOrUpdateReminder,
//   listReminders,    
//     markAsPaid,
//     sendDueReminders,
// };



const FeeReminder = require("../models/FeeReminder");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const Course = require("../models/Course");
const { getSchoolFilter } = require("../middleware/schoolAuth");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"LMS Admin" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

// Create or update fee reminder
const createOrUpdateReminder = async (req, res) => {
  try {
    const { studentId, courseId, amountDue, dueDate, remarks } = req.body;

    if (!studentId || !courseId || !amountDue || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ✅ FIX: School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const studentSchoolId = student.school.toString();
      const courseSchoolId = course.school.toString();

      if (studentSchoolId !== userSchoolId || courseSchoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message:
            "Cannot create reminder for student/course from different school",
        });
      }
    }

    const reminder = await FeeReminder.findOneAndUpdate(
      { student: studentId, course: courseId, dueDate: new Date(dueDate) },
      {
        amountDue,
        remarks,
        updatedAt: new Date(),
        status: "pending",
        school: course.school,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, reminder });
  } catch (error) {
    console.error("Create/Update Fee Reminder error:", error);
    res.status(500).json({
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

    // Apply school filter
    const schoolFilter = getSchoolFilter(req);
    const filter = { ...schoolFilter };

    if (studentId) filter.student = studentId;
    if (courseId) filter.course = courseId;
    if (status) filter.status = status;

    const reminders = await FeeReminder.find(filter)
      .populate("student", "name email studentId")
      .populate("course", "title")
      .populate("school", "name code")
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
    res.status(500).json({
      success: false,
      message: "Failed to list fee reminders",
      error: error.message,
    });
  }
};

// List student's own fee reminders
const listMyReminders = async (req, res) => {
  try {
    // Apply school filter for safety
    const schoolFilter = getSchoolFilter(req);

    const reminders = await FeeReminder.find({
      student: req.user._id,
      ...schoolFilter,
    })
      .populate("course", "title")
      .populate("school", "name code")
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    console.error("List My Fee Reminders error:", error);
    res.status(500).json({
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

    const reminder = await FeeReminder.findById(reminderId);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: "Fee reminder not found",
      });
    }

    // ✅ FIX: School access validation
    if (req.user.role !== "super_admin") {
      const userSchoolId = (req.user.school?._id || req.user.school).toString();
      const reminderSchoolId = reminder.school.toString();

      if (reminderSchoolId !== userSchoolId) {
        return res.status(403).json({
          success: false,
          message: "Cannot update reminder from different school",
        });
      }
    }

    const updated = await FeeReminder.findByIdAndUpdate(
      reminderId,
      { status: "paid", updatedAt: new Date() },
      { new: true }
    )
      .populate("student", "name email studentId")
      .populate("course", "title")
      .populate("school", "name code");

    res.json({ success: true, reminder: updated });
  } catch (error) {
    console.error("Mark fee as paid error:", error);
    res.status(500).json({
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

    // Apply school filter
    const schoolFilter = getSchoolFilter(req);

    // Find reminders pending or overdue and not reminded today
    const dueReminders = await FeeReminder.find({
      ...schoolFilter,
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
      .populate("course")
      .populate("school", "name");

    let sentCount = 0;

    for (const reminder of dueReminders) {
      try {
        await sendMail({
          to: reminder.student.email,
          subject: `Fee Due Reminder - ${reminder.course.title}`,
          html: `
            <div style="font-family: Arial, sans-serif;">
              <h2>Dear ${reminder.student.name},</h2>
              <p>This is a reminder that your fee for the course <b>${
                reminder.course.title
              }</b> is due.</p>
              <ul>
                <li>Amount Due: <b>₹${reminder.amountDue}</b></li>
                <li>Due Date: <b>${new Date(
                  reminder.dueDate
                ).toLocaleDateString()}</b></li>
                ${
                  reminder.school
                    ? `<li>School: <b>${reminder.school.name}</b></li>`
                    : ""
                }
              </ul>
              <p>Please pay as soon as possible. If you have already paid, please ignore this mail.</p>
              <hr>
              <small>This is an automated fee reminder from LMS.</small>
            </div>
          `,
        });

        // Update reminderSentAt and status to overdue
        reminder.reminderSentAt = new Date();
        reminder.status = "overdue";
        await reminder.save();
        sentCount++;

        console.log(`✅ Reminder sent to ${reminder.student.email}`);
      } catch (emailError) {
        console.error(
          "Failed to send email for reminder:",
          reminder._id,
          emailError
        );
      }
    }

    res.json({
      success: true,
      count: sentCount,
      message: `${sentCount} reminder(s) sent successfully`,
    });
  } catch (error) {
    console.error("Send Due Reminders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send reminders",
      error: error.message,
    });
  }
};

module.exports = {
  createOrUpdateReminder,
  listReminders,
  listMyReminders,
  markAsPaid,
  sendDueReminders,
};
