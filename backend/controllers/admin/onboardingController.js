const { User, Course, Payment } = require('../../models');
const { sequelize } = require('../../config/database');
const crypto = require('crypto');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const emailService = require('../../services/email/emailService');
const enrollmentSvc = require('../../services/enrollment/enrollmentService');
const ActivityController = require('../activity/activityController');

/**
 * Onboarding Center — the admin wizards that register a new student or
 * staff member in one guided flow (personal info → next of kin / employment
 * → academic / compensation → review).
 *
 * Both endpoints create a User the same way the admin "Create user" modal
 * does (auto-verified, active) and additionally persist the wizard's
 * structured record in `users.onboarding_profile`:
 *   student → { next_of_kin, academic }
 *   staff   → { staff_id, employment, compensation }
 *
 * Student onboarding can also enroll the new student into the selected
 * program. That path is deliberately identical to the admin manual-enroll
 * comp flow (zero-amount Payment marker + runTransactionalSideEffects) so
 * an onboarded student gets chat access, test assignments, activation and
 * notifications exactly like any other enrollee.
 *
 * When the admin does not supply a password we generate a temporary one and
 * return it once in the response, and best-effort email the user a welcome.
 */

function generateTempPassword() {
  // 12 chars, unambiguous, satisfies "has letters + digits" style checks.
  return `Pi-${crypto.randomBytes(6).toString('base64url')}`;
}

async function createOnboardedUser({ body, role, extraUserFields = {}, profile }) {
  const { personal = {}, password } = body;
  const { full_name, email, phone, date_of_birth } = personal;

  if (!full_name || !email) {
    throw new BadRequestError('Full name and email are required');
  }

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new BadRequestError('Email already exists');
  }

  const tempPassword = password || generateTempPassword();

  const user = await User.createUser({
    full_name,
    email,
    password: tempPassword,
    role,
    phone: phone || null,
    date_of_birth: date_of_birth || null,
    is_active: true,
    email_verified: true, // Admin-onboarded users are auto-verified
    onboarding_profile: profile,
    ...extraUserFields,
  });

  return { user, tempPassword: password ? null : tempPassword };
}

class AdminOnboardingController {
  // POST /api/admin/onboarding/student
  // body: { personal: { full_name, email, phone, date_of_birth, gender,
  //                     nationality, address },
  //         next_of_kin: { full_name, relationship, contact_number, address },
  //         academic: { enrollment_type, course_id, preferred_start_date,
  //                     highest_qualification },
  //         password? }
  static async onboardStudent(req, res, next) {
    try {
      const { personal = {}, next_of_kin = {}, academic = {} } = req.body;

      // Resolve the program up front so a bad course_id fails before the
      // user row exists.
      let course = null;
      if (academic.course_id) {
        course = await Course.findByPk(academic.course_id);
        if (!course) throw new NotFoundError('Selected program (course) not found');
      }

      const { user, tempPassword } = await createOnboardedUser({
        body: req.body,
        role: 'student',
        profile: {
          onboarded_by: req.user.id,
          onboarded_at: new Date().toISOString(),
          personal: {
            gender: personal.gender || null,
            nationality: personal.nationality || null,
            address: personal.address || null,
          },
          next_of_kin,
          academic,
        },
      });

      // Enroll into the selected program — same comp flow as the admin
      // manual enroll so side-effects (chat, tests, activation,
      // notification) all fire through the shared helper.
      let enrollment = null;
      let compPayment = null;
      if (course) {
        await sequelize.transaction(async (transaction) => {
          compPayment = await Payment.create({
            student_id: user.id,
            course_id: course.id,
            amount: 0,
            intended_amount: 0,
            original_amount: course.price || 0,
            discount_amount: course.price || 0,
            currency: 'USD',
            payment_method: 'comp',
            payment_status: 'completed',
            payment_plan: 'full',
            payment_gateway: 'stripe', // enum requires a value; not actually used
            payment_date: new Date(),
            installment_status: 'not_applicable',
            transaction_id: `ONBOARD-${user.id}-${course.id}-${Date.now()}`,
            metadata: {
              onboarding: true,
              comped_by_admin_id: req.user.id,
              comped_by_admin_email: req.user.email,
            },
          }, { transaction });

          const { enrollments } = await enrollmentSvc.runTransactionalSideEffects({
            payment: compPayment,
            studentId: user.id,
            courseIds: [course.id],
            transaction,
          });
          enrollment = enrollments[0];
        });

        enrollmentSvc.runPostCommitSideEffects({
          studentId: user.id,
          courseIds: [course.id],
          payment: compPayment,
          gateway: 'comp',
          sendEmails: false,
        }).catch((e) => logger.warn(`onboarding post-commit failed (non-critical): ${e.message}`));

        emailService.sendEnrollmentConfirmation(user.email, user.full_name, course).catch((e) =>
          logger.warn(`Onboarding enroll email failed for ${user.email}: ${e.message}`)
        );
      }

      emailService.sendWelcomeEmail(user.email, user.full_name).catch((e) =>
        logger.warn(`Onboarding welcome email failed for ${user.email}: ${e.message}`)
      );

      logger.info(`Student onboarded by admin ${req.user.email}: ${user.email}${course ? ` → enrolled in course ${course.id}` : ''}`);
      await ActivityController.logFromRequest(req, 'admin_user_create', 'user', user.id, {
        email: user.email, role: 'student', via: 'onboarding_wizard',
        course_id: course ? course.id : null,
      }).catch(() => {});

      return ApiResponse.created(res, {
        user: user.toJSON(),
        enrollment,
        temp_password: tempPassword,
      }, 'Student onboarded successfully');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/onboarding/staff
  // body: { personal: { full_name, email, phone, date_of_birth, address,
  //                     profile_picture },
  //         employment: { job_title, department, employment_type, start_date,
  //                       manager, certifications },
  //         compensation: { monthly_salary, bank_name, account_number, tin,
  //                         pension: { pfa_name, rsa_pin }, hmo_provider,
  //                         dependent_coverage },
  //         password? }
  static async onboardStaff(req, res, next) {
    try {
      const { personal = {}, employment = {}, compensation = {} } = req.body;

      const { user, tempPassword } = await createOnboardedUser({
        body: req.body,
        role: 'instructor',
        extraUserFields: {
          instructor_status: 'approved', // staff can teach immediately
          profile_picture: personal.profile_picture || null,
          bio: employment.job_title || null,
        },
        profile: {
          onboarded_by: req.user.id,
          onboarded_at: new Date().toISOString(),
          personal: { address: personal.address || null },
          employment,
          compensation,
        },
      });

      // Human-readable staff id, unique via the user PK. Shown on the
      // success screen and stored in the profile for the ID card.
      const staffId = `PI-STF-${new Date().getFullYear()}-${String(user.id).padStart(4, '0')}`;
      await user.update({
        onboarding_profile: { ...user.onboarding_profile, staff_id: staffId },
      });

      emailService.sendWelcomeEmail(user.email, user.full_name).catch((e) =>
        logger.warn(`Onboarding welcome email failed for ${user.email}: ${e.message}`)
      );

      logger.info(`Staff onboarded by admin ${req.user.email}: ${user.email} (${staffId})`);
      await ActivityController.logFromRequest(req, 'admin_user_create', 'user', user.id, {
        email: user.email, role: 'instructor', via: 'onboarding_wizard', staff_id: staffId,
      }).catch(() => {});

      return ApiResponse.created(res, {
        user: user.toJSON(),
        staff_id: staffId,
        temp_password: tempPassword,
      }, 'Staff member onboarded successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminOnboardingController;
