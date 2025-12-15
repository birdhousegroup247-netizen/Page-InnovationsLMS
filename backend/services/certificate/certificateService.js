/**
 * Certificate Service
 * Generates PDF certificates for course completion
 */

const PDFDocument = require('pdfkit');
const logger = require('../../utils/logger');

class CertificateService {
  /**
   * Generate a course completion certificate
   * @param {Object} data - Certificate data
   * @returns {Promise<Buffer>} PDF buffer
   */
  static async generateCertificate(data) {
    try {
      const {
        studentName,
        courseName,
        completionDate,
        certificateId,
        instructorName,
        courseHours,
      } = data;

      return new Promise((resolve, reject) => {
        // Create a new PDF document
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margin: 50,
        });

        const chunks = [];

        // Collect PDF chunks
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Certificate dimensions (A4 landscape: 842 x 595 points)
        const pageWidth = 842;
        const pageHeight = 595;
        const centerX = pageWidth / 2;

        // Draw border
        doc
          .rect(30, 30, pageWidth - 60, pageHeight - 60)
          .lineWidth(3)
          .strokeColor('#1e40af')
          .stroke();

        doc
          .rect(35, 35, pageWidth - 70, pageHeight - 70)
          .lineWidth(1)
          .strokeColor('#3b82f6')
          .stroke();

        // Header - Certificate Title
        doc
          .fontSize(48)
          .font('Helvetica-Bold')
          .fillColor('#1e40af')
          .text('CERTIFICATE', 0, 80, {
            align: 'center',
            width: pageWidth,
          });

        doc
          .fontSize(20)
          .font('Helvetica')
          .fillColor('#64748b')
          .text('OF COMPLETION', 0, 140, {
            align: 'center',
            width: pageWidth,
          });

        // Decorative line
        doc
          .moveTo(centerX - 150, 180)
          .lineTo(centerX + 150, 180)
          .lineWidth(2)
          .strokeColor('#3b82f6')
          .stroke();

        // "This is to certify that"
        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor('#475569')
          .text('This is to certify that', 0, 210, {
            align: 'center',
            width: pageWidth,
          });

        // Student Name
        doc
          .fontSize(36)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(studentName, 0, 245, {
            align: 'center',
            width: pageWidth,
          });

        // "has successfully completed"
        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor('#475569')
          .text('has successfully completed', 0, 295, {
            align: 'center',
            width: pageWidth,
          });

        // Course Name
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#1e40af')
          .text(courseName, 0, 325, {
            align: 'center',
            width: pageWidth,
          });

        // Course Duration
        if (courseHours) {
          doc
            .fontSize(12)
            .font('Helvetica')
            .fillColor('#64748b')
            .text(`${courseHours} hours of training`, 0, 365, {
              align: 'center',
              width: pageWidth,
            });
        }

        // Completion Date
        const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor('#475569')
          .text(`Completed on ${formattedDate}`, 0, 400, {
            align: 'center',
            width: pageWidth,
          });

        // Footer section
        const footerY = 470;

        // Left side - Certificate ID
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#94a3b8')
          .text(`Certificate ID: ${certificateId}`, 80, footerY);

        // Right side - Instructor signature (if provided)
        if (instructorName) {
          const instructorX = pageWidth - 250;

          // Signature line
          doc
            .moveTo(instructorX, footerY - 10)
            .lineTo(instructorX + 150, footerY - 10)
            .lineWidth(1)
            .strokeColor('#cbd5e1')
            .stroke();

          doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text(instructorName, instructorX, footerY, {
              width: 150,
              align: 'center',
            });

          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor('#64748b')
            .text('Course Instructor', instructorX, footerY + 18, {
              width: 150,
              align: 'center',
            });
        }

        // TekyPro branding
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#3b82f6')
          .text('TekyPro', 0, footerY + 40, {
            align: 'center',
            width: pageWidth,
          });

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#94a3b8')
          .text('The Leading Remote DBA Service Provider', 0, footerY + 60, {
            align: 'center',
            width: pageWidth,
          });

        doc
          .fontSize(8)
          .fillColor('#cbd5e1')
          .text('www.tekypro.com', 0, footerY + 75, {
            align: 'center',
            width: pageWidth,
          });

        // Finalize the PDF
        doc.end();
      });
    } catch (error) {
      logger.error('Certificate generation error:', error);
      throw new Error('Failed to generate certificate');
    }
  }

  /**
   * Generate certificate ID
   * @param {Number} enrollmentId - Enrollment ID
   * @param {Number} userId - User ID
   * @returns {String} Certificate ID
   */
  static generateCertificateId(enrollmentId, userId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const userPart = userId.toString(36).toUpperCase().padStart(4, '0');
    const enrollPart = enrollmentId.toString(36).toUpperCase().padStart(4, '0');

    return `TPRO-${timestamp}-${userPart}${enrollPart}`;
  }
}

module.exports = CertificateService;
