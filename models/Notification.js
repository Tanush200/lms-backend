const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  type: {
    type: String,
    enum: [
      "new_message",
      "message_read",
      "course_update",
      "assignment_graded",
      "announcement",
      "enrollment",
      "system",
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
  },
  link: {
    type: String, // URL to navigate when clicked
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ school: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
