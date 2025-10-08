const mongoose = require("mongoose");

const feeReminderSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  amountDue: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ["pending", "paid", "overdue", "reminded"],
    default: "pending",
  },
  reminderSentAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  remarks: { type: String },
});

feeReminderSchema.index(
  { student: 1, course: 1, dueDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("FeeReminder", feeReminderSchema);
