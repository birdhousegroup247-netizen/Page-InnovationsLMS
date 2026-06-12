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
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      title: 'Welcome to TekyPro!',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Welcome to TekyPro Learning Management System! We're excited to have you join our community of learners.</p>
<div class="hi"><strong>Here's what you can do:</strong><ul>
<li>Browse and enroll in courses</li>
<li>Learn from expert instructors</li>
<li>Take practice tests to sharpen your skills</li>
<li>Earn certificates upon completion</li>
<li>Track your progress and achievements</li>
</ul></div>
<p>Ready to start learning? Explore our full course catalogue below.</p>`,
      ctaText: 'Explore Courses',
      ctaUrl: `${FE}/courses`,
    });
    return this.sendEmail({
      to: email,
      subject: 'Welcome to TekyPro LMS!',
      html,
      text: `Welcome to TekyPro LMS, ${name}! Start your learning journey today.`,
    });
  }

  /**
   * Send email verification (link + 6-digit code)
   * @param {String} email
   * @param {String} name
   * @param {String} token - verification token for the link
   * @param {String} code - 6-digit code shown in email body
   */
  async sendVerificationEmail(email, name, token, code) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyUrl = `${FE}/verify-email?token=${token}`;
    const html = this._baseTemplate({
      title: 'Verify Your Email',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Welcome to TekyPro! To finish creating your account, please verify your email address.</p>
<p>You have two ways to verify — pick whichever is easier:</p>
<div class="hi">
<p style="margin:0 0 8px"><strong>Option 1 — Click the button below</strong></p>
<p style="margin:0;color:#555;font-size:13px">The link below verifies your email in one click. It expires in 24 hours.</p>
</div>
<div class="hi" style="text-align:center">
<p style="margin:0 0 8px"><strong>Option 2 — Enter this code on the verification page</strong></p>
<p style="margin:0;font-size:32px;letter-spacing:8px;font-weight:900;color:#0e2b5c;font-family:'Courier New',monospace">${code}</p>
</div>
<p style="font-size:13px;color:#888">If you did not create a TekyPro account, you can safely ignore this email.</p>`,
      ctaText: 'Verify My Email',
      ctaUrl: verifyUrl,
    });
    return this.sendEmail({
      to: email,
      subject: 'Verify your TekyPro email address',
      html,
      text: `Hi ${name}, verify your TekyPro email by visiting ${verifyUrl} or by entering this code on the verification page: ${code}`,
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
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#dc2626,#b91c1c)',
      title: 'Password Reset Request',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>We received a request to reset the password for your TekyPro account. Click the button below to set a new password.</p>
<div class="wa"><strong>Security Notice:</strong> This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</div>
<p style="font-size:13px;color:#888">Or copy and paste this link into your browser:<br><span style="word-break:break-all;color:#0e2b5c">${resetUrl}</span></p>`,
      ctaText: 'Reset My Password',
      ctaUrl: resetUrl,
    });
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
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const courseUrl = `${FE}/courses/${course.id}`;
    const html = this._baseTemplate({
      title: 'Enrollment Confirmed!',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Congratulations! You've successfully enrolled in:</p>
<div class="hi">
<h3 style="margin:0 0 8px">${course.title}</h3>
${course.description ? `<p style="margin:0 0 8px;color:#555">${course.description}</p>` : ''}
${course.instructor?.full_name ? `<p style="margin:0 0 4px"><strong>Instructor:</strong> ${course.instructor.full_name}</p>` : ''}
${course.duration_hours ? `<p style="margin:0"><strong>Duration:</strong> ${course.duration_hours} hours</p>` : ''}
</div>
<p>You can now start learning at your own pace. Good luck with your learning journey!</p>`,
      ctaText: 'Start Learning',
      ctaUrl: courseUrl,
    });
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
   * Send "application received" confirmation to the instructor applicant
   */
  async sendInstructorApplicationReceived(email, name) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      title: 'We received your instructor application',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Thanks for applying to teach on TekyPro. We've received your application and our admin team is reviewing it.</p>
