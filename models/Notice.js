const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Information", "Event", "Holiday", "Exam", "Meeting", "Urgent"],
      default: "Information",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        public_id: { type: String },
      },
    ],
    audience: {
      roles: {
        type: [
          {
            type: String,
            enum: [
              "admin",
              "principal",
              "teacher",
              "student",
              "parent",
              "accountant",
              "librarian",
            ],
          },
        ],
        default: ["student", "parent", "teacher"],
      },
      courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
      classes: [{ type: String, trim: true }],
      userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    isPinned: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    publishedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notice", noticeSchema);


