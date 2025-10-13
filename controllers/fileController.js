const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { getIO } = require("../socket/socketServer");

// @desc    Upload file and send as message
// @route   POST /api/messages/upload
// @access  Private
const uploadFileMessage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const { receiverId, studentId, courseId, content } = req.body;

    if (!receiverId || !studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Determine message type
    let messageType = "file";
    if (req.file.mimetype.startsWith("image/")) {
      messageType = "image";
    }

    // Create message
    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      content:
        content || `Sent ${messageType === "image" ? "an image" : "a file"}`,
      student: studentId,
      course: courseId,
      school: req.user.school,
      messageType,
      fileUrl: req.file.path, // Cloudinary URL
      fileName: req.file.originalname,
      fileSize: req.file.size,
    });

    await message.populate([
      { path: "sender", select: "name email role" },
      { path: "receiver", select: "name email role" },
      { path: "student", select: "name email" },
    ]);

    // Update conversation
    let conversation = await Conversation.findOne({
      student: studentId,
      course: courseId,
    });

    if (conversation) {
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();

      if (req.user.role === "teacher") {
        conversation.unreadCount.parent += 1;
      } else {
        conversation.unreadCount.teacher += 1;
      }

      await conversation.save();
    }

    // Emit to receiver via Socket.IO
    const io = getIO();
    io.to(`user:${receiverId}`).emit("receive-message", { message });

    res.json({
      success: true,
      message: "File uploaded and sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: error.message,
    });
  }
};

module.exports = {
  uploadFileMessage,
};
