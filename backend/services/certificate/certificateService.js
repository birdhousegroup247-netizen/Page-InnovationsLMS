/**
 * Certificate Service
 * Generates PDF certificates for course completion
 */

const { generateCertificate: generateCertificatePDF } = require('../../utils/certificateGenerator');
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
      } = data;

      // Use the enhanced certificate generator with QR code
      const pdfBuffer = await generateCertificatePDF({
        studentName,
        courseName,
        completionDate,
        certificateId,
        instructorName: instructorName || 'Page Innovation Team',
      });

      logger.info(`Certificate generated successfully: ${certificateId}`);
      return pdfBuffer;
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
