const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io;

// Store online users
const onlineUsers = new Map(); // userId -> socketId

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.user.name} (${socket.user.role})`);

    // Add user to online users
    onlineUsers.set(socket.user._id.toString(), socket.id);

    // Emit online status
    io.emit("user-online", { userId: socket.user._id.toString() });

    // Join user's personal room
    socket.join(`user:${socket.user._id}`);

    // Join school room (normalize populated object vs ID)
    if (socket.user.school) {
      const schoolId = socket.user.school._id || socket.user.school;
      socket.join(`school:${schoolId}`);
    }

    // Handle private message
    socket.on("send-message", async (data) => {
      try {
        const {
          receiverId,
          content,
          studentId,
          courseId,
          messageType,
          fileUrl,
          fileName,
          fileSize,
        } = data;

        const Message = require("../models/Message");
        const Conversation = require("../models/Conversation");

        // Create message
        const message = await Message.create({
          sender: socket.user._id,
          receiver: receiverId,
          content,
          student: studentId,
          course: courseId,
          school: socket.user.school,
          messageType,
          fileUrl,
          fileName,
          fileSize,
        });

        await message.populate([
          { path: "sender", select: "name email role" },
          { path: "receiver", select: "name email role" },
          { path: "student", select: "name email" },
        ]);

        // Update or create conversation
        let conversation = await Conversation.findOne({
          student: studentId,
          course: courseId,
        });

        if (!conversation) {
          // Initialize unread so receiver gets 1 on first message
          const unreadCount = { teacher: 0, parent: 0 };
          if (socket.user.role === "teacher") {
            unreadCount.parent = 1; // receiver is parent
          } else {
            unreadCount.teacher = 1; // receiver is teacher
          }

          conversation = await Conversation.create({
            participants: [socket.user._id, receiverId],
            student: studentId,
            course: courseId,
            school: socket.user.school,
            lastMessage: message._id,
            lastMessageAt: new Date(),
            unreadCount,
          });
        } else {
          conversation.lastMessage = message._id;
          conversation.lastMessageAt = new Date();

          // Ensure unreadCount is present
          conversation.unreadCount = conversation.unreadCount || { teacher: 0, parent: 0 };

          // Increment unread count for receiver
          if (socket.user.role === "teacher") {
            conversation.unreadCount.parent += 1;
          } else {
            conversation.unreadCount.teacher += 1;
          }

          await conversation.save();
        }

        // Emit to sender
        socket.emit("message-sent", { message });

        // Emit to receiver if online
        io.to(`user:${receiverId}`).emit("receive-message", { message });

        console.log(
          `📨 Message sent from ${socket.user.name} to ${receiverId}`
        );
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("message-error", { error: error.message });
      }
    });

    // Handle message read
    socket.on("mark-as-read", async (data) => {
      try {
        const { messageIds, conversationId } = data;

        const Message = require("../models/Message");
        const Conversation = require("../models/Conversation");

        // Mark messages as read
        await Message.updateMany(
          { _id: { $in: messageIds }, receiver: socket.user._id },
          { isRead: true, readAt: new Date() }
        );

        // Reset unread count
        if (conversationId) {
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            if (socket.user.role === "teacher") {
              conversation.unreadCount.teacher = 0;
            } else {
              conversation.unreadCount.parent = 0;
            }
            await conversation.save();

            // Notify both participants so their UIs can update unread badges immediately
            const participants = (conversation.participants || [])
              .map((p) => {
                if (!p) return null;
                if (typeof p === "string") return p;
                if (p._id) return p._id.toString();
                if (typeof p.toString === "function") return p.toString();
                return null;
              })
              .filter(Boolean);
            const payload = {
              conversationId: conversation._id.toString(),
              unreadCount: conversation.unreadCount,
            };
            participants.forEach((uid) => {
              io.to(`user:${uid}`).emit("unread-updated", payload);
            });
          }
        }

        // Notify sender
        const messages = await Message.find({ _id: { $in: messageIds } });
        messages.forEach((msg) => {
          io.to(`user:${msg.sender}`).emit("message-read", {
            messageIds: [msg._id],
            readBy: socket.user._id,
          });
        });
      } catch (error) {
        console.error("Mark as read error:", error);
      }
    });

    // Handle typing indicator
    socket.on("typing", (data) => {
      io.to(`user:${data.receiverId}`).emit("user-typing", {
        userId: socket.user._id.toString(),
        conversationId: data.conversationId,
      });
    });

    socket.on("stop-typing", (data) => {
      io.to(`user:${data.receiverId}`).emit("user-stop-typing", {
        userId: socket.user._id.toString(),
        conversationId: data.conversationId,
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.user.name}`);
      onlineUsers.delete(socket.user._id.toString());
      io.emit("user-offline", { userId: socket.user._id.toString() });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

module.exports = { initializeSocket, getIO, isUserOnline };