<div class="hi"><strong>What happens next:</strong><ul>
<li>Our team reviews your details and supporting documents — usually within 2–3 business days</li>
<li>You'll receive an email once your application is approved or if we need more information</li>
<li>In the meantime, you can use TekyPro as a student — browse courses, watch previews, and join the community</li>
</ul></div>
<p>If you have any questions while you wait, just reply to this email.</p>`,
      ctaText: 'Go to My Dashboard',
      ctaUrl: `${FE}/dashboard`,
    });
    return this.sendEmail({
      to: email,
      subject: 'Your TekyPro instructor application is being reviewed',
      html,
      text: `Hi ${name}, we received your instructor application. The admin team is reviewing it and you'll hear back within 2-3 business days.`,
    });
  }

  /**
   * Notify an admin that a new instructor application has been submitted
   */
  async sendNewInstructorApplicationToAdmin(adminEmail, adminName, { applicantName, applicantEmail, applicationId }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const reviewUrl = `${FE}/admin/instructor-applications`;
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
      title: 'New Instructor Application',
      body: `<p>Hi <strong>${adminName || 'Admin'}</strong>,</p>
<p>A new instructor application has been submitted on TekyPro and is awaiting review.</p>
<div class="hi">
<p><strong>Applicant:</strong> ${applicantName}</p>
<p><strong>Email:</strong> ${applicantEmail}</p>
<p><strong>Application ID:</strong> #${applicationId}</p>
</div>
<p>Open the admin portal to review the bio, qualifications, teaching experience, and supporting documents (CV + credentials).</p>`,
      ctaText: 'Review Application',
      ctaUrl: reviewUrl,
    });
    return this.sendEmail({
      to: adminEmail,
      subject: `New instructor application from ${applicantName}`,
      html,
      text: `New instructor application from ${applicantName} (${applicantEmail}). Review at ${reviewUrl}`,
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

  // ─── Shared HTML shell ────────────────────────────────────────────────────
  _baseTemplate({ headerColor = 'linear-gradient(135deg,#0e2b5c,#2e3192)', title, body, ctaText, ctaUrl }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const cta = ctaText && ctaUrl
      ? `<div style="text-align:center;margin:28px 0"><a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background:#eb1c22;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;font-family:Arial,sans-serif">${ctaText}</a></div>`
      : '';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f9;color:#333}.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}.hdr{background:${headerColor};padding:28px 40px;text-align:center}.hdr .logo{font-size:26px;font-weight:900;color:#fff;letter-spacing:1px;margin:0}.hdr h1{margin:8px 0 0;color:#fff;font-size:20px;font-weight:600}.bd{padding:32px 40px}.bd p{line-height:1.75;margin:0 0 16px}.bd ul{padding-left:20px;line-height:1.9}.hi{background:#f0f4ff;border-left:4px solid #0e2b5c;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0}.wa{background:#fff8e1;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0}.da{background:#fff0f0;border-left:4px solid #ef4444;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0}.ft{background:#f9fafb;padding:20px 40px;text-align:center;color:#888;font-size:12px;border-top:1px solid #eee}.ft a{color:#0e2b5c;text-decoration:none}</style>
</head><body><div style="padding:16px"><div class="wrap">
<div class="hdr"><p class="logo">TekyPro</p><h1>${title}</h1></div>
<div class="bd">${body}${cta}</div>
<div class="ft"><p>TekyPro — Professional Database Training</p><p><a href="https://www.tekypro.com">www.tekypro.com</a> · <a href="mailto:support@tekypro.com">support@tekypro.com</a></p><p style="margin-top:10px;font-size:11px;color:#bbb">You received this because you registered on TekyPro. <a href="${FE}/unsubscribe">Unsubscribe</a></p></div>
</div></div></body></html>`;
  }

  // ─── Lead Drip Sequence (Sequence A) ────────────────────────────────────────

  async sendLeadWelcome(email, name, courseTitle = 'our courses') {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      title: 'Your Free Preview is Ready!',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Welcome to TekyPro! Your account is all set — you now have <strong>free preview access</strong> to all our courses.</p>
<div class="hi"><strong>What you can do right now:</strong><ul>
<li>Browse the full course catalogue</li>
<li>Watch Lesson 1 of any course — completely free</li>
<li>Explore course outlines, instructor profiles, and community forums</li>
</ul></div>
<p>When you're ready to unlock the full course, enrollment is just one click away — with flexible payment options including our 60/40 installment plan.</p>
<p>Start exploring now 👇</p>`,
      ctaText: 'Browse Courses Free',
      ctaUrl: `${FE}/courses`,
    });
    return this.sendEmail({ to: email, subject: `Welcome to TekyPro, ${name} — your free preview is ready`, html, text: `Hi ${name}, your TekyPro free preview is ready. Browse courses at ${FE}/courses` });
  }

  async sendLeadFollowupD1(email, name, courseTitle = 'your course') {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      title: `Your course is waiting for you`,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Just checking in — <strong>${courseTitle}</strong> is ready and waiting for you on TekyPro.</p>
<p>Thousands of database professionals have used TekyPro to advance their careers, pass certification exams, and land better-paying roles.</p>
<div class="hi"><strong>Your free preview includes:</strong><ul>
<li>Full course outline so you know exactly what you'll learn</li>
<li>Lesson 1 of every module — watch before you commit</li>
<li>Community forum access — meet your future classmates</li>
</ul></div>
<p>Ready to take the next step?</p>`,
      ctaText: 'Continue to Course',
      ctaUrl: `${FE}/courses`,
    });
    return this.sendEmail({ to: email, subject: `${name}, your TekyPro course is waiting for you`, html, text: `Hi ${name}, your course on TekyPro is ready. Continue at ${FE}/courses` });
  }

  async sendLeadFollowupD3(email, name) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      title: 'What TekyPro students are saying',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>We thought you'd like to hear from some of our graduates:</p>
<div class="hi"><p><em>"I passed my Oracle DBA certification after completing the TekyPro course. The hands-on practice labs made all the difference."</em><br>— <strong>Adesola K., Lagos</strong></p></div>
<div class="hi"><p><em>"I was able to negotiate a 40% salary increase after completing my PostgreSQL certification through TekyPro. Worth every penny."</em><br>— <strong>James M., Nairobi</strong></p></div>
<div class="hi"><p><em>"The installment plan made it affordable for me. Full access from day one while I paid over time."</em><br>— <strong>Priya T., London</strong></p></div>
<p>Your free preview is still active. Come see what the full course looks like.</p>`,
      ctaText: 'See Course Details',
      ctaUrl: `${FE}/courses`,
    });
    return this.sendEmail({ to: email, subject: `What TekyPro students say (real results)`, html, text: `Hi ${name}, see what TekyPro students are saying at ${FE}/courses` });
  }

  async sendLeadFollowupD7(email, name) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#f59e0b,#d97706)',
      title: 'Your free preview — final week',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your TekyPro free preview has been active for a week now. We want to make sure you're making the most of it before time runs out.</p>
