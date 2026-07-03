/**
 * Certificate Generator
 * Generates PDF certificates for course completion
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const generateCertificate = async (data) => {
  const {
    studentName,
    courseName,
    completionDate,
    certificateId,
    instructorName = 'Page Innovation Team',
  } = data;

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50,
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Background gradient
      doc.rect(0, 0, doc.page.width, doc.page.height)
         .fillAndStroke('#f0f9ff', '#3b82f6');

      // Decorative border
      doc.lineWidth(25)
         .strokeColor('#3b82f6')
         .rect(25, 25, doc.page.width - 50, doc.page.height - 50)
         .stroke();

      // Inner border
      doc.lineWidth(2)
         .strokeColor('#1e40af')
         .rect(40, 40, doc.page.width - 80, doc.page.height - 80)
         .stroke();

      // Title
      doc.fontSize(48)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('Certificate of Completion', 0, 100, {
           align: 'center',
           width: doc.page.width,
         });

      // Subtitle
      doc.fontSize(18)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text('This is to certify that', 0, 180, {
           align: 'center',
           width: doc.page.width,
         });

      // Student Name
      doc.fontSize(36)
         .font('Helvetica-Bold')
         .fillColor('#0e2b5c')
         .text(studentName, 0, 220, {
           align: 'center',
           width: doc.page.width,
         });

      // Course completion text
      doc.fontSize(18)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text('has successfully completed', 0, 280, {
           align: 'center',
           width: doc.page.width,
         });

      // Course Name
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text(courseName, 50, 320, {
           align: 'center',
           width: doc.page.width - 100,
         });

      // Date
      const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc.fontSize(16)
         .font('Helvetica')
         .fillColor('#6b7280')
         .text(`Completed on ${formattedDate}`, 0, 400, {
           align: 'center',
           width: doc.page.width,
         });

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(
        `${process.env.FRONTEND_URL || 'https://pageinnovation.com'}/verify/${certificateId}`
      );

      // QR Code for verification
      doc.image(qrCodeDataUrl, doc.page.width - 150, doc.page.height - 150, {
        width: 100,
        height: 100,
      });

      // Certificate ID
      doc.fontSize(10)
         .fillColor('#9ca3af')
         .text(`Certificate ID: ${certificateId}`, 50, doc.page.height - 80);

      // Instructor signature line
      doc.fontSize(14)
         .fillColor('#374151')
         .text('_____________________', doc.page.width / 2 - 100, doc.page.height - 120);

      doc.fontSize(12)
         .fillColor('#6b7280')
         .text(instructorName, doc.page.width / 2 - 100, doc.page.height - 90, {
           width: 200,
           align: 'center',
         });

      doc.fontSize(10)
         .fillColor('#9ca3af')
         .text('Course Instructor', doc.page.width / 2 - 100, doc.page.height - 70, {
           width: 200,
           align: 'center',
         });

      // Page Innovation branding
      doc.fontSize(10)
         .fillColor('#3b82f6')
         .text('Page Innovation LMS - www.pageinnovation.com', 0, doc.page.height - 40, {
           align: 'center',
           width: doc.page.width,
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateCertificate };
