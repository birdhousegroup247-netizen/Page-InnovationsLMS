# Email & File Upload Setup Guide

This guide will help you configure email sending (Nodemailer) and file uploads (Cloudinary) for Page Innovation LMS.

---

## 📧 Email Service Setup (Nodemailer + Gmail)

### Step 1: Create Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Scroll down to **App passwords**
4. Click **Select app** → Choose **Mail**
5. Click **Select device** → Choose **Other (Custom name)**
6. Enter "Page Innovation LMS" and click **Generate**
7. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 2: Configure .env File

Update your `/backend/.env` file with:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password-here
EMAIL_FROM_NAME=Page Innovation LMS
FRONTEND_URL=http://localhost:3000
```

**Important:**
- Use the **App Password**, not your regular Gmail password
- Remove spaces from the app password (abcdefghijklmnop)
- Make sure 2-Step Verification is enabled

### Step 3: Test Email Service

```bash
cd /home/anointed/Desktop/Tekypro/backend
node -e "
const emailService = require('./services/email/emailService');
emailService.sendPasswordResetEmail(
  'test@example.com',
  'Test User',
  'test-token-123'
).then(() => console.log('✓ Email sent successfully'))
  .catch(err => console.error('✗ Email failed:', err));
"
```

### Step 4: Test via API

**Request password reset:**

```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-registered-email@gmail.com"
  }'
```

Check your email inbox for the password reset link!

---

## ☁️ Cloudinary Setup

### Step 1: Create Free Cloudinary Account

1. Go to https://cloudinary.com/users/register/free
2. Sign up for a free account
3. Verify your email
4. Login to your dashboard

### Step 2: Get API Credentials

1. Go to **Dashboard** → https://cloudinary.com/console
2. You'll see:
   - **Cloud Name** (e.g., `dtexample123`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz`)

### Step 3: Configure .env File

Update your `/backend/.env` file with:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name-here
CLOUDINARY_API_KEY=your-api-key-here
CLOUDINARY_API_SECRET=your-api-secret-here
```

### Step 4: Test Cloudinary Connection

```bash
cd /home/anointed/Desktop/Tekypro/backend
node -e "
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
cloudinary.api.ping()
  .then(res => console.log('✓ Cloudinary connected:', res))
  .catch(err => console.error('✗ Cloudinary failed:', err));
"
```

---

## 🧪 Testing File Uploads

### 1. Start the Server

```bash
cd /home/anointed/Desktop/Tekypro/backend
npm run dev
```

Server should start on http://localhost:5000

### 2. Register a Test User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Test User",
    "email": "testuser@example.com",
    "password": "Test@123456",
    "role": "student"
  }'
```

Copy the `token` from the response.

### 3. Upload Profile Picture

```bash
curl -X POST http://localhost:5000/api/upload/profile-picture \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/your/image.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Profile picture uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "public_id": "pageinnovation-lms/profile-pictures/user_1_...",
    "width": 1200,
    "height": 800,
    "format": "jpg",
    "size": 245678
  }
}
```

### 4. Upload Course Thumbnail

```bash
curl -X POST http://localhost:5000/api/upload/course-thumbnail \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/thumbnail.png" \
  -F "courseId=1"
```

### 5. Upload Course Document

```bash
curl -X POST http://localhost:5000/api/upload/course-document \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/document.pdf" \
  -F "courseId=1"
```

### 6. Upload Multiple Files

```bash
curl -X POST http://localhost:5000/api/upload/multiple \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.png" \
  -F "files=@/path/to/file3.pdf" \
  -F "folder=course-materials"
```

---

## 📝 Available Upload Endpoints

| Endpoint | Method | Description | Max Size | Allowed Types |
|----------|--------|-------------|----------|---------------|
| `/api/upload/profile-picture` | POST | Upload user profile picture | 2MB | jpg, jpeg, png |
| `/api/upload/course-thumbnail` | POST | Upload course thumbnail | 3MB | jpg, jpeg, png, webp |
| `/api/upload/course-document` | POST | Upload course document | 10MB | pdf, doc, docx, ppt, pptx, xls, xlsx |
| `/api/upload/article-image` | POST | Upload article image | 5MB | jpg, jpeg, png, gif, webp |
| `/api/upload/certificate-template` | POST | Upload certificate template | 5MB | jpg, jpeg, png, webp |
| `/api/upload/multiple` | POST | Upload multiple files | 5MB each | images & documents |
| `/api/upload/from-url` | POST | Upload from external URL | - | - |
| `/api/upload/:publicId` | DELETE | Delete uploaded file | - | - |
| `/api/upload/details/:publicId` | GET | Get file details | - | - |

---

## 📧 Available Email Templates

The email service includes these pre-built templates:

### 1. Password Reset Email
```javascript
const emailService = require('./services/email/emailService');
await emailService.sendPasswordResetEmail(
  'user@example.com',
  'John Doe',
  'reset-token-here'
);
```

### 2. Welcome Email
```javascript
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe'
);
```

### 3. Course Enrollment Confirmation
```javascript
await emailService.sendEnrollmentConfirmation(
  'user@example.com',
  'John Doe',
  {
    id: 1,
    title: 'MSSQL Server Fundamentals',
    description: 'Learn MSSQL from scratch',
    instructor: { full_name: 'Instructor Name' },
    duration_hours: 20
  }
);
```

