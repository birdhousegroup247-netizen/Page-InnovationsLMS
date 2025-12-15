/**
 * Course Completed Email Template
 */

module.exports = (data) => {
  const { studentName, courseTitle, completionDate, certificateUrl } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Congratulations on Completing ${courseTitle}!</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .celebration {
      text-align: center;
      font-size: 48px;
      margin: 20px 0;
    }
    .achievement-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .cta-button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .cta-button:hover {
      background: #764ba2;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-radius: 0 0 10px 10px;
    }
    .stats {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
      text-align: center;
    }
    .stat-item {
      flex: 1;
    }
    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #667eea;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 Congratulations!</h1>
    <p>You've Completed Your Course</p>
  </div>

  <div class="content">
    <div class="celebration">🏆</div>

    <h2>Well Done, ${studentName}!</h2>

    <p>You've successfully completed <strong>${courseTitle}</strong>. This is a significant achievement and a testament to your dedication and hard work!</p>

    <div class="achievement-box">
      <strong>Course Completed:</strong> ${courseTitle}<br>
      <strong>Completion Date:</strong> ${completionDate}<br>
      <strong>Status:</strong> <span style="color: #28a745;">✓ Certified</span>
    </div>

    <h3>Your Certificate is Ready!</h3>
    <p>Your certificate of completion has been generated and is ready for download. Share it on LinkedIn or add it to your resume to showcase your new skills.</p>

    <div style="text-align: center;">
      <a href="${certificateUrl}" class="cta-button">Download Certificate</a>
    </div>

    <h3>What's Next?</h3>
    <ul>
      <li>📱 Share your achievement on social media</li>
      <li>📚 Explore related courses to continue learning</li>
      <li>💼 Update your LinkedIn profile with your new certificate</li>
      <li>⭐ Leave a review to help other students</li>
    </ul>

    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
      <strong>💡 Pro Tip:</strong> Continue your learning journey! Check out our advanced courses to build on what you've learned.
    </div>
  </div>

  <div class="footer">
    <p><strong>TekyPro - The Leading Remote DBA Service Provider</strong></p>
    <p>Keep learning, keep growing! 🚀</p>
    <p style="margin-top: 15px;">
      <a href="https://www.tekypro.com">Visit Website</a> |
      <a href="https://www.tekypro.com/courses">Browse Courses</a> |
      <a href="https://www.tekypro.com/support">Support</a>
    </p>
  </div>
</body>
</html>
  `;
};
