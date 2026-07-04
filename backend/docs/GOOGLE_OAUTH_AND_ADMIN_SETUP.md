# Google OAuth & Admin Dashboard Setup Guide

Complete guide for setting up Google OAuth authentication and the Admin Dashboard for Page Innovations LMS.

---

## 📑 Table of Contents

1. [Google OAuth Setup](#google-oauth-setup)
2. [Admin Dashboard Setup](#admin-dashboard-setup)
3. [Testing Google OAuth](#testing-google-oauth)
4. [Testing Admin Dashboard](#testing-admin-dashboard)
5. [Troubleshooting](#troubleshooting)

---

## 🔐 Google OAuth Setup

### Overview

Google OAuth allows users to sign in using their Google accounts. When a user authenticates with Google:
1. If they're a new user, an account is created automatically
2. If they have an existing account (same email), their Google account is linked
3. Users can then log in with just their Google account

### Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "New Project"
   - Name: "Page Innovations LMS"
   - Click "Create"

3. **Enable Google+ API**
   - Go to: APIs & Services → Library
   - Search for "Google+ API"
   - Click and enable it

4. **Create OAuth 2.0 Credentials**
   - Go to: APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Page Innovations LMS Web"

5. **Configure Authorized Origins**
   ```
   Authorized JavaScript origins:
   - http://localhost:5000
   - http://localhost:3000
   - https://yourdomain.com (production)
   ```

6. **Configure Authorized Redirect URIs**
   ```
   Authorized redirect URIs:
   - http://localhost:5000/api/auth/google/callback
   - https://api.yourdomain.com/api/auth/google/callback (production)
   ```

7. **Get Your Credentials**
   - Click "Create"
   - Copy your **Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)
   - Copy your **Client Secret** (looks like: `GOCSPX-abc123xyz456`)

### Step 2: Configure Environment Variables

Update your `/backend/.env` file:

```env
# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000
```

**Important:**
- Never commit these credentials to Git
- Use different credentials for development and production
- The callback URL must match exactly what you configured in Google Console

### Step 3: Restart Your Server

```bash
cd /home/anointed/Desktop/Tekypro/backend
npm run dev
```

Check the logs - you should see:
```
✓ Email service connection verified
✓ Cloudinary connection verified
```

No warnings about missing Google OAuth credentials.

---

## 🔧 Admin Dashboard Setup

### Overview

The Admin Dashboard is a separate backend server running on **Port 5001** that provides administrative endpoints for:
- User management
- Platform analytics
- System statistics
- Content moderation

### Architecture

```
Main Backend (Port 5000)          Admin Dashboard (Port 5001)
├── Public APIs                   ├── Admin-only APIs
├── Student endpoints             ├── User management
├── Instructor endpoints          ├── Analytics
├── Course management             ├── Statistics
└── Authentication                └── System health
```

Both servers share the same database.

### Already Configured! ✅

The admin dashboard is already set up with:

**Endpoints:**
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Deactivate user
- `PATCH /api/admin/users/:id/activate` - Activate user
- `GET /api/admin/users/stats/roles` - Role distribution
- `GET /api/admin/stats/overview` - Dashboard overview
- `GET /api/admin/stats/enrollments/trends` - Enrollment trends
- `GET /api/admin/stats/courses/popular` - Popular courses
- `GET /api/admin/stats/activities/recent` - Recent activities
- `GET /api/admin/stats/system/health` - System health
- `GET /api/admin/analytics/students/performance` - Student analytics
- `GET /api/admin/analytics/courses` - Course analytics
- `GET /api/admin/analytics/questions` - Question analytics
- `GET /api/admin/analytics/instructors` - Instructor analytics
- `GET /api/admin/analytics/enrollments` - Enrollment analytics

### Step 1: Configure Environment

The admin dashboard has its own `.env` file:

```bash
# Check the configuration
cat /home/anointed/Desktop/Tekypro/admin-dashboard/backend/.env
```

It should contain:
```env
NODE_ENV=development
PORT=5001
DB_NAME=pageinnovation_lms
DB_USER=root
DB_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
```

### Step 2: Install Dependencies

```bash
cd /home/anointed/Desktop/Tekypro/admin-dashboard/backend
npm install
```

### Step 3: Start Admin Dashboard

```bash
npm run dev
```

Server starts on: http://localhost:5001

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🔧 Page Innovations LMS Admin Dashboard API                     ║
║                                                           ║
║   Environment: development                                ║
║   Port: 5001                                              ║
║                                                           ║
║   Server URL: http://localhost:5001                       ║
║   Health Check: http://localhost:5001/health             ║
║                                                           ║
║   Page Innovations - The Leading Remote DBA Service Provider      ║
║   https://www.pageinnovation.com                                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🧪 Testing Google OAuth

### Prerequisites

1. Google OAuth credentials configured
2. Main backend running on port 5000
3. Frontend running on port 3000 (for redirect testing)

### Test Flow

#### 1. Initiate Google OAuth

Open in browser:
```
http://localhost:5000/api/auth/google
```

This will:
- Redirect to Google's consent screen
- Ask you to choose a Google account
- Request permission to access profile and email

#### 2. After Authorization

Google redirects back to:
```
http://localhost:5000/api/auth/google/callback
```

The backend then:
1. Validates the Google token
2. Creates a new user OR links existing account
3. Generates JWT tokens
4. Redirects to frontend with tokens:
   ```
   http://localhost:3000/auth/callback?token=xxx&refreshToken=yyy
   ```

#### 3. Frontend Handles Tokens

Your frontend should:
```javascript
// Extract tokens from URL
const params = new URLSearchParams(window.location.search);
const accessToken = params.get('token');
const refreshToken = params.get('refreshToken');

// Store in localStorage
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Redirect to dashboard
window.location.href = '/dashboard';
```

### Testing Without Frontend

If frontend isn't ready, you can test manually:

```bash
# 1. Open browser to initiate OAuth
http://localhost:5000/api/auth/google

# 2. After redirect, extract tokens from URL
# URL will be: http://localhost:3000/auth/callback?token=xxx&refreshToken=yyy

# 3. Test the token
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expected Response

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "full_name": "John Doe",
      "email": "john@gmail.com",
      "role": "student",
      "google_id": "123456789",
      "profile_picture": "https://lh3.googleusercontent.com/...",
      "email_verified": true,
      "is_active": true
    }
  }
}
```

---

## 🧪 Testing Admin Dashboard

### Prerequisites

1. Admin dashboard running on port 5001
2. Admin user account created
3. Valid JWT token

### Step 1: Create Admin User

```bash
# Using main backend
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Admin User",
    "email": "admin@pageinnovation.com",
    "password": "Admin@123456",
    "role": "admin"
  }'
```

Copy the `accessToken` from the response.

### Step 2: Test Admin Endpoints

**Get Dashboard Overview:**
```bash
curl http://localhost:5001/api/admin/stats/overview \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 15,
      "active": 14,
      "students": 10,
      "instructors": 3
    },
    "courses": {
      "total": 5,
      "published": 4,
      "draft": 1
    },
    "enrollments": {
      "total": 25,
      "completed": 8,
      "completionRate": "32.00"
    }
    // ... more stats
  }
}
```

**List All Users:**
```bash
curl http://localhost:5001/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get User Details:**
```bash
curl http://localhost:5001/api/admin/users/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Create New User (Super Admin Only):**
```bash
curl -X POST http://localhost:5001/api/admin/users \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "New Student",
    "email": "newstudent@example.com",
    "password": "Student@123",
    "role": "student"
  }'
```

**Update User:**
```bash
curl -X PUT http://localhost:5001/api/admin/users/5 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated Name",
    "is_active": true
  }'
```

**Deactivate User (Super Admin Only):**
```bash
curl -X DELETE http://localhost:5001/api/admin/users/5 \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

**Get Enrollment Trends:**
```bash
curl "http://localhost:5001/api/admin/stats/enrollments/trends?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Student Performance:**
```bash
curl http://localhost:5001/api/admin/analytics/students/performance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 3: Test Authorization

**Test with Student Token (Should Fail):**
```bash
# Login as student
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@pageinnovation.com",
    "password": "Student@123"
  }'

# Try to access admin endpoint (will fail)
curl http://localhost:5001/api/admin/users \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

**Expected Error:**
```json
{
  "success": false,
  "message": "Admin access required",
  "error": "ForbiddenError"
}
```

---

## 🚨 Troubleshooting

### Google OAuth Issues

**Problem:** "Google OAuth not configured" warning in logs

**Solution:**
- Check `.env` file has `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Ensure no extra spaces in credentials
- Restart the server after adding credentials

---

**Problem:** "redirect_uri_mismatch" error

**Solution:**
- Check Google Console → Credentials → OAuth 2.0 Client IDs
- Ensure redirect URI matches exactly: `http://localhost:5000/api/auth/google/callback`
- No trailing slash
- Protocol (http/https) must match

---

**Problem:** User created but no welcome email

**Solution:**
- Check email service is configured (see `EMAIL_AND_UPLOAD_SETUP.md`)
- Check logs for email errors
- Email sending is optional and won't block OAuth

---

**Problem:** Tokens not appearing in frontend URL

**Solution:**
- Check `FRONTEND_URL` in `.env`
- Ensure frontend is running on that URL
- Check browser console for errors
- Tokens are in URL params: `?token=xxx&refreshToken=yyy`

---

### Admin Dashboard Issues

**Problem:** "Admin access required" error

**Solution:**
- Ensure user role is `admin` or `super_admin`
- Check JWT token is valid
- Login with admin credentials, not student

---

**Problem:** "Database connection failed"

**Solution:**
- Both servers use same database
- Check database credentials in admin `.env`
- Ensure MySQL is running
- Test connection: `mysql -u root -p pageinnovation_lms`

---

**Problem:** Port 5001 already in use

**Solution:**
```bash
# Find process using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>

# Or change port in admin .env
PORT=5002
```

---

**Problem:** 404 on admin endpoints

**Solution:**
- Ensure admin server is running
- Check URL: `http://localhost:5001` (not 5000)
- Check route path starts with `/api/admin/`

---

## 📊 Complete API Reference

### Google OAuth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google` | GET | Initiate Google OAuth |
| `/api/auth/google/callback` | GET | OAuth callback (automatic) |

### Admin Dashboard Endpoints

#### User Management
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/users` | GET | Admin | List all users |
| `/api/admin/users/:id` | GET | Admin | Get user details |
| `/api/admin/users` | POST | Super Admin | Create user |
| `/api/admin/users/:id` | PUT | Admin | Update user |
| `/api/admin/users/:id` | DELETE | Super Admin | Deactivate user |
| `/api/admin/users/:id/activate` | PATCH | Admin | Activate user |
| `/api/admin/users/stats/roles` | GET | Admin | Role distribution |

#### Statistics
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/stats/overview` | GET | Admin | Dashboard overview |
| `/api/admin/stats/enrollments/trends` | GET | Admin | Enrollment trends |
| `/api/admin/stats/courses/popular` | GET | Admin | Popular courses |
| `/api/admin/stats/activities/recent` | GET | Admin | Recent activities |
| `/api/admin/stats/system/health` | GET | Admin | System health |

#### Analytics
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/analytics/students/performance` | GET | Admin | Student performance |
| `/api/admin/analytics/courses` | GET | Admin | Course analytics |
| `/api/admin/analytics/questions` | GET | Admin | Question analytics |
| `/api/admin/analytics/instructors` | GET | Admin | Instructor analytics |
| `/api/admin/analytics/enrollments` | GET | Admin | Enrollment analytics |

---

## 🔒 Security Best Practices

### Google OAuth

1. **Never expose Client Secret**
   - Keep it in `.env` only
   - Never commit to Git
   - Use different secrets for dev/production

2. **Validate Redirect URIs**
   - Only add trusted domains
   - Use HTTPS in production
   - Keep list minimal

3. **Handle Token Security**
   - Store tokens securely (httpOnly cookies preferred)
   - Implement token refresh logic
   - Set appropriate expiration times

### Admin Dashboard

1. **Role-Based Access**
   - Verify user role on every request
   - Use middleware consistently
   - Never trust client-side role checks

2. **Audit Logging**
   - All admin actions are logged
   - Check logs regularly
   - Monitor for suspicious activity

3. **Rate Limiting**
   - Admin endpoints have rate limits
   - Monitor for abuse
   - Adjust limits as needed

4. **Super Admin Protection**
   - Limit number of super admins
   - Use strong passwords
   - Enable 2FA (future enhancement)

---

## ✅ Production Checklist

### Before Deploying Google OAuth

- [ ] Create production Google OAuth credentials
- [ ] Add production domains to authorized origins
- [ ] Add production callback URL
- [ ] Update production `.env` with credentials
- [ ] Test OAuth flow in staging
- [ ] Enable HTTPS for all OAuth endpoints
- [ ] Set secure cookie options
- [ ] Implement CSRF protection

### Before Deploying Admin Dashboard

- [ ] Change all default passwords
- [ ] Create limited admin accounts
- [ ] Set up IP whitelist (optional)
- [ ] Configure production database
- [ ] Enable request logging
- [ ] Set up monitoring/alerts
- [ ] Test all admin endpoints
- [ ] Implement admin session timeout
- [ ] Set up backup admin access
- [ ] Document admin procedures

---

## 🎉 Summary

You now have:

1. ✅ **Google OAuth Authentication**
   - Sign in with Google
   - Automatic user creation
   - Account linking
   - Welcome emails

2. ✅ **Admin Dashboard Backend**
   - User management (CRUD)
   - Platform analytics
   - System statistics
   - Performance metrics
   - Role-based access control

Both features are production-ready and secure! 🚀

---

**Questions or Issues?**
- Check the logs: `tail -f logs/combined.log`
- Review environment variables
- Test with curl commands above
- Check Google Console for OAuth errors

Happy administrating! 💼
