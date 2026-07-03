/**
 * Export Service
 * Handles CSV and PDF exports for various data types
 */

const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const logger = require('../../utils/logger');

class ExportService {
  /**
   * Export data to CSV
   * @param {Array} data - Array of objects to export
   * @param {Array} fields - Fields to include in CSV
   * @param {String} filename - Filename for download
   */
  static async exportToCSV(data, fields = null, filename = 'export.csv') {
    try {
      const opts = fields ? { fields } : {};
      const parser = new Parser(opts);
      const csv = parser.parse(data);

      return {
        data: csv,
        filename,
        contentType: 'text/csv',
      };
    } catch (error) {
      logger.error(`CSV export error: ${error.message}`);
      throw new Error('Failed to export data to CSV');
    }
  }

  /**
   * Export enrollments to CSV
   */
  static async exportEnrollments(enrollments) {
    const fields = [
      { label: 'Enrollment ID', value: 'id' },
      { label: 'Student Name', value: 'student.full_name' },
      { label: 'Student Email', value: 'student.email' },
      { label: 'Course Title', value: 'course.title' },
      { label: 'Enrolled Date', value: 'enrolled_at' },
      { label: 'Status', value: 'status' },
      { label: 'Progress (%)', value: 'progress_percentage' },
      { label: 'Completion Status', value: 'completion_status' },
      { label: 'Completed Date', value: 'completed_at' },
    ];

    return this.exportToCSV(enrollments, fields, `enrollments_${Date.now()}.csv`);
  }

  /**
   * Export students to CSV
   */
  static async exportStudents(students) {
    const fields = [
      { label: 'ID', value: 'id' },
      { label: 'Full Name', value: 'full_name' },
      { label: 'Email', value: 'email' },
      { label: 'Role', value: 'role' },
      { label: 'Active', value: 'is_active' },
      { label: 'Joined Date', value: 'created_at' },
      { label: 'Last Login', value: 'last_login_at' },
    ];

    return this.exportToCSV(students, fields, `students_${Date.now()}.csv`);
  }

  /**
   * Export course analytics to CSV
   */
  static async exportCourseAnalytics(analytics) {
    const fields = [
      { label: 'Course ID', value: 'id' },
      { label: 'Course Title', value: 'title' },
      { label: 'Instructor', value: 'instructor.full_name' },
      { label: 'Status', value: 'status' },
      { label: 'Enrollments', value: 'enrollment_count' },
      { label: 'Completions', value: 'completion_count' },
      { label: 'Completion Rate (%)', value: 'completion_rate' },
      { label: 'Average Rating', value: 'average_rating' },
      { label: 'Total Reviews', value: 'total_reviews' },
      { label: 'Created Date', value: 'created_at' },
    ];

    return this.exportToCSV(analytics, fields, `course_analytics_${Date.now()}.csv`);
  }

  /**
   * Export test results to CSV
   */
  static async exportTestResults(results) {
    const fields = [
      { label: 'Test ID', value: 'id' },
      { label: 'Student Name', value: 'student.full_name' },
      { label: 'Test Title', value: 'test.title' },
      { label: 'Score (%)', value: 'score_percentage' },
      { label: 'Passed', value: 'is_passed' },
      { label: 'Time Taken (min)', value: 'time_taken_minutes' },
      { label: 'Submitted At', value: 'submitted_at' },
    ];

    return this.exportToCSV(results, fields, `test_results_${Date.now()}.csv`);
  }

  /**
   * Export reviews to CSV
   */
  static async exportReviews(reviews) {
    const fields = [
      { label: 'Review ID', value: 'id' },
      { label: 'Course', value: 'course.title' },
      { label: 'Student', value: 'student.full_name' },
      { label: 'Rating', value: 'rating' },
      { label: 'Review Text', value: 'review_text' },
      { label: 'Helpful Count', value: 'helpful_count' },
      { label: 'Approved', value: 'is_approved' },
      { label: 'Created At', value: 'created_at' },
    ];

    return this.exportToCSV(reviews, fields, `reviews_${Date.now()}.csv`);
  }

