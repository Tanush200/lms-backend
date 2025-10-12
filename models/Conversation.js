const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
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
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  unreadCount: {
    teacher: { type: Number, default: 0 },
    parent: { type: Number, default: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ student: 1, course: 1 });
conversationSchema.index({ school: 1 });
conversationSchema.index({ lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
