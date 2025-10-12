const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  messageType: {
    type: String,
    enum: ["text", "file", "image"],
    default: "text",
  },
  fileUrl: {
    type: String,
  },
  fileName: {
    type: String,
  },
  fileSize: {
    type: Number,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, // The student this conversation is about
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for faster queries
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ student: 1, course: 1 });
messageSchema.index({ school: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ isRead: 1 });

module.exports = mongoose.model("Message", messageSchema);