<div class="wa"><strong>You still have access to:</strong><ul>
<li>Full course outlines for all courses</li>
<li>Lesson 1 free in every course</li>
<li>Community forums and Q&A</li>
</ul></div>
<p>To unlock <strong>all lessons, practice tests, live sessions, and your certificate</strong>, you'll need to enroll.</p>
<p>Remember — you can start with just <strong>60% upfront</strong> and pay the rest in 21 days. No hidden fees, no surprises.</p>`,
      ctaText: 'Enroll Now',
      ctaUrl: `${FE}/courses`,
    });
    return this.sendEmail({ to: email, subject: `${name}, your free preview expires soon`, html, text: `Hi ${name}, your free preview is expiring. Enroll now at ${FE}/courses` });
  }

  async sendLeadFollowupD14(email, name, couponCode = null) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const discountBlock = couponCode
      ? `<div class="hi"><p><strong>Special offer just for you:</strong> Use code <strong style="font-size:18px;color:#eb1c22">${couponCode}</strong> at checkout for a discount on your enrollment.</p></div>`
      : '';
    const html = this._baseTemplate({
      title: 'A personal note from TekyPro',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>This is our last email in this series — we don't want to crowd your inbox.</p>
<p>We noticed you haven't enrolled yet, and we want to understand why. Is it the price? The timing? Or maybe you'd like to see more before committing?</p>
${discountBlock}
<p>Whatever the reason, your free preview account will stay open. You can come back anytime.</p>
<p>But if you're ready — even just a little curious — click below and take a look at what's inside. No commitment required.</p>
<p>We'd love to have you in the course.</p>
<p>— The TekyPro Team</p>`,
      ctaText: 'Take One More Look',
      ctaUrl: `${FE}/courses`,
    });
    return this.sendEmail({ to: email, subject: `${name}, this is our last message (personal note)`, html, text: `Hi ${name}, last chance to enroll. Visit ${FE}/courses` });
  }

  // ─── Payment Emails (Sequence B — Paid Users) ───────────────────────────────

  async sendPaymentReceipt(email, name, { courseTitle, amountPaid, paymentPlan, remainingAmount, invoiceDate, paymentId }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const installmentNote = paymentPlan === 'installment' && remainingAmount
      ? `<div class="wa"><p><strong>Installment Plan:</strong> Your remaining balance of <strong>$${parseFloat(remainingAmount).toFixed(2)}</strong> is due in 21 days. We'll send a reminder before it's due.</p></div>`
      : '';
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#0e2b5c,#2e3192)',
      title: 'Payment Confirmed — Receipt',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your payment has been received! Here is your receipt:</p>
<div class="hi">
<p><strong>Course:</strong> ${courseTitle}</p>
<p><strong>Amount Paid:</strong> $${parseFloat(amountPaid).toFixed(2)} USD</p>
<p><strong>Payment Plan:</strong> ${paymentPlan === 'installment' ? '60/40 Installment' : 'Full Payment'}</p>
<p><strong>Date:</strong> ${invoiceDate || new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
<p><strong>Reference:</strong> #${paymentId || 'TKP-' + Date.now()}</p>
</div>
${installmentNote}
<p>You now have full access to your course. Start learning right now!</p>`,
      ctaText: 'Go to My Courses',
      ctaUrl: `${FE}/my-courses`,
    });
    return this.sendEmail({ to: email, subject: `TekyPro Payment Receipt — ${courseTitle}`, html, text: `Hi ${name}, your payment for ${courseTitle} ($${amountPaid}) has been received.` });
  }

  async sendPaymentCongrats(email, name, { courseTitle, courseId }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#059669,#10b981)',
      title: `You're officially in! 🎉`,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Congratulations! You are now enrolled in <strong>${courseTitle}</strong> on TekyPro.</p>
<p>Here's how to get started:</p>
<div class="hi"><ol style="padding-left:20px;line-height:2">
<li><strong>Log in</strong> to your TekyPro account</li>
<li>Go to <strong>My Courses</strong></li>
<li>Click on <strong>${courseTitle}</strong> to open it</li>
<li>Start with <strong>Module 1, Lesson 1</strong> and work your way through</li>
</ol></div>
<p>A few tips from students who've been in your shoes:</p>
<ul>
<li>Set aside a regular study time each day — even 30 minutes adds up</li>
<li>Join the course forum and introduce yourself</li>
<li>Don't skip the practice tests — they're great exam prep</li>
</ul>
<p>We're rooting for you. Let's go!</p>`,
      ctaText: 'Start Learning Now',
      ctaUrl: courseId ? `${FE}/courses/${courseId}/learn` : `${FE}/my-courses`,
    });
    return this.sendEmail({ to: email, subject: `You're in! Welcome to ${courseTitle}`, html, text: `Congratulations ${name}! You're enrolled in ${courseTitle}. Start at ${FE}/my-courses` });
  }

  async sendOnboardingD1(email, name, { courseTitle, courseId }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      title: 'Your first 3 steps on TekyPro',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Day 1! Here are the three most important things to do right now to set yourself up for success in <strong>${courseTitle}</strong>:</p>
<div class="hi"><p><strong>Step 1 — Watch Lesson 1</strong><br>Don't overthink it. Just click play and start. Momentum beats perfection every time.</p></div>
<div class="hi"><p><strong>Step 2 — Join the Course Forum</strong><br>Introduce yourself in the forum. Say where you're from and what you're hoping to achieve. This small step keeps you accountable.</p></div>
<div class="hi"><p><strong>Step 3 — Block 45 Minutes Daily</strong><br>Put it in your calendar. Students who study daily (even briefly) complete courses 4x faster than those who binge-study on weekends.</p></div>
<p>You've got this. We'll check in with you in a couple of days.</p>`,
      ctaText: 'Start Lesson 1',
      ctaUrl: courseId ? `${FE}/courses/${courseId}/learn` : `${FE}/my-courses`,
    });
    return this.sendEmail({ to: email, subject: `Day 1: Your first 3 steps in ${courseTitle}`, html, text: `Hi ${name}, here are your first 3 steps in ${courseTitle}. Start at ${FE}/my-courses` });
  }

  async sendOnboardingD3(email, name, { courseTitle }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      title: 'Did you know TekyPro has these features?',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>You've been with us for 3 days. How are things going in <strong>${courseTitle}</strong>?</p>
<p>Here are some TekyPro features many students discover <em>too late</em> — don't let that be you:</p>
<div class="hi"><p><strong>📝 Practice Tests</strong><br>After each module, test your knowledge with AI-generated practice questions. It's the fastest way to identify gaps before the real exam.</p></div>
<div class="hi"><p><strong>🎥 Live Sessions</strong><br>Your instructor hosts live Q&A sessions. Check the schedule in your course page — these are gold for tricky topics.</p></div>
<div class="hi"><p><strong>📌 Lesson Bookmarks</strong><br>Bookmark any lesson and add notes. Great for revision before exams.</p></div>
<p>Keep going — you're doing great!</p>`,
      ctaText: 'Continue Learning',
      ctaUrl: `${FE}/my-courses`,
    });
    return this.sendEmail({ to: email, subject: `Did you know TekyPro has these features? (${courseTitle})`, html, text: `Hi ${name}, discover TekyPro's hidden features. Continue at ${FE}/my-courses` });
  }

  async sendOnboardingD7(email, name, { courseTitle }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      title: `How's it going, ${name}?`,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>You've been on TekyPro for a week. We just wanted to check in on your progress in <strong>${courseTitle}</strong>.</p>
<p>If everything's going well — amazing! Keep that momentum going.</p>
<p>If you've been struggling to find time or hit a confusing topic, that's completely normal. Here's what we suggest:</p>
<ul>
<li><strong>Stuck on a concept?</strong> Post a question in the course forum — your instructor and classmates respond quickly</li>
<li><strong>Short on time?</strong> Even 20 minutes a day keeps you progressing. Don't let perfect be the enemy of good</li>
<li><strong>Need motivation?</strong> Look at your progress bar. Every lesson completed is a step closer to that certificate</li>
</ul>
<p>Remember why you started. We're here to help you get there.</p>
<p>— The TekyPro Team</p>`,
      ctaText: 'Check My Progress',
      ctaUrl: `${FE}/my-courses`,
    });
    return this.sendEmail({ to: email, subject: `Week 1 check-in: How's ${courseTitle} going?`, html, text: `Hi ${name}, how's your first week going? Continue at ${FE}/my-courses` });
  }

  // ─── Installment Reminder Sequence (Sequence C) ───────────────────────────

  async sendInstallmentReminderD21(email, name, { remainingAmount, dueDate, payUrl }) {
    const html = this._baseTemplate({
      title: 'Friendly reminder: your balance is due',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Just a friendly heads-up — your TekyPro installment balance of <strong>$${parseFloat(remainingAmount).toFixed(2)}</strong> is now due.</p>
<div class="hi"><p><strong>Amount due:</strong> $${parseFloat(remainingAmount).toFixed(2)}<br><strong>Due date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { dateStyle: 'long' })}</p></div>
<p>Completing this payment takes less than 2 minutes and keeps your full course access uninterrupted.</p>
<p>No rush — but sooner is better! 😊</p>`,
      ctaText: 'Complete Payment',
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Friendly reminder: your TekyPro balance of $${parseFloat(remainingAmount).toFixed(2)} is due`, html, text: `Hi ${name}, your TekyPro balance of $${remainingAmount} is due. Pay at ${payUrl}` });
  }

  async sendInstallmentReminderD24(email, name, { remainingAmount, dueDate, payUrl }) {
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#f97316,#ea580c)',
      title: 'Your balance is 3 days overdue',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your TekyPro installment balance of <strong>$${parseFloat(remainingAmount).toFixed(2)}</strong> was due on ${new Date(dueDate).toLocaleDateString('en-US', { dateStyle: 'long' })} and is now 3 days overdue.</p>
<div class="wa"><p>Your course access is still fully active for now. To avoid any interruptions, please complete your payment as soon as possible.</p></div>
<p>It only takes a moment to sort this out:</p>`,
      ctaText: 'Pay $' + parseFloat(remainingAmount).toFixed(2) + ' Now',
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Your TekyPro balance is 3 days overdue — still time to sort it out`, html, text: `Hi ${name}, your TekyPro balance of $${remainingAmount} is 3 days overdue. Pay at ${payUrl}` });
  }

  async sendInstallmentReminderD28(email, name, { remainingAmount, payUrl, lockDate }) {
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#dc2626,#ef4444)',
      title: 'Action Required: 4 days until access is restricted',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>We need to let you know that your TekyPro account will be <strong>partially restricted on ${new Date(lockDate).toLocaleDateString('en-US', { dateStyle: 'long' })}</strong> if your balance remains unpaid.</p>
<div class="da"><p><strong>⚠️ Balance overdue:</strong> $${parseFloat(remainingAmount).toFixed(2)}<br><strong>Restriction date:</strong> ${new Date(lockDate).toLocaleDateString('en-US', { dateStyle: 'long' })}</p></div>
<p>After restriction, you will lose access to:</p>
<ul>
<li>New lessons and modules</li>
<li>Practice tests and assignments</li>
<li>Forum posting</li>
<li>Course certificates</li>
</ul>
<p>Your progress is always saved — one payment click restores everything instantly.</p>`,
      ctaText: 'Pay Now to Keep Full Access',
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `URGENT: Your TekyPro account will be restricted in 4 days`, html, text: `URGENT: Your TekyPro balance of $${remainingAmount} is overdue. Account restricted on ${lockDate}. Pay at ${payUrl}` });
  }

  async sendInstallmentReminderD32(email, name, { remainingAmount, payUrl }) {
    const html = this._baseTemplate({
      headerColor: '#dc2626',
      title: 'Your account has been partially restricted',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Because your installment balance of <strong>$${parseFloat(remainingAmount).toFixed(2)}</strong> remains unpaid, your TekyPro account has been <strong>partially restricted</strong>.</p>
<div class="da"><p><strong>What you've lost access to:</strong><ul>
<li>Starting new lessons or modules</li>
<li>Practice tests and assignments</li>
<li>Forum posting</li>
<li>Certificate downloads</li>
</ul></p></div>
<div class="hi"><p><strong>What you still have:</strong> You can continue any lessons you already started, and all your progress has been saved.</p></div>
<p>Restore full access instantly with one payment:</p>`,
      ctaText: 'Restore Full Access — $' + parseFloat(remainingAmount).toFixed(2),
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Your TekyPro account has been partially restricted`, html, text: `Hi ${name}, your TekyPro account is partially restricted. Pay $${remainingAmount} to restore full access at ${payUrl}` });
  }

  async sendInstallmentReminderD35(email, name, { remainingAmount, payUrl }) {
    const html = this._baseTemplate({
      headerColor: '#7f1d1d',
      title: 'Your account is on hold',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your TekyPro account is now on hold due to an outstanding balance of <strong>$${parseFloat(remainingAmount).toFixed(2)}</strong>.</p>
<p>We know life gets busy. That's why we've kept your account active for as long as possible — all your progress, notes, and bookmarks are completely safe.</p>
<div class="da"><p>Your account is currently showing a fullscreen payment overlay. You will not be able to access course content until payment is completed.</p></div>
<p>One click is all it takes to restore everything instantly:</p>`,
      ctaText: 'Restore My Account — $' + parseFloat(remainingAmount).toFixed(2),
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Your TekyPro account is on hold — here's how to restore it`, html, text: `Hi ${name}, your TekyPro account is on hold. Pay $${remainingAmount} to restore at ${payUrl}` });
  }

  async sendInstallmentSuspendedD42(email, name, { remainingAmount, payUrl }) {
    const html = this._baseTemplate({
      headerColor: '#1c1c1c',
      title: 'Account Suspended',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your TekyPro account has been suspended due to an unpaid balance of <strong>$${parseFloat(remainingAmount).toFixed(2)}</strong>.</p>
<p>We're sorry it came to this. Your account data, progress, and certificates are all still here — waiting for you.</p>
<p>To reactivate your account and restore full access <em>immediately</em>, complete your payment below:</p>`,
      ctaText: 'Reactivate My Account — $' + parseFloat(remainingAmount).toFixed(2),
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Your TekyPro account has been suspended`, html, text: `Hi ${name}, your TekyPro account has been suspended. Pay $${remainingAmount} to reactivate at ${payUrl}` });
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

  /**
   * Send chat notification email (mention or new DM when user is offline)
   * @param {String} email - Recipient email
   * @param {String} name - Recipient name
   * @param {String} type - 'mention' | 'dm'
   * @param {String} senderName - Who triggered the notification
   * @param {String} preview - Message preview (first 100 chars)
   */
  async sendChatNotificationEmail(email, name, type, senderName, preview) {
    const subject = type === 'mention'
      ? `${senderName} mentioned you in a chat`
      : `New message from ${senderName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .preview { background: #fff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; color: #555; font-style: italic; }
            .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 ${type === 'mention' ? 'You were mentioned' : 'New Message'}</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>${type === 'mention'
                ? `<strong>${senderName}</strong> mentioned you in a chat on TekyPro LMS.`
                : `You have a new direct message from <strong>${senderName}</strong>.`
              }</p>
              ${preview ? `<div class="preview">"${preview}"</div>` : ''}
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/messages" class="button">
                Open Messages
              </a>
            </div>
            <div class="footer">
              <p>You received this because you were not online at the time. Log in to reply.</p>
              <p>&copy; ${new Date().getFullYear()} TekyPro LMS</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({ to: email, subject, html, text: `${senderName}: ${preview}` });
  }

  async sendDiscordInviteEmail(email, name, { courseTitle, inviteLink }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#5865F2,#4752C4)',
      title: 'Your Discord Channel is Ready!',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Welcome to the TekyPro community on Discord! Your private channel for <strong>${courseTitle}</strong> is now ready.</p>
<div class="hi">
<p>Discord is where your class communicates — ask questions, share progress, get help from classmates, and stay connected with your instructor.</p>
</div>
<p>Click the button below to join your course channel. This link is for your class only, so keep it private.</p>
<p style="font-size:13px;color:#888">Or copy this link: <span style="word-break:break-all;color:#5865F2">${inviteLink}</span></p>
<p>You can also access this link anytime from your course page in the TekyPro app.</p>`,
      ctaText: 'Join Discord Channel',
      ctaUrl: inviteLink,
    });
    return this.sendEmail({
      to: email,
      subject: `Your Discord channel for ${courseTitle} is ready — TekyPro`,
      html,
      text: `Hi ${name}, your Discord channel for ${courseTitle} is ready. Join here: ${inviteLink}`,
    });
  }

  async sendRefundConfirmation(email, name, { courseTitle, refundAmount }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#dc2626,#b91c1c)',
      title: 'Your Refund Has Been Processed',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your refund for <strong>${courseTitle}</strong> has been processed.</p>
<div class="hi">
<p><strong>Refund Amount:</strong> $${parseFloat(refundAmount).toFixed(2)} USD</p>
<p><strong>Status:</strong> Refunded</p>
</div>
<p>Please allow 5–10 business days for the amount to appear on your original payment method. Your access to the course has been removed.</p>
<p>If you have any questions, reply to this email or contact our support team.</p>`,
      ctaText: 'Browse Other Courses',
      ctaUrl: `${FE}/courses`,
    });
    return this.sendEmail({
      to: email,
      subject: `Your TekyPro refund for ${courseTitle} has been processed`,
      html,
      text: `Hi ${name}, your refund of $${refundAmount} for ${courseTitle} has been processed. Allow 5-10 business days.`,
    });
  }
}

// Export singleton instance
module.exports = new EmailService();
