/**
 * Question Replied Email Template
 */

module.exports = (data) => {
  const { studentName, courseTitle, questionText, replyText, replierName, isInstructor, questionUrl } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Someone Replied to Your Question</title>
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
    .question-box {
      background: #f8f9fa;
      padding: 15px;
      border-left: 4px solid #6c757d;
      border-radius: 4px;
      margin: 15px 0;
    }
    .reply-box {
      background: #e7f3ff;
      padding: 15px;
      border-left: 4px solid #667eea;
      border-radius: 4px;
      margin: 15px 0;
    }
    .instructor-badge {
      background: #28a745;
      color: white;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      margin-left: 8px;
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
    <h1>💬 New Reply to Your Question</h1>
  </div>

  <div class="content">
    <p>Hi ${studentName},</p>

    <p>${isInstructor ? '<strong>' + replierName + '</strong> (your instructor)' : '<strong>' + replierName + '</strong>'} replied to your question in <strong>${courseTitle}</strong>!</p>

    <h3>Your Question:</h3>
    <div class="question-box">
      ${questionText}
    </div>

    <h3>
      ${replierName}'s Reply:
      ${isInstructor ? '<span class="instructor-badge">INSTRUCTOR</span>' : ''}
    </h3>
    <div class="reply-box">
      ${replyText}
    </div>

    <div style="text-align: center;">
      <a href="${questionUrl}" class="cta-button">View Full Discussion</a>
    </div>

    <p style="margin-top: 30px;">
      ${isInstructor ?
        '🎓 <strong>Great news!</strong> Your instructor took the time to answer your question personally.' :
        '👥 A fellow student has shared their knowledge with you.'
      }
    </p>

    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
      <strong>💡 Tip:</strong> If this answer was helpful, don't forget to upvote it to help other students!
    </div>
  </div>

  <div class="footer">
    <p><strong>Page Innovations - The Leading Remote DBA Service Provider</strong></p>
    <p>Keep learning together! 🤝</p>
    <p style="margin-top: 15px;">
      <a href="https://www.pageinnovation.com">Visit Website</a> |
      <a href="${questionUrl}">View Discussion</a> |
      <a href="https://www.pageinnovation.com/settings/notifications">Notification Settings</a>
    </p>
  </div>
</body>
</html>
  `;
};
