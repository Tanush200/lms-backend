const webpush = require("web-push");
const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");
const PushSubscription = require("../models/PushSubscription");
const User = require("../models/User");
const { getIO, isUserOnline } = require("../socket/socketServer");

// Configure Web Push
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

let pushConfigured = false;
try {
  if (vapidKeys.publicKey && vapidKeys.privateKey) {
    // Basic validation: public key should decode to 65 bytes (uncompressed P-256 key)
    const b64 = String(vapidKeys.publicKey).replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 2 ? "==" : b64.length % 4 === 3 ? "=" : "";
    const decoded = Buffer.from(b64 + pad, "base64");
    if (decoded.length === 65) {
      webpush.setVapidDetails(
        "mailto:" + (process.env.ADMIN_EMAIL || "admin@example.com"),
        vapidKeys.publicKey,
        vapidKeys.privateKey
      );
      pushConfigured = true;
    } else {
      console.warn("Web Push disabled: VAPID public key is not 65 bytes when decoded.");
    }
  } else {
    console.warn("Web Push disabled: Missing VAPID keys in environment.");
  }
} catch (e) {
  console.warn("Web Push disabled: Failed to initialize VAPID keys:", e.message);
  pushConfigured = false;
}

// Configure Email (env-overridable + timeouts/pool)
const emailService = process.env.EMAIL_SERVICE || "gmail";
const emailHost = process.env.EMAIL_HOST || (emailService === "gmail" ? "smtp.gmail.com" : undefined);
const emailPort = Number(process.env.EMAIL_PORT || 587);
const emailSecure = String(process.env.EMAIL_SECURE || "false").toLowerCase() === "true";

const transporter = nodemailer.createTransport({
  service: emailService,
  host: emailHost,
  port: emailPort,
  secure: emailSecure,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: Number(process.env.EMAIL_MAX_CONNECTIONS || 3),
  maxMessages: Number(process.env.EMAIL_MAX_MESSAGES || 50),
  connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 10000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 5000),
  socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 10000),
  tls: {
    rejectUnauthorized: false,
  },
});

class NotificationService {
  static async createNotification({
    recipientId,
    senderId,
    type,
    title,
    body,
    data = {},
    link,
    schoolId,
  }) {
    try {
      const notification = await Notification.create({
        recipient: recipientId,
        sender: senderId,
        type,
        title,
        body,
        data,
        link,
        school: schoolId,
      });

      await notification.populate("sender", "name email role");

      // Send real-time notification via Socket.IO
      this.sendSocketNotification(recipientId, notification);

      // Send push notification
      this.sendPushNotification(recipientId, notification);

      // Send email if user is offline
      if (!isUserOnline(recipientId)) {
        this.sendEmailNotification(recipientId, notification);
      }

      return notification;
    } catch (error) {
      console.error("Create notification error:", error);
      throw error;
    }
  }

  // Send real-time notification via Socket.IO
  static sendSocketNotification(userId, notification) {
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit("new-notification", { notification });
    } catch (error) {
      console.error("Socket notification error:", error);
    }
  }

  // Send browser push notification
  static async sendPushNotification(userId, notification) {
    try {
      if (!pushConfigured) return; // Skip if VAPID not configured
      const subscriptions = await PushSubscription.find({ user: userId });

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: "/icon-192x192.png",
        badge: "/badge-72x72.png",
        data: {
          url: notification.link || "/dashboard/notifications",
          notificationId: notification._id,
        },
      });

      const sendPromises = subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
              },
            },
            payload
          );
        } catch (error) {
          // If subscription expired, remove it
          if (error.statusCode === 410) {
            await PushSubscription.findByIdAndDelete(sub._id);
          }
          console.error("Push notification error:", error);
        }
      });

      await Promise.all(sendPromises);
    } catch (error) {
      console.error("Send push notification error:", error);
    }
  }

  // Send email notification
  static async sendEmailNotification(userId, notification) {
    try {
      const user = await User.findById(userId).select("name email");
      if (!user || !user.email) return;

      await transporter.sendMail({
        from: `"LMS Notifications" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: notification.title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">${notification.title}</h2>
            <p style="font-size: 16px; color: #374151;">${notification.body}</p>
            ${
              notification.link
                ? `
              <a href="${process.env.FRONTEND_URL}${notification.link}" 
                 style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
                View Details
              </a>
            `
                : ""
            }
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #E5E7EB;">
            <p style="font-size: 12px; color: #6B7280;">
              This is an automated notification from LMS. Please do not reply to this email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error("Email notification error:", error);
    }
  }

  // Notify on new message
  static async notifyNewMessage(message) {
    try {
      const sender = await User.findById(message.sender).select("name role");
      const recipient = message.receiver;

      await this.createNotification({
        recipientId: recipient,
        senderId: message.sender,
        type: "new_message",
        title: `New message from ${sender.name}`,
        body: message.content.substring(0, 100),
        data: {
          messageId: message._id,
          conversationId: message.conversationId,
          studentId: message.student,
        },
        link: `/dashboard/${
          sender.role === "teacher" ? "parent" : "teacher"
        }/messages`,
        schoolId: message.school,
      });
    } catch (error) {
      console.error("Notify new message error:", error);
    }
  }

  // Get user notifications
  static async getUserNotifications(
    userId,
    { page = 1, limit = 20, unreadOnly = false }
  ) {
    try {
      const filter = { recipient: userId };
      if (unreadOnly) filter.isRead = false;

      const notifications = await Notification.find(filter)
        .populate("sender", "name email role")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        unreadCount,
      };
    } catch (error) {
      console.error("Get notifications error:", error);
      throw error;
    }
  }

  // Mark notifications as read
  static async markAsRead(notificationIds, userId) {
    try {
      await Notification.updateMany(
        { _id: { $in: notificationIds }, recipient: userId },
        { isRead: true, readAt: new Date() }
      );
    } catch (error) {
      console.error("Mark as read error:", error);
      throw error;
    }
  }

  // Mark all as read
  static async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
    } catch (error) {
      console.error("Mark all as read error:", error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId, userId) {
    try {
      await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId,
      });
    } catch (error) {
      console.error("Delete notification error:", error);
      throw error;
    }
  }
}

module.exports = NotificationService;