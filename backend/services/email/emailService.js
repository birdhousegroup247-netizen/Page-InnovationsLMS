/**
 * Email Service
 *
 * Supports two transports:
 *   1. Resend HTTP API (preferred) — set RESEND_API_KEY in env. Works
 *      reliably from PaaS hosts where outbound SMTP is often blocked
 *      (Railway, Render, Fly, etc.). This is what fixes the Namecheap
 *      SMTP timeouts seen in production logs.
 *   2. SMTP via Nodemailer (fallback) — uses EMAIL_HOST/PORT/USER/PASSWORD
 *      when RESEND_API_KEY is unset. Kept so existing dev/test setups
 *      keep working.
 */

const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../../utils/logger');

// Currency formatting used in every payment / refund email. Same
// symbol-map fallback as the frontend `utils/currency.js`, so a payment
// stored as NGN renders `₦` instead of the historic hardcoded `$`.
const CURRENCY_SYMBOLS = {
  USD: '$', NGN: '₦', EUR: '€', GBP: '£', KES: 'KSh', GHS: '₵', ZAR: 'R',
};
function fmtMoney(value, currency = 'USD') {
  const n = parseFloat(value || 0);
  const code = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch (_) {
    return `${CURRENCY_SYMBOLS[code] || '$'}${n.toFixed(2)}`;
  }
}

