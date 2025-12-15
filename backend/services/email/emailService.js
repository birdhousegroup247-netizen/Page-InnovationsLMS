/**
 * Email Service
 * Handles sending emails using Nodemailer
 */

const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');

class EmailService {
  constructor() {
    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    this.from = process.env.EMAIL_FROM || `TekyPro LMS <${process.env.EMAIL_USER}>`;
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    try {
      const mailOptions = {
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent: ${info.messageId} to ${options.to}`);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send welcome email
   * @param {String} email - User email
   * @param {String} name - User name
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail(email, name) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TekyPro LMS! 🎓</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Welcome to TekyPro Learning Management System! We're excited to have you join our community of learners.</p>

              <p><strong>Here's what you can do:</strong></p>
              <ul>
                <li>📚 Browse and enroll in courses</li>
                <li>🎥 Learn from expert instructors</li>
                <li>📝 Take practice tests to sharpen your skills</li>
                <li>🎓 Earn certificates upon completion</li>
                <li>📊 Track your progress and achievements</li>
              </ul>

              <p>Ready to start learning?</p>
              <a href="${process.env.FRONTEND_URL}/courses" class="button">Explore Courses</a>

              <p>If you have any questions, feel free to reach out to our support team.</p>

              <p>Happy Learning!<br>The TekyPro Team</p>
            </div>
            <div class="footer">
              <p>TekyPro - The Leading Remote DBA Service Provider</p>
              <p><a href="https://www.tekypro.com">www.tekypro.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to TekyPro LMS!',
      html,
      text: `Welcome to TekyPro LMS, ${name}! Start your learning journey today.`,
    });
  }

  /**
   * Send password reset email
   * @param {String} email - User email
   * @param {String} name - User name
   * @param {String} resetToken - Password reset token
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail(email, name, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #f44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request 🔒</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>We received a request to reset your password for your TekyPro LMS account.</p>

              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <p>This link will expire in 1 hour. If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
              </div>

              <p>Best regards,<br>The TekyPro Team</p>
            </div>
            <div class="footer">
              <p>TekyPro - The Leading Remote DBA Service Provider</p>
              <p><a href="https://www.tekypro.com">www.tekypro.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request - TekyPro LMS',
      html,
      text: `Hi ${name}, Click this link to reset your password: ${resetUrl}`,
    });
  }

  /**
   * Send course enrollment confirmation
   * @param {String} email - User email
   * @param {String} name - User name
   * @param {Object} course - Course details
   * @returns {Promise<Object>} Send result
   */
  async sendEnrollmentConfirmation(email, name, course) {
    const courseUrl = `${process.env.FRONTEND_URL}/courses/${course.id}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .course-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Enrollment Confirmed! 🎉</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Congratulations! You've successfully enrolled in:</p>

              <div class="course-card">
                <h3>${course.title}</h3>
                <p>${course.description}</p>
                <p><strong>Instructor:</strong> ${course.instructor?.full_name || 'TBA'}</p>
                ${course.duration_hours ? `<p><strong>Duration:</strong> ${course.duration_hours} hours</p>` : ''}
              </div>

              <p>You can now start learning at your own pace!</p>
              <a href="${courseUrl}" class="button">Start Learning</a>

              <p>Good luck with your learning journey!</p>

              <p>Best regards,<br>The TekyPro Team</p>
            </div>
            <div class="footer">
              <p>TekyPro - The Leading Remote DBA Service Provider</p>
              <p><a href="https://www.tekypro.com">www.tekypro.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Enrollment Confirmed: ${course.title}`,
      html,
      text: `Hi ${name}, You've successfully enrolled in ${course.title}. Start learning now!`,
    });
  }

  /**
   * Send course completion email with certificate
   * @param {String} email - User email
   * @param {String} name - User name
   * @param {Object} course - Course details
   * @param {String} certificateUrl - Certificate URL
   * @returns {Promise<Object>} Send result
   */
  async sendCourseCompletionEmail(email, name, course, certificateUrl) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .certificate-badge { text-align: center; font-size: 80px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Congratulations! 🎊</h1>
            </div>
            <div class="content">
              <div class="certificate-badge">🎓</div>
              <h2>Amazing Achievement, ${name}!</h2>
              <p>You've successfully completed <strong>${course.title}</strong>!</p>

              <p>This is a significant milestone in your learning journey. Your dedication and hard work have paid off!</p>

              <p><strong>Your certificate is ready!</strong></p>
              <a href="${certificateUrl}" class="button">Download Certificate</a>

              <p>Share your achievement on LinkedIn and inspire others!</p>

              <p>Keep up the great work and continue learning!</p>

              <p>Best regards,<br>The TekyPro Team</p>
            </div>
            <div class="footer">
              <p>TekyPro - The Leading Remote DBA Service Provider</p>
              <p><a href="https://www.tekypro.com">www.tekypro.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `🎓 Congratulations! You completed ${course.title}`,
      html,
      text: `Congratulations ${name}! You've completed ${course.title}. Download your certificate: ${certificateUrl}`,
    });
  }

  /**
   * Send test assignment notification
   * @param {String} email - User email
   * @param {String} name - User name
   * @param {Object} test - Test details
   * @returns {Promise<Object>} Send result
   */
  async sendTestAssignmentEmail(email, name, test) {
    const testUrl = `${process.env.FRONTEND_URL}/tests/${test.id}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .test-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Test Assignment 📝</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>You have been assigned a new test:</p>

              <div class="test-info">
                <h3>${test.test_name}</h3>
                <p>${test.description || 'Complete this test to assess your knowledge.'}</p>
                <p><strong>Questions:</strong> ${test.total_questions}</p>
                ${test.time_limit_minutes ? `<p><strong>Time Limit:</strong> ${test.time_limit_minutes} minutes</p>` : ''}
                ${test.due_date ? `<p><strong>Due Date:</strong> ${new Date(test.due_date).toLocaleDateString()}</p>` : ''}
              </div>

              <a href="${testUrl}" class="button">Take Test Now</a>

              <p>Good luck!</p>

              <p>Best regards,<br>The TekyPro Team</p>
            </div>
            <div class="footer">
              <p>TekyPro - The Leading Remote DBA Service Provider</p>
              <p><a href="https://www.tekypro.com">www.tekypro.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `New Test Assignment: ${test.test_name}`,
      html,
      text: `Hi ${name}, You have been assigned a new test: ${test.test_name}. Take it now: ${testUrl}`,
    });
  }

  /**
   * Verify email connection
   * @returns {Promise<Boolean>} Connection status
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new EmailService();