  /**
   * Export activity logs to CSV
   */
  static async exportActivityLogs(logs) {
    const fields = [
      { label: 'ID', value: 'id' },
      { label: 'User', value: 'user.full_name' },
      { label: 'Action', value: 'action' },
      { label: 'Entity Type', value: 'entity_type' },
      { label: 'Entity ID', value: 'entity_id' },
      { label: 'IP Address', value: 'ip_address' },
      { label: 'Created At', value: 'created_at' },
    ];

    return this.exportToCSV(logs, fields, `activity_logs_${Date.now()}.csv`);
  }

  /**
   * Generate PDF report for course analytics
   */
  static async generateCourseReportPDF(courseData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(chunks);
          resolve({
            data: pdfData,
            filename: `course_report_${Date.now()}.pdf`,
            contentType: 'application/pdf',
          });
        });

        // Header
        doc.fontSize(20).text('Course Analytics Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Course Info
        doc.fontSize(16).text('Course Information', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        doc.text(`Title: ${courseData.title}`);
        doc.text(`Instructor: ${courseData.instructor?.full_name || 'N/A'}`);
        doc.text(`Status: ${courseData.status}`);
        doc.text(`Difficulty: ${courseData.difficulty || 'N/A'}`);
        doc.moveDown(2);

        // Statistics
        doc.fontSize(16).text('Performance Statistics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        doc.text(`Total Enrollments: ${courseData.enrollment_count || 0}`);
        doc.text(`Completions: ${courseData.completion_count || 0}`);
        doc.text(`Completion Rate: ${courseData.completion_rate || 0}%`);
        doc.text(`Average Rating: ${courseData.average_rating || 0}/5.0`);
        doc.text(`Total Reviews: ${courseData.total_reviews || 0}`);
        doc.moveDown(2);

        // Footer
        doc.fontSize(10).text('Page Innovation - The Leading Remote DBA Service Provider', {
          align: 'center',
        });
        doc.text('https://www.pageinnovation.com', { align: 'center' });

        doc.end();
      } catch (error) {
        logger.error(`PDF generation error: ${error.message}`);
        reject(new Error('Failed to generate PDF report'));
      }
    });
  }

  /**
   * Generate enrollment report PDF
   */
  static async generateEnrollmentReportPDF(enrollmentData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfData = Buffer.concat(chunks);
          resolve({
            data: pdfData,
            filename: `enrollment_report_${Date.now()}.pdf`,
            contentType: 'application/pdf',
          });
        });

        // Header
        doc.fontSize(20).text('Enrollment Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);

        // Summary
        doc.fontSize(16).text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12);
        doc.text(`Total Enrollments: ${enrollmentData.total || 0}`);
        doc.text(`Active: ${enrollmentData.active || 0}`);
        doc.text(`Completed: ${enrollmentData.completed || 0}`);
        doc.text(`Dropped: ${enrollmentData.dropped || 0}`);
        doc.moveDown(2);

        // Recent Enrollments
        if (enrollmentData.recent && enrollmentData.recent.length > 0) {
          doc.fontSize(16).text('Recent Enrollments', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);

          enrollmentData.recent.forEach((enrollment, index) => {
            doc.text(`${index + 1}. ${enrollment.student?.full_name || 'N/A'} - ${enrollment.course?.title || 'N/A'}`);
            doc.text(`   Enrolled: ${new Date(enrollment.enrolled_at).toLocaleDateString()}`, { indent: 20 });
            doc.moveDown(0.3);
          });
        }

        doc.end();
      } catch (error) {
        logger.error(`PDF generation error: ${error.message}`);
        reject(new Error('Failed to generate enrollment report'));
      }
    });
  }
}

module.exports = ExportService;
