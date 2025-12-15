const { Certificate, Course, User, Enrollment } = require('../../models');
const CertificateService = require('../../services/certificate/certificateService');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const NotificationsController = require('../notifications/notificationsController');

class CertificateController {
  // Generate and download certificate
  static async downloadCertificate(req, res, next) {
    try {
      const { courseId } = req.params;
      const studentId = req.user.id;

      // Check if student completed the course
      const enrollment = await Enrollment.findOne({
        where: {
          student_id: studentId,
          course_id: courseId,
        },
        include: [
          {
            model: Course,
            as: 'course',
            include: [
              { model: User, as: 'instructor', attributes: ['full_name'] },
            ],
          },
        ],
      });

      if (!enrollment) {
        throw new NotFoundError('You are not enrolled in this course');
      }

      if (!enrollment.completed_at) {
        throw new BadRequestError('You have not completed this course yet');
      }

      const course = enrollment.course;
      const student = await User.findByPk(studentId);

      // Check if certificate already exists
      let certificate = await Certificate.findOne({
        where: {
          student_id: studentId,
          course_id: courseId,
        },
      });

      // Generate certificate if it doesn't exist
      if (!certificate) {
        const certificateId = CertificateService.generateCertificateId(
          enrollment.id,
          studentId
        );

        certificate = await Certificate.create({
          certificate_id: certificateId,
          student_id: studentId,
          course_id: courseId,
          student_name: student.full_name,
          course_title: course.title,
          issue_date: new Date(),
        });

        // Create notification for certificate issuance
        await NotificationsController.createNotification({
          user_id: studentId,
          type: 'certificate_issued',
          title: 'Certificate Issued',
          message: `Congratulations! Your certificate for "${course.title}" has been issued`,
          link: `/certificates/${certificate.certificate_id}`,
          priority: 'high',
        });

        logger.info(`Certificate generated: ${certificateId} for ${student.email}`);
      }

      // Generate PDF
      const pdfBuffer = await CertificateService.generateCertificate({
        studentName: student.full_name,
        courseName: course.title,
        completionDate: enrollment.completed_at,
        certificateId: certificate.certificate_id,
        instructorName: course.instructor?.full_name,
        courseHours: course.duration_hours,
      });

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="certificate_${certificate.certificate_id}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);

      logger.info(`Certificate downloaded: ${certificate.certificate_id}`);
    } catch (error) {
      next(error);
    }
  }

  // Get my certificates
  static async getMyCertificates(req, res, next) {
    try {
      const studentId = req.user.id;

      const certificates = await Certificate.findAll({
        where: { student_id: studentId },
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title', 'thumbnail'],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, { certificates });
    } catch (error) {
      next(error);
    }
  }

  // Check if certificate is available for a course
  static async checkCertificateAvailability(req, res, next) {
    try {
      const { courseId } = req.params;
      const studentId = req.user.id;

      const enrollment = await Enrollment.findOne({
        where: {
          student_id: studentId,
          course_id: courseId,
        },
      });

      if (!enrollment) {
        return ApiResponse.success(res, {
          available: false,
          reason: 'not_enrolled',
        });
      }

      if (!enrollment.completed_at) {
        return ApiResponse.success(res, {
          available: false,
          reason: 'not_completed',
          progress: parseFloat(enrollment.progress_percentage),
        });
      }

      const certificate = await Certificate.findOne({
        where: {
          student_id: studentId,
          course_id: courseId,
        },
      });

      return ApiResponse.success(res, {
        available: true,
        certificate: certificate
          ? {
              id: certificate.id,
              certificate_id: certificate.certificate_id,
              issue_date: certificate.issue_date,
            }
          : null,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get certificate by ID (for verification)
  static async getCertificateById(req, res, next) {
    try {
      const { certificateId } = req.params;

      const certificate = await Certificate.findOne({
        where: { certificate_id: certificateId },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['full_name', 'email'],
          },
          {
            model: Course,
            as: 'course',
            attributes: ['title', 'duration_hours'],
          },
        ],
      });

      if (!certificate) {
        throw new NotFoundError('Certificate not found');
      }

      return ApiResponse.success(res, { certificate });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CertificateController;
