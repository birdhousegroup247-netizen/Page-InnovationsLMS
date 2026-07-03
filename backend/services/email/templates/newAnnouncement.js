/**
 * New Course Announcement Email Template
 */

module.exports = (data) => {
  const { studentName, courseTitle, announcementTitle, announcementMessage, instructorName, priority, announcementUrl } = data;

  const priorityColors = {
    urgent: '#dc3545',
    high: '#fd7e14',
    normal: '#667eea',
    low: '#6c757d',
  };

  const priorityColor = priorityColors[priority] || priorityColors.normal;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Announcement: ${announcementTitle}</title>
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
      background: ${priorityColor};
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .priority-badge {
      background: rgba(255,255,255,0.3);
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      text-transform: uppercase;
      font-weight: bold;
      display: inline-block;
      margin-top: 10px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-top: none;
    }
    .announcement-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      border-left: 4px solid ${priorityColor};
    }
    .cta-button {
      display: inline-block;
      background: ${priorityColor};
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .course-info {
      background: #e7f3ff;
      padding: 15px;
      border-radius: 5px;
      margin: 15px 0;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666;
      border-radius: 0 0 10px 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📢 New Announcement</h1>
    <span class="priority-badge">${priority} Priority</span>
  </div>

  <div class="content">
    <p>Hi ${studentName},</p>

    <div class="course-info">
      <strong>Course:</strong> ${courseTitle}<br>
      <strong>From:</strong> ${instructorName}
    </div>

    <h2>${announcementTitle}</h2>

    <div class="announcement-box">
      ${announcementMessage}
    </div>

    <div style="text-align: center;">
      <a href="${announcementUrl}" class="cta-button">View Full Announcement</a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #666;">
      You're receiving this email because you're enrolled in <strong>${courseTitle}</strong>.
      ${priority === 'urgent' || priority === 'high' ? '<br><strong style="color: ' + priorityColor + ';">This is a ' + priority + ' priority announcement that requires your attention.</strong>' : ''}
    </p>
  </div>

  <div class="footer">
    <p><strong>Page Innovation - The Leading Remote DBA Service Provider</strong></p>
    <p>Stay updated with your courses 📚</p>
    <p style="margin-top: 15px;">
      <a href="https://www.pageinnovation.com">Visit Website</a> |
      <a href="https://www.pageinnovation.com/courses">My Courses</a> |
      <a href="https://www.pageinnovation.com/settings/notifications">Notification Settings</a>
    </p>
  </div>
</body>
</html>
  `;
};