class EmailService {
  constructor() {
    this.resendKey = process.env.RESEND_API_KEY || '';
    this.from = process.env.EMAIL_FROM || `TekyPro LMS <${process.env.EMAIL_USER || 'noreply@tekypro.com'}>`;
    // Per-purpose senders. Any address @ the Resend-verified domain works
    // without extra setup; unset vars fall back to the default sender.
    //   EMAIL_FROM_REGISTRATION → signup verification + welcome
    //   EMAIL_FROM_PORTAL       → student-portal notifications
    this.fromByKind = {
      registration: process.env.EMAIL_FROM_REGISTRATION || null,
      portal: process.env.EMAIL_FROM_PORTAL || null,
    };
    // Secret used to sign unsubscribe tokens. Kept separate from the
    // JWT secret so rotating one doesn't break the other. Falls back
    // to JWT_SECRET so setups without a dedicated secret still work.
    this.unsubSecret = process.env.EMAIL_UNSUB_SECRET || process.env.JWT_SECRET || 'change-me';

    if (this.resendKey) {
      logger.info('[Email] Using Resend HTTP API transport');
      this.transport = 'resend';
    } else if (process.env.EMAIL_HOST) {
      logger.info(`[Email] Using SMTP transport (${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT})`);
      this.transport = 'smtp';
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
        // Don't hang the whole drip scheduler if the SMTP host is unreachable.
        connectionTimeout: 10000,
        socketTimeout: 15000,
        greetingTimeout: 10000,
      });
    } else {
      logger.warn('[Email] No transport configured (set RESEND_API_KEY or EMAIL_HOST). Emails will fail.');
      this.transport = 'none';
    }
  }

  /**
   * Sign an unsubscribe token for a given recipient.
   * @param {'user' | 'lead'} kind
   * @param {number|string} id
   * @returns {string} URL-safe token
   */
  makeUnsubToken(kind, id) {
    return crypto
      .createHmac('sha256', this.unsubSecret)
      .update(`${kind}:${id}`)
      .digest('hex');
  }
  verifyUnsubToken(kind, id, token) {
    const expected = this.makeUnsubToken(kind, id);
    // constant-time compare to avoid timing side-channels
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(String(token), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Build the fully-signed unsubscribe URL for a given recipient. The
   * base template's footer link is rewritten to this if the caller
   * passes recipientKind + recipientId in options.
   */
  _unsubUrl(kind, id) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const token = this.makeUnsubToken(kind, id);
    return `${FE}/unsubscribe?type=${kind}&id=${encodeURIComponent(id)}&token=${token}`;
  }

  /**
   * Send email via the active transport. Throws so the caller can decide
   * whether to retry / log / swallow.
   *
   * Options:
   *   to, subject, html, text          — the email
   *   bypassOptOut: true               — skip opt-out check (transactional only)
   *   recipientKind, recipientId       — used to build a signed unsubscribe URL
   */
  async sendEmail(options) {
    // Skip opt-out lookup for transactional mail (verification, password
    // reset, receipt, refund, instructor approval/rejection/revocation,
    // installment reminders). Marketing / drip mail must always check.
    if (!options.bypassOptOut) {
      const optedOut = await this._isOptedOut(options.to, options.recipientKind, options.recipientId);
      if (optedOut) {
        logger.info(`[Email] Skipped ${options.subject?.slice(0, 40)} — recipient ${options.to} opted out`);
        return { success: false, skipped: 'opted_out' };
      }
    }

    if (this.transport === 'resend') {
      return this._sendViaResend(options);
    }
    if (this.transport === 'smtp') {
      return this._sendViaSmtp(options);
    }
    throw new Error('Email transport not configured (set RESEND_API_KEY or EMAIL_HOST)');
  }

  /**
   * Look up whether a given recipient has opted out. Checks both User
   * (email_opt_out) and Lead (email_opt_out) tables by email.
   * Cached briefly at the class instance level to keep the drip cron
   * from hammering the DB.
   */
  async _isOptedOut(email, kind, id) {
    if (!email) return false;
    try {
      const { User, Lead } = require('../../models');
      // Prefer a direct ID lookup when caller told us who this is.
      if (kind === 'user' && id) {
        const u = await User.findByPk(id, { attributes: ['email_opt_out'] });
        return !!u?.email_opt_out;
      }
      if (kind === 'lead' && id) {
        const l = await Lead.findByPk(id, { attributes: ['email_opt_out'] });
        return !!l?.email_opt_out;
      }
      // Fallback: check by email across both tables.
      const [u, l] = await Promise.all([
        User.findOne({ where: { email }, attributes: ['email_opt_out'] }),
        Lead.findOne({ where: { email }, attributes: ['email_opt_out'] }),
      ]);
      return !!(u?.email_opt_out || l?.email_opt_out);
    } catch (_) {
      // If the column doesn't exist yet (mid-migration) or lookup
      // fails, err on the side of sending — legal fallback is
      // presence-of-flag not absence.
      return false;
    }
  }

  async _sendViaResend(options) {
    try {
      const res = await axios.post(
        'https://api.resend.com/emails',
        {
          from: (options.fromKind && this.fromByKind[options.fromKind]) || this.from,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        },
        {
          headers: {
            Authorization: `Bearer ${this.resendKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      const id = res.data?.id;
      logger.info(`Email sent (Resend): ${id} to ${options.to}`);
      return { success: true, messageId: id };
    } catch (error) {
      const detail = error.response?.data?.message || error.response?.data?.error || error.message;
      logger.error(`Email send failed (Resend) to ${options.to}: ${detail}`);
      throw new Error(`Failed to send email: ${detail}`);
    }
  }

  async _sendViaSmtp(options) {
    try {
      const mailOptions = {
        from: (options.fromKind && this.fromByKind[options.fromKind]) || this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent (SMTP): ${info.messageId} to ${options.to}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Email send failed (SMTP) to ${options.to}: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
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
      fromKind: 'registration',
      to: email,
      subject: 'Welcome to TekyPro LMS!',
      html,
      text: `Welcome to TekyPro LMS, ${name}! Start your learning journey today.`,
      bypassOptOut: true,
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
      fromKind: 'registration',
      to: email,
      subject: 'Verify your TekyPro email address',
      html,
      text: `Hi ${name}, verify your TekyPro email by visiting ${verifyUrl} or by entering this code on the verification page: ${code}`,
      bypassOptOut: true,
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
      bypassOptOut: true,
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
      bypassOptOut: true,
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
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#059669,#10b981)',
      title: 'Congratulations — you finished!',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>You've officially completed <strong>${course.title}</strong>. That's a real milestone — dedication and hard work well earned.</p>
<div class="hi" style="text-align:center"><p style="font-size:52px;margin:0">🎓</p><p style="margin:6px 0 0"><strong>Your certificate is ready.</strong></p></div>
<p>Share your achievement on LinkedIn and inspire someone else to start. And keep the momentum going — the next course is only a click away.</p>`,
      ctaText: 'Download Certificate',
      ctaUrl: certificateUrl,
    });
    return this.sendEmail({
      to: email,
      subject: `🎓 Congratulations! You completed ${course.title}`,
      html,
      text: `Congratulations ${name}! You've completed ${course.title}. Download your certificate: ${certificateUrl}`,
      recipientKind: 'user',
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
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const testUrl = `${FE}/tests/${test.id}`;
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#f59e0b,#d97706)',
      title: 'New test assigned',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>You have a new test on TekyPro:</p>
<div class="hi">
<p><strong>${test.test_name}</strong></p>
${test.description ? `<p style="color:#555">${test.description}</p>` : ''}
${test.total_questions ? `<p><strong>Questions:</strong> ${test.total_questions}</p>` : ''}
${test.time_limit_minutes ? `<p><strong>Time limit:</strong> ${test.time_limit_minutes} minutes</p>` : ''}
${test.due_date ? `<p><strong>Due:</strong> ${new Date(test.due_date).toLocaleDateString('en-US', { dateStyle: 'long' })}</p>` : ''}
</div>
<p>Good luck!</p>`,
      ctaText: 'Take Test Now',
      ctaUrl: testUrl,
    });
    return this.sendEmail({
      to: email,
      subject: `New Test Assignment: ${test.test_name}`,
      html,
      text: `Hi ${name}, you have a new test assigned: ${test.test_name}. Take it now: ${testUrl}`,
      recipientKind: 'user',
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
      bypassOptOut: true,
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
      bypassOptOut: true,
    });
  }

  /**
   * Send instructor application approval email
   * @param {String} email - User email
   * @param {String} name - User name
   * @returns {Promise<Object>} Send result
   */
  async sendInstructorApprovalEmail(email, name) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const dashboardUrl = `${FE}/instructor-dashboard`;
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#059669,#10b981)',
      title: 'Application Approved 🎉',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Great news — your instructor application has been <strong>approved</strong>. Welcome to the TekyPro instructor community!</p>
<div class="hi"><strong>What you can do now:</strong><ul>
<li>Create and publish courses</li>
<li>Upload course content — videos, documents, quizzes</li>
<li>Manage enrolled students</li>
<li>Track student progress and performance</li>
<li>Communicate with your students</li>
<li>Earn revenue from course sales</li>
</ul></div>
<p>Ready to create your first course?</p>`,
      ctaText: 'Go to Instructor Dashboard',
      ctaUrl: dashboardUrl,
    });
    return this.sendEmail({
      to: email,
      subject: '🎉 Your Instructor Application Has Been Approved!',
      html,
      text: `Congratulations ${name}! Your instructor application has been approved. Get started at ${dashboardUrl}`,
      bypassOptOut: true,
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
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const supportUrl = `${FE}/support`;
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#dc2626,#b91c1c)',
      title: 'Application Update',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Thank you for your interest in becoming a TekyPro instructor.</p>
<p>After careful review, we're unable to approve your application at this time.</p>
${reason ? `<div class="wa"><strong>Feedback:</strong><p>${reason}</p></div>` : ''}
<p>We encourage you to:</p>
<ul>
<li>Review the feedback provided (if any)</li>
<li>Enhance your qualifications or teaching experience</li>
<li>Apply again in the future</li>
</ul>
<p>You can still enjoy all student features and continue learning on our platform.</p>`,
      ctaText: 'Contact Support',
      ctaUrl: supportUrl,
    });
    return this.sendEmail({
      to: email,
      subject: 'Instructor Application Update - TekyPro LMS',
      html,
      text: `Hi ${name}, your instructor application was not approved at this time. ${reason ? `Feedback: ${reason}` : ''}`,
      bypassOptOut: true,
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
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const supportUrl = `${FE}/support`;
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#dc2626,#b91c1c)',
      title: 'Important Account Update',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<div class="da"><strong>⚠️ Your instructor status has been revoked.</strong></div>
<p>Your instructor privileges have been removed from your TekyPro account.</p>
${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
<p>This means you will no longer be able to:</p>
<ul>
<li>Create or publish new courses</li>
<li>Access the instructor dashboard</li>
<li>Manage student enrollments</li>
</ul>
<p>Your existing courses may be archived or removed depending on the circumstances. You can still access the platform as a student and enroll in courses.</p>
<p>If you believe this action was taken in error, please contact our support team.</p>`,
      ctaText: 'Contact Support',
      ctaUrl: supportUrl,
    });
    return this.sendEmail({
      to: email,
      subject: 'Instructor Status Update - TekyPro LMS',
      html,
      text: `Hi ${name}, your instructor status has been revoked. ${reason ? `Reason: ${reason}` : ''} Contact support at ${supportUrl}`,
      bypassOptOut: true,
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
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const courseUrl = `${FE}/courses/${announcement.course_id}/announcements/${announcement.id || ''}`;
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#0e2b5c,#2e3192)',
      title: '📢 New course announcement',
      body: `<p>Hi <strong>${studentName}</strong>,</p>
<p>Your instructor posted a new announcement for <strong>${announcement.course_title}</strong>:</p>
<div class="hi">
<p style="margin:0 0 8px"><strong>${announcement.title}</strong></p>
<p style="margin:0">${announcement.content}</p>
${announcement.instructor_name ? `<p style="margin:8px 0 0;color:#555"><em>— ${announcement.instructor_name}</em></p>` : ''}
</div>`,
      ctaText: 'Open Announcement',
      ctaUrl: courseUrl,
    });
    return this.sendEmail({
      to: email,
      subject: `Course Announcement: ${announcement.course_title}`,
      html,
      text: `Hi ${studentName}, new announcement for ${announcement.course_title}: ${announcement.title} — ${announcement.content}`,
      recipientKind: 'user',
    });
  }

  // ─── Shared HTML shell ────────────────────────────────────────────────────
  //
  // Options:
  //   headerColor  — CSS background for the header block
  //   title        — h1 inside the header
  //   body         — HTML for the middle
  //   ctaText/Url  — big red button below the body
  //   unsubUrl     — signed unsubscribe link for the footer. If absent
  //                  we fall back to a generic /unsubscribe path (kept
  //                  for legacy compatibility during rollout).
  //   transactional — flags a transactional email; footer omits the
  //                   unsubscribe link entirely (receipts, refunds,
  //                   verification, password reset).
  _baseTemplate({ headerColor = 'linear-gradient(135deg,#0e2b5c,#2e3192)', title, body, ctaText, ctaUrl, unsubUrl, transactional = false }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const cta = ctaText && ctaUrl
      ? `<div style="text-align:center;margin:28px 0"><a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background:#eb1c22;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;font-family:Arial,sans-serif">${ctaText}</a></div>`
      : '';
    const unsubLine = transactional
      ? ''
      : `<p style="margin-top:10px;font-size:11px;color:#bbb">You received this because you registered on TekyPro. <a href="${unsubUrl || `${FE}/unsubscribe`}">Unsubscribe</a></p>`;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f6f9;color:#333}.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)}.hdr{background:${headerColor};padding:28px 40px;text-align:center}.hdr .logo{font-size:26px;font-weight:900;color:#fff;letter-spacing:1px;margin:0}.hdr h1{margin:8px 0 0;color:#fff;font-size:20px;font-weight:600}.bd{padding:32px 40px}.bd p{line-height:1.75;margin:0 0 16px}.bd ul{padding-left:20px;line-height:1.9}.hi{background:#f0f4ff;border-left:4px solid #0e2b5c;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0}.wa{background:#fff8e1;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0}.da{background:#fff0f0;border-left:4px solid #ef4444;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0}.ft{background:#f9fafb;padding:20px 40px;text-align:center;color:#888;font-size:12px;border-top:1px solid #eee}.ft a{color:#0e2b5c;text-decoration:none}</style>
</head><body><div style="padding:16px"><div class="wrap">
<div class="hdr"><p class="logo">TekyPro</p><h1>${title}</h1></div>
<div class="bd">${body}${cta}</div>
<div class="ft"><p>TekyPro — Professional Database Training</p><p><a href="https://www.tekypro.com">www.tekypro.com</a> · <a href="mailto:support@tekypro.com">support@tekypro.com</a></p>${unsubLine}</div>
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

  async sendPaymentReceipt(email, name, { courseTitle, amountPaid, paymentPlan, remainingAmount, invoiceDate, paymentId, currency = 'USD' }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const installmentNote = paymentPlan === 'installment' && remainingAmount
      ? `<div class="wa"><p><strong>Installment Plan:</strong> Your remaining balance of <strong>${fmtMoney(remainingAmount, currency)}</strong> is due in 21 days. We'll send a reminder before it's due.</p></div>`
      : '';
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#0e2b5c,#2e3192)',
      title: 'Payment Confirmed — Receipt',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your payment has been received! Here is your receipt:</p>
<div class="hi">
<p><strong>Course:</strong> ${courseTitle}</p>
<p><strong>Amount Paid:</strong> ${fmtMoney(amountPaid, currency)}</p>
<p><strong>Payment Plan:</strong> ${paymentPlan === 'installment' ? '60/40 Installment' : 'Full Payment'}</p>
<p><strong>Date:</strong> ${invoiceDate || new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
<p><strong>Reference:</strong> #${paymentId || 'TKP-' + Date.now()}</p>
</div>
${installmentNote}
<p>You now have full access to your course. Start learning right now!</p>`,
      ctaText: 'Go to My Courses',
      ctaUrl: `${FE}/my-courses`,
    });
    return this.sendEmail({
      to: email,
      subject: `TekyPro Payment Receipt — ${courseTitle}`,
      html,
      text: `Hi ${name}, your payment for ${courseTitle} (${fmtMoney(amountPaid, currency)}) has been received.`,
      bypassOptOut: true,
    });
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
    return this.sendEmail({ to: email, subject: `You're in! Welcome to ${courseTitle}`, html, text: `Congratulations ${name}! You're enrolled in ${courseTitle}. Start at ${FE}/my-courses`, bypassOptOut: true });
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

  async sendInstallmentReminderD21(email, name, { remainingAmount, dueDate, payUrl, currency = 'USD' }) {
    const amt = fmtMoney(remainingAmount, currency);
    const html = this._baseTemplate({
      title: 'Friendly reminder: your balance is due',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Just a friendly heads-up — your TekyPro installment balance of <strong>${amt}</strong> is now due.</p>
<div class="hi"><p><strong>Amount due:</strong> ${amt}<br><strong>Due date:</strong> ${new Date(dueDate).toLocaleDateString('en-US', { dateStyle: 'long' })}</p></div>
<p>Completing this payment takes less than 2 minutes and keeps your full course access uninterrupted.</p>
<p>No rush — but sooner is better! 😊</p>`,
      ctaText: 'Complete Payment',
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Friendly reminder: your TekyPro balance of ${amt} is due`, html, text: `Hi ${name}, your TekyPro balance of ${amt} is due. Pay at ${payUrl}`, bypassOptOut: true });
  }

  async sendInstallmentReminderD24(email, name, { remainingAmount, dueDate, payUrl, currency = 'USD' }) {
    const amt = fmtMoney(remainingAmount, currency);
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#f97316,#ea580c)',
      title: 'Your balance is 3 days overdue',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your TekyPro installment balance of <strong>${amt}</strong> was due on ${new Date(dueDate).toLocaleDateString('en-US', { dateStyle: 'long' })} and is now 3 days overdue.</p>
<div class="wa"><p>Your course access is still fully active for now. To avoid any interruptions, please complete your payment as soon as possible.</p></div>
<p>It only takes a moment to sort this out:</p>`,
      ctaText: `Pay ${amt} Now`,
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Your TekyPro balance is 3 days overdue — still time to sort it out`, html, text: `Hi ${name}, your TekyPro balance of ${amt} is 3 days overdue. Pay at ${payUrl}`, bypassOptOut: true });
  }

  async sendInstallmentReminderD28(email, name, { remainingAmount, payUrl, lockDate, currency = 'USD' }) {
    const amt = fmtMoney(remainingAmount, currency);
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#dc2626,#ef4444)',
      title: 'Action Required: 4 days until access is restricted',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>We need to let you know that your TekyPro account will be <strong>partially restricted on ${new Date(lockDate).toLocaleDateString('en-US', { dateStyle: 'long' })}</strong> if your balance remains unpaid.</p>
<div class="da"><p><strong>⚠️ Balance overdue:</strong> ${amt}<br><strong>Restriction date:</strong> ${new Date(lockDate).toLocaleDateString('en-US', { dateStyle: 'long' })}</p></div>
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
    return this.sendEmail({ to: email, subject: `URGENT: Your TekyPro account will be restricted in 4 days`, html, text: `URGENT: Your TekyPro balance of ${amt} is overdue. Account restricted on ${lockDate}. Pay at ${payUrl}`, bypassOptOut: true });
  }

  async sendInstallmentReminderD32(email, name, { remainingAmount, payUrl, currency = 'USD' }) {
    const amt = fmtMoney(remainingAmount, currency);
    const html = this._baseTemplate({
      headerColor: '#dc2626',
      title: 'Your account has been partially restricted',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Because your installment balance of <strong>${amt}</strong> remains unpaid, your TekyPro account has been <strong>partially restricted</strong>.</p>
<div class="da"><p><strong>What you've lost access to:</strong><ul>
<li>Starting new lessons or modules</li>
<li>Practice tests and assignments</li>
<li>Forum posting</li>
<li>Certificate downloads</li>
</ul></p></div>
<div class="hi"><p><strong>What you still have:</strong> You can continue any lessons you already started, and all your progress has been saved.</p></div>
<p>Restore full access instantly with one payment:</p>`,
      ctaText: `Restore Full Access — ${amt}`,
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Your TekyPro account has been partially restricted`, html, text: `Hi ${name}, your TekyPro account is partially restricted. Pay ${amt} to restore full access at ${payUrl}`, bypassOptOut: true });
  }

  async sendInstallmentReminderD35(email, name, { remainingAmount, payUrl, currency = 'USD' }) {
    const amt = fmtMoney(remainingAmount, currency);
    const html = this._baseTemplate({
      headerColor: '#7f1d1d',
      title: 'Your account is on hold',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your TekyPro account is now on hold due to an outstanding balance of <strong>${amt}</strong>.</p>
<p>We know life gets busy. That's why we've kept your account active for as long as possible — all your progress, notes, and bookmarks are completely safe.</p>
<div class="da"><p>Your account is currently showing a fullscreen payment overlay. You will not be able to access course content until payment is completed.</p></div>
<p>One click is all it takes to restore everything instantly:</p>`,
      ctaText: `Restore My Account — ${amt}`,
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Your TekyPro account is on hold — here's how to restore it`, html, text: `Hi ${name}, your TekyPro account is on hold. Pay ${amt} to restore at ${payUrl}`, bypassOptOut: true });
  }

  async sendInstallmentSuspendedD42(email, name, { remainingAmount, payUrl, currency = 'USD' }) {
    const amt = fmtMoney(remainingAmount, currency);
    const html = this._baseTemplate({
      headerColor: '#1c1c1c',
      title: 'Account Suspended',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your TekyPro account has been suspended due to an unpaid balance of <strong>${amt}</strong>.</p>
<p>We're sorry it came to this. Your account data, progress, and certificates are all still here — waiting for you.</p>
<p>To reactivate your account and restore full access <em>immediately</em>, complete your payment below:</p>`,
      ctaText: `Reactivate My Account — ${amt}`,
      ctaUrl: payUrl,
    });
    return this.sendEmail({ to: email, subject: `Your TekyPro account has been suspended`, html, text: `Hi ${name}, your TekyPro account has been suspended. Pay ${amt} to reactivate at ${payUrl}`, bypassOptOut: true });
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
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const subject = type === 'mention'
      ? `${senderName} mentioned you in a chat`
      : `New message from ${senderName}`;
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#0e2b5c,#2e3192)',
      title: type === 'mention' ? '💬 You were mentioned' : '💬 New message',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>${type === 'mention'
        ? `<strong>${senderName}</strong> mentioned you in a chat on TekyPro.`
        : `You have a new direct message from <strong>${senderName}</strong>.`
}</p>
${preview ? `<div class="hi"><p style="margin:0;color:#555;font-style:italic">"${preview}"</p></div>` : ''}
<p style="font-size:12px;color:#888">You received this because you were not online at the time.</p>`,
      ctaText: 'Open Messages',
      ctaUrl: `${FE}/messages`,
    });
    return this.sendEmail({ to: email, subject, html, text: `${senderName}: ${preview}`, recipientKind: 'user' });
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
      bypassOptOut: true,
    });
  }

  async sendRefundConfirmation(email, name, { courseTitle, refundAmount, currency = 'USD' }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const amt = fmtMoney(refundAmount, currency);
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#dc2626,#b91c1c)',
      title: 'Your Refund Has Been Processed',
      transactional: true,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Your refund for <strong>${courseTitle}</strong> has been processed.</p>
<div class="hi">
<p><strong>Refund Amount:</strong> ${amt}</p>
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
      text: `Hi ${name}, your refund of ${amt} for ${courseTitle} has been processed. Allow 5-10 business days.`,
      bypassOptOut: true,
    });
  }

  // ─── Birthday ───────────────────────────────────────────────────────────────
  async sendBirthdayEmail(email, name) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const firstName = (name?.split(' ')[0] || 'there').trim();
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#ec4899,#f59e0b)',
      title: `🎉 Happy Birthday, ${firstName}!`,
      body: `<p>Hi <strong>${firstName}</strong>,</p>
<p>Everyone at TekyPro is rooting for you today. 🎂</p>
<p>Thank you for letting us be a small part of your learning journey — the curiosity you bring to every lesson is exactly what makes growth happen.</p>
<p>Here's to another year of building, breaking, and getting better. We can't wait to see what you create next.</p>
<p style="font-size:18px">💙 — The TekyPro Team</p>`,
      ctaText: 'Open TekyPro',
      ctaUrl: `${FE}/dashboard`,
    });
    return this.sendEmail({
      to: email,
      subject: `Happy Birthday, ${firstName}! 🎂`,
      html,
      text: `Happy Birthday, ${firstName}! Everyone at TekyPro is wishing you a great one. — The TekyPro Team`,
      recipientKind: 'user',
    });
  }

  // ─── Live session pre-start (15 min out) ───────────────────────────────────
  async sendLiveSessionStartingEmail(email, name, { sessionTitle, courseTitle, scheduledAt, joinUrl }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const when = new Date(scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#059669,#10b981)',
      title: 'Your live session starts in 15 minutes',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Heads up — <strong>${sessionTitle}</strong>${courseTitle ? ` (${courseTitle})` : ''} starts at <strong>${when}</strong>, in about 15 minutes.</p>
<div class="hi"><p>Grab a drink, close a tab or two, and get comfortable. We'll see you there!</p></div>`,
      ctaText: joinUrl ? 'Join Live Session' : 'Open TekyPro',
      ctaUrl: joinUrl || `${FE}/dashboard`,
    });
    return this.sendEmail({
      to: email,
      subject: `Starting in 15 min: ${sessionTitle}`,
      html,
      text: `Hi ${name}, your live session ${sessionTitle} starts at ${when}. Join: ${joinUrl || FE}`,
      recipientKind: 'user',
    });
  }

  // ─── Assignment due-soon (24h out) ─────────────────────────────────────────
  async sendAssignmentDueSoonEmail(email, name, { assignmentTitle, courseTitle, dueDate }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const dueStr = new Date(dueDate).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#f59e0b,#d97706)',
      title: 'Assignment due tomorrow',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Just a reminder that your assignment <strong>${assignmentTitle}</strong>${courseTitle ? ` in <em>${courseTitle}</em>` : ''} is due <strong>${dueStr}</strong> — about 24 hours from now.</p>
<div class="wa"><p>If you've already submitted, thanks! You can ignore this. Otherwise, hop in and get it done.</p></div>`,
      ctaText: 'Open My Assignments',
      ctaUrl: `${FE}/my-assignments`,
    });
    return this.sendEmail({
      to: email,
      subject: `Reminder: ${assignmentTitle} is due tomorrow`,
      html,
      text: `Hi ${name}, your assignment ${assignmentTitle} is due ${dueStr}. Submit at ${FE}/my-assignments`,
      recipientKind: 'user',
    });
  }

  // ─── Cold-student re-engagement (30 days inactive) ─────────────────────────
  async sendReEngagementEmail(email, name, { courseTitle, courseId, daysInactive }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const firstName = (name?.split(' ')[0] || 'there').trim();
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#0e2b5c,#2e3192)',
      title: `Still learning, ${firstName}?`,
      body: `<p>Hi <strong>${firstName}</strong>,</p>
<p>It's been about ${daysInactive} days since we last saw you on TekyPro${courseTitle ? `, and <strong>${courseTitle}</strong> is right where you left it` : ''}.</p>
<p>We know life gets busy. Here's a small nudge:</p>
<div class="hi"><p><strong>Just 20 minutes today</strong> — one lesson, one practice question. That's how every certificate on TekyPro gets earned.</p></div>
<p>Your progress is exactly where you left it. Every lesson you've marked complete is still marked complete. Come back whenever you're ready.</p>
<p>We're rooting for you.</p>`,
      ctaText: 'Pick up where I left off',
      ctaUrl: courseId ? `${FE}/courses/${courseId}/learn` : `${FE}/my-courses`,
    });
    return this.sendEmail({
      to: email,
      subject: `${firstName}, your TekyPro course is still waiting`,
      html,
      text: `Hi ${firstName}, it's been ${daysInactive} days. Pick up where you left off: ${FE}/my-courses`,
      recipientKind: 'user',
    });
  }

  // ─── Instructor first-course-published ─────────────────────────────────────
  async sendInstructorFirstCoursePublishedEmail(email, name, { courseTitle, courseId }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#059669,#10b981)',
      title: '🎉 Your first course is live!',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Big moment — <strong>${courseTitle}</strong> is now published and visible to every student on TekyPro. Welcome to the instructor roster!</p>
<div class="hi"><strong>Next steps to grow your first cohort:</strong><ul>
<li>Share your course link on LinkedIn, X, and your professional networks</li>
<li>Post a welcome announcement inside the course so new students see it right away</li>
<li>Schedule your first live session to build community early</li>
<li>Check the Analytics tab regularly — enrollments and completion rate are the two metrics that matter most</li>
</ul></div>
<p>We'll be watching your dashboard and cheering when the first enrollment lands.</p>`,
      ctaText: 'View my course',
      ctaUrl: `${FE}/instructor/courses/${courseId}`,
    });
    return this.sendEmail({
      to: email,
      subject: `Your course "${courseTitle}" is live on TekyPro!`,
      html,
      text: `Hi ${name}, your first course "${courseTitle}" is now live. See it at ${FE}/instructor/courses/${courseId}`,
      recipientKind: 'user',
    });
  }

  // ─── Instructor monthly earnings summary ───────────────────────────────────
  async sendInstructorMonthlyEarnings(email, name, { monthLabel, grossRevenue, enrollments, refunds, netRevenue, topCourse, currency = 'USD' }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#0e2b5c,#059669)',
      title: `Your ${monthLabel} earnings`,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Here's your monthly TekyPro summary for <strong>${monthLabel}</strong>:</p>
<div class="hi">
<p><strong>Gross revenue:</strong> ${fmtMoney(grossRevenue, currency)}</p>
<p><strong>New enrollments:</strong> ${enrollments}</p>
${refunds > 0 ? `<p><strong>Refunds:</strong> ${fmtMoney(refunds, currency)}</p>` : ''}
<p><strong>Net revenue:</strong> ${fmtMoney(netRevenue, currency)}</p>
${topCourse ? `<p><strong>Top course:</strong> ${topCourse}</p>` : ''}
</div>
<p>Full breakdown and per-course numbers are in the instructor dashboard.</p>`,
      ctaText: 'Open Dashboard',
      ctaUrl: `${FE}/instructor/dashboard`,
    });
    return this.sendEmail({
      to: email,
      subject: `Your ${monthLabel} TekyPro earnings — ${fmtMoney(netRevenue, currency)}`,
      html,
      text: `Hi ${name}, ${monthLabel} on TekyPro: ${fmtMoney(grossRevenue, currency)} gross, ${enrollments} new enrollments, ${fmtMoney(netRevenue, currency)} net. Details at ${FE}/instructor/dashboard`,
      recipientKind: 'user',
    });
  }

  // ─── Instructor review milestone ───────────────────────────────────────────
  async sendInstructorReviewMilestone(email, name, { milestone, averageRating }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#f59e0b,#eb1c22)',
      title: `🏆 ${milestone} student reviews!`,
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>Big milestone: you just crossed <strong>${milestone} student reviews</strong> on TekyPro${averageRating ? ` at an average rating of <strong>${Number(averageRating).toFixed(2)} / 5.0</strong>` : ''}.</p>
<div class="hi"><p>That's ${milestone} students who took the time to tell you what worked. That kind of feedback is gold — read a few, look for the patterns, and use them to sharpen your next lesson.</p></div>
<p>Keep going. Every great instructor was once a first-course instructor.</p>`,
      ctaText: 'See my reviews',
      ctaUrl: `${FE}/instructor/dashboard`,
    });
    return this.sendEmail({
      to: email,
      subject: `${milestone} student reviews! 🎉`,
      html,
      text: `Hi ${name}, congrats — you just passed ${milestone} student reviews on TekyPro. See them: ${FE}/instructor/dashboard`,
      recipientKind: 'user',
    });
  }

  // ─── Certificate share nudge (3 days after completion) ─────────────────────
  async sendCertificateShareNudge(email, name, { courseTitle, courseId, certificateUrl, suggestedCourseTitle, suggestedCourseId }) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkedInText = encodeURIComponent(`Just completed ${courseTitle} on TekyPro! 🎓`);
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certificateUrl || `${FE}/certificates`)}&summary=${linkedInText}`;
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#0e2b5c,#2e3192)',
      title: 'Show off that certificate',
      body: `<p>Hi <strong>${name}</strong>,</p>