### 4. Course Completion & Certificate
```javascript
await emailService.sendCourseCompletionEmail(
  'user@example.com',
  'John Doe',
  { title: 'MSSQL Server Fundamentals' },
  'https://cloudinary.com/.../certificate.pdf'
);
```

### 5. Test Assignment Notification
```javascript
await emailService.sendTestAssignmentEmail(
  'user@example.com',
  'John Doe',
  {
    id: 1,
    test_name: 'Final Exam',
    description: 'Complete this test by Friday',
    total_questions: 50,
    time_limit_minutes: 90,
    due_date: '2025-01-20T23:59:59Z'
  }
);
```

---

## 🚨 Troubleshooting

### Email Issues

**Problem:** "Invalid credentials" error

**Solution:**
- Make sure you're using App Password, not regular password
- Remove spaces from the app password
- Enable 2-Step Verification in Google Account
- Check if "Less secure app access" is turned off (it should be)

**Problem:** "Connection timeout"

**Solution:**
- Check your firewall settings
- Try using port 465 with `EMAIL_SECURE=true`
- Check if your network blocks SMTP

**Problem:** Emails going to spam

**Solution:**
- Use a verified domain email (not Gmail for production)
- Add SPF and DKIM records to your domain
- Warm up your email sender reputation

### Cloudinary Issues

**Problem:** "Invalid signature" error

**Solution:**
- Double-check your API Secret (no extra spaces)
- Make sure API Key is correct
- Verify Cloud Name matches exactly

**Problem:** "Upload failed" error

**Solution:**
- Check file size limits (free tier: 10MB per file)
- Verify file format is allowed
- Check Cloudinary dashboard for quota limits

**Problem:** Slow uploads

**Solution:**
- Cloudinary free tier may have rate limits
- Consider upgrading to paid plan for production
- Use image optimization settings

---

## 🔐 Security Best Practices

### For Email

1. **Never commit .env files to Git**
   ```bash
   # Ensure .env is in .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use environment-specific configs**
   - Development: Gmail App Password
   - Production: SendGrid, AWS SES, or Mailgun

3. **Rotate credentials regularly**
   - Change App Password every 3 months
   - Use different passwords for dev/staging/prod

### For Cloudinary

1. **Enable Cloudinary security features**
   - Set upload presets
   - Enable moderation
   - Use signed uploads for sensitive content

2. **Limit folder access**
   ```javascript
   // Only upload to specific folders
   folder: `pageinnovation-lms/${userRole}/${userId}`
   ```

3. **Set transformation limits**
   - Prevent abuse by limiting image transformations
   - Use auto-quality and auto-format

4. **Monitor usage**
   - Check Cloudinary dashboard regularly
   - Set up usage alerts
   - Upgrade plan if approaching limits

---

## 📊 Monitoring & Logging

All email and upload operations are logged using Winston:

```bash
# View logs
tail -f /home/anointed/Desktop/Tekypro/backend/logs/combined.log

# View only errors
tail -f /home/anointed/Desktop/Tekypro/backend/logs/error.log
```

**Email logs:**
- ✓ Email sent successfully to {email}: {messageId}
- ✗ Failed to send email to {email}: {error}

**Upload logs:**
- ✓ Image uploaded to Cloudinary: {url}
- ✓ Document uploaded to Cloudinary: {url}
- ✗ Cloudinary upload error: {error}

---

## ✅ Production Checklist

Before deploying to production:

### Email Service
- [ ] Use professional email service (SendGrid, AWS SES, Mailgun)
- [ ] Configure SPF, DKIM, and DMARC records
- [ ] Set up email delivery monitoring
- [ ] Test all email templates
- [ ] Implement rate limiting for emails
- [ ] Add unsubscribe functionality (if needed)

### File Upload Service
- [ ] Upgrade Cloudinary to paid plan (or use alternatives)
- [ ] Enable signed uploads
- [ ] Set up CDN for faster delivery
- [ ] Configure image optimization presets
- [ ] Implement virus scanning for uploads
- [ ] Set up backup strategy
- [ ] Monitor storage usage and costs

### General
- [ ] Use strong, unique secrets in .env
- [ ] Enable HTTPS for all endpoints
- [ ] Set up error monitoring (Sentry)
- [ ] Configure proper CORS settings
- [ ] Test all file upload limits
- [ ] Verify email templates render correctly in all clients
- [ ] Set up automated backups

---

## 🎉 Summary

You've successfully configured:

1. ✅ **Email Service** with Nodemailer + Gmail
   - Password reset emails
   - Welcome emails
   - Enrollment confirmations
   - Test assignments
   - Certificate notifications

2. ✅ **File Upload Service** with Cloudinary + Multer
   - Profile pictures
   - Course thumbnails
   - Course documents
   - Article images
   - Certificate templates
   - Multiple file uploads

3. ✅ **API Endpoints** at `/api/upload/*`

Everything is ready for testing! 🚀

---

**Questions or Issues?**
- Check the logs: `tail -f logs/combined.log`
- Review this guide
- Check Cloudinary dashboard for upload status
- Verify email credentials in .env

Happy coding! 💻
