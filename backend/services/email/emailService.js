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
   * Send instructor application approval email
   * @param {String} email - User email
   * @param {String} name - User name
   * @returns {Promise<Object>} Send result
   */
  async sendInstructorApprovalEmail(email, name) {
    const dashboardUrl = `${process.env.FRONTEND_URL}/instructor-dashboard`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .icon { text-align: center; font-size: 80px; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Approved! 🎉</h1>
            </div>
            <div class="content">
              <div class="icon">👨‍🏫</div>
              <h2>Congratulations, ${name}!</h2>
              <p>We're excited to inform you that your instructor application has been <strong>approved</strong>!</p>

              <p>You are now an official TekyPro instructor and can start creating and publishing courses.</p>

              <div class="features">
                <h3>What you can do now:</h3>
                <ul>
                  <li>✅ Create and publish courses</li>
                  <li>✅ Upload course content (videos, documents, quizzes)</li>
                  <li>✅ Manage enrolled students</li>
                  <li>✅ Track student progress and performance</li>
                  <li>✅ Communicate with your students</li>
                  <li>✅ Earn revenue from course sales</li>
                </ul>
              </div>

              <p>Ready to create your first course?</p>
              <a href="${dashboardUrl}" class="button">Go to Instructor Dashboard</a>

              <p>If you have any questions or need assistance, our support team is here to help!</p>

              <p>Welcome to the TekyPro instructor community!</p>

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
      subject: '🎉 Your Instructor Application Has Been Approved!',
      html,
      text: `Congratulations ${name}! Your instructor application has been approved. You can now start creating courses!`,
    });
  }

  /**
   * Send instructor application rejection email
   * @param {String} email - User email
   * @param {String} name - User name
   * @param {String} reason - Rejection reason
   * @returns {Promise<Object>} Send result
   */
  async sendInstructorRejectionEmail(email, name, reason) {
    const supportUrl = `${process.env.FRONTEND_URL}/support`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .reason-box { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Update</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thank you for your interest in becoming a TekyPro instructor.</p>

              <p>After careful review, we regret to inform you that your instructor application has not been approved at this time.</p>

              ${reason ? `
                <div class="reason-box">
                  <strong>Feedback:</strong>
                  <p>${reason}</p>
                </div>
              ` : ''}

              <p>We encourage you to:</p>
              <ul>
                <li>Review the feedback provided (if any)</li>
                <li>Enhance your qualifications or teaching experience</li>
                <li>Apply again in the future</li>
              </ul>

              <p>You can still enjoy all student features and continue learning on our platform!</p>

              <p>If you have questions or would like more information, please don't hesitate to contact us.</p>
              <a href="${supportUrl}" class="button">Contact Support</a>

              <p>Thank you for your understanding.</p>

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
      subject: 'Instructor Application Update - TekyPro LMS',
      html,
      text: `Hi ${name}, Thank you for your interest. Your instructor application has not been approved at this time. ${reason ? `Feedback: ${reason}` : ''}`,
    });
  }

  /**
   * Send instructor status revocation email
   * @param {String} email - User email
   * @param {String} name - User name
   * @param {String} reason - Revocation reason
   * @returns {Promise<Object>} Send result
   */
  async sendInstructorRevocationEmail(email, name, reason) {
    const supportUrl = `${process.env.FRONTEND_URL}/support`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .warning { background: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Important Account Update</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>

              <div class="warning">
                <strong>⚠️ Your instructor status has been revoked.</strong>
              </div>

              <p>We regret to inform you that your instructor privileges have been removed from your TekyPro account.</p>

              ${reason ? `
                <p><strong>Reason:</strong> ${reason}</p>
              ` : ''}

              <p>This means you will no longer be able to:</p>
              <ul>
                <li>Create or publish new courses</li>
                <li>Access the instructor dashboard</li>
                <li>Manage student enrollments</li>
              </ul>

              <p>Your existing courses may be archived or removed depending on the circumstances.</p>

              <p>You can still access the platform as a student and enroll in courses.</p>

              <p>If you believe this action was taken in error or would like to discuss this further, please contact our support team.</p>
              <a href="${supportUrl}" class="button">Contact Support</a>

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
      subject: 'Instructor Status Update - TekyPro LMS',
      html,
      text: `Hi ${name}, Your instructor status has been revoked. ${reason ? `Reason: ${reason}` : ''} Please contact support if you have questions.`,
    });
  }

  /**
   * Send course announcement to enrolled students
   * @param {String} email - Student email
   * @param {String} studentName - Student name
   * @param {Object} announcement - Announcement details
   * @returns {Promise<Object>} Send result
   */
  async sendCourseAnnouncement(email, studentName, announcement) {
    const courseUrl = `${process.env.FRONTEND_URL}/courses/${announcement.course_id}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .announcement { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Course Announcement 📢</h1>
            </div>
            <div class="content">
              <h2>Hi ${studentName},</h2>
              <p>Your instructor has posted a new announcement for <strong>${announcement.course_title}</strong>:</p>

              <div class="announcement">
                <h3>${announcement.title}</h3>
                <p>${announcement.content}</p>
                ${announcement.instructor_name ? `<p><em>- ${announcement.instructor_name}</em></p>` : ''}
              </div>

              <p>Stay updated with your course!</p>
              <a href="${courseUrl}" class="button">View Course</a>

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
      subject: `Course Announcement: ${announcement.course_title}`,
      html,
      text: `Hi ${studentName}, New announcement for ${announcement.course_title}: ${announcement.title} - ${announcement.content}`,
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
