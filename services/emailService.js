// services/emailService.js - EMAIL SERVICE IMPLEMENTATION

const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // ✅ CONFIGURE EMAIL TRANSPORTER
    this.transporter = nodemailer.createTransport({
      // Option 1: Gmail SMTP
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your-email@gmail.com
        pass: process.env.EMAIL_PASS, // your-app-password
      },

      // Option 2: Custom SMTP
      // host: process.env.SMTP_HOST,
      // port: process.env.SMTP_PORT,
      // secure: process.env.SMTP_PORT === '465',
      // auth: {
      //   user: process.env.SMTP_USER,
      //   pass: process.env.SMTP_PASS,
      // },
    });

    // Verify transporter
    this.transporter.verify((error, success) => {
      if (error) {
        console.error("❌ Email transporter verification failed:", error);
      } else {
        console.log("✅ Email server is ready to send messages");
      }
    });
  }

  // ✅ SEND STUDENT LOGIN CREDENTIALS
  async sendStudentCredentials(
    email,
    temporaryPassword,
    studentName = "Student"
  ) {
    try {
      const mailOptions = {
        from: {
          name: "Learning Management System",
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        to: email,
        subject: "🎓 Your LMS Account - Login Credentials",
        html: this.getCredentialsEmailTemplate(
          studentName,
          email,
          temporaryPassword
        ),
        text: `
Hello ${studentName},

Your LMS account has been created successfully!

Login Details:
• Email: ${email}
• Temporary Password: ${temporaryPassword}

Please login and change your password immediately.

Login URL: ${process.env.FRONTEND_URL}/login

Best regards,
LMS Administration Team
        `.trim(),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Credentials email sent successfully:", result.messageId);
      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error("❌ Failed to send credentials email:", error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // ✅ EMAIL TEMPLATE FOR CREDENTIALS
  getCredentialsEmailTemplate(studentName, email, temporaryPassword) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LMS Login Credentials</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .credentials-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
        }
        .credential-item {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 5px;
        }
        .password {
            font-family: 'Courier New', monospace;
            background: #e9ecef;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            color: #495057;
        }
        .login-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
            color: #6c757d;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎓 Welcome to LMS!</h1>
        <p>Your account has been created successfully</p>
    </div>
    
    <div class="content">
        <p>Hello <strong>${studentName}</strong>,</p>
        
        <p>Your Learning Management System account has been created by an administrator. You can now access your courses and learning materials.</p>
        
        <div class="credentials-box">
            <h3>📋 Your Login Credentials</h3>
            <div class="credential-item">
                <span><strong>Email:</strong></span>
                <span>${email}</span>
            </div>
            <div class="credential-item">
                <span><strong>Temporary Password:</strong></span>
                <span class="password">${temporaryPassword}</span>
            </div>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important Security Notice:</strong>
            <ul>
                <li>This is a temporary password</li>
                <li>Please change it immediately after logging in</li>
                <li>Do not share your credentials with anyone</li>
            </ul>
        </div>
        
        <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/login" class="login-button">
                🚀 Login to LMS
            </a>
        </div>
        
        <p>If you have any questions or need assistance, please contact your administrator or our support team.</p>
        
        <div class="footer">
            <p>Best regards,<br>
            <strong>LMS Administration Team</strong></p>
            <p><small>This is an automated email. Please do not reply to this email.</small></p>
        </div>
    </div>
</body>
</html>
    `;
  }

  // ✅ SEND PASSWORD RESET EMAIL
  async sendPasswordResetEmail(email, resetToken, userName = "User") {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: {
          name: "Learning Management System",
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        to: email,
        subject: "🔐 Password Reset Request - LMS",
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🔐 Password Reset Request</h2>
        </div>
        <div class="content">
            <p>Hello ${userName},</p>
            <p>You have requested a password reset for your LMS account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this, please ignore this email.</p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Hello ${userName},

You have requested a password reset for your LMS account.

Reset your password: ${resetUrl}

This link will expire in 1 hour.

If you did not request this, please ignore this email.
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Password reset email sent:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Failed to send password reset email:", error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  // ✅ SEND ENROLLMENT NOTIFICATION
  async sendEnrollmentNotification(email, courseName, studentName = "Student") {
    try {
      const mailOptions = {
        from: {
          name: "Learning Management System",
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        to: email,
        subject: `🎯 Enrolled in ${courseName} - LMS`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🎯 Course Enrollment Confirmation</h2>
        </div>
        <div class="content">
            <p>Hello ${studentName},</p>
            <p>Congratulations! You have been successfully enrolled in:</p>
            <h3 style="color: #28a745;">${courseName}</h3>
            <p>You can now access your course materials and start learning!</p>
            <a href="${process.env.FRONTEND_URL}/dashboard/student" class="button">View My Courses</a>
            <p>Happy Learning!</p>
        </div>
    </div>
</body>
</html>
        `,
        text: `
Hello ${studentName},

Congratulations! You have been successfully enrolled in: ${courseName}

You can now access your course materials and start learning!

View your courses: ${process.env.FRONTEND_URL}/dashboard/student

Happy Learning!
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Enrollment email sent:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("❌ Failed to send enrollment email:", error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }
}

module.exports = new EmailService();