<p>You finished <strong>${courseTitle}</strong> a few days ago — well done again. Your certificate is proof of the work you put in, and it deserves an audience.</p>
<div class="hi"><p><strong>Two quick ways to make it count:</strong></p>
<ul>
<li><a href="${linkedInUrl}" style="color:#0e2b5c;text-decoration:underline">Share on LinkedIn</a> — one click, and everyone in your network sees the win</li>
<li>Email a copy to your manager or team lead — great performance-review evidence</li>
</ul></div>
${suggestedCourseTitle ? `<p>And when you're ready for what's next: <strong>${suggestedCourseTitle}</strong> is a natural follow-up to what you just finished. Take a look when you have a moment.</p>` : '<p>Ready for what\'s next? Browse the catalog for your next challenge.</p>'}`,
      ctaText: suggestedCourseTitle ? `Preview "${suggestedCourseTitle}"` : 'Browse Courses',
      ctaUrl: suggestedCourseId ? `${FE}/courses/${suggestedCourseId}` : `${FE}/courses`,
    });
    return this.sendEmail({
      to: email,
      subject: `Share your ${courseTitle} certificate 🎓`,
      html,
      text: `Hi ${name}, your ${courseTitle} certificate is ready to share. LinkedIn: ${linkedInUrl}`,
      recipientKind: 'user',
    });
  }

  // ─── Promotional / broadcast (admin-composed) ──────────────────────────────
  // Sent by the campaign worker for admin marketing broadcasts.
  // The body is arbitrary HTML the admin wrote; we wrap it in
  // `_baseTemplate` so the branding stays consistent.
  async sendPromotionalEmail(email, name, { subject, title, bodyHtml, ctaText, ctaUrl, recipientKind = 'user', recipientId }) {
    const html = this._baseTemplate({
      headerColor: 'linear-gradient(135deg,#0e2b5c,#eb1c22)',
      title: title || 'A note from TekyPro',
      body: bodyHtml,
      ctaText,
      ctaUrl,
      unsubUrl: recipientId ? this._unsubUrl(recipientKind, recipientId) : undefined,
    });
    return this.sendEmail({
      to: email,
      subject,
      html,
      text: `${title || ''}\n\n${(bodyHtml || '').replace(/<[^>]+>/g, '').slice(0, 400)}`,
      recipientKind,
      recipientId,
    });
  }
}

// Export singleton instance
module.exports = new EmailService();
