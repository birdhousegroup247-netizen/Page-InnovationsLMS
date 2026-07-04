# Third-Party Services Setup Guide

## 🎯 Overview



> i hope you remmeber that the vidoes will not be on cloudinary, i will be uploaded on yutube then the 
link will be put in an iframe like it is playing fron the app.   2. also, when registering, how is an 
instructor confirmed that he or she is truly and instructor, cause a student can regiter and an instrutor,
 in the admin part can ther be like a verification for intrctors and the admin aprrovs them.




This guide will help you configure the three external services required for Page Innovations LMS:

1. **Email Service** (Gmail SMTP) - For password resets, notifications, certificates
2. **Cloudinary** - For file uploads (images, documents, PDFs)
3. **Google OAuth** (Optional) - For "Sign in with Google"

---

## 📧 1. Email Service Setup (Gmail)

### Step 1: Enable 2-Factor Authentication on Your Gmail Account

1. Go to your Google Account: https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the prompts to enable 2FA

### Step 2: Generate an App Password

1. After enabling 2FA, go back to Security settings
2. Click "2-Step Verification" again
3. Scroll down to "App passwords"
4. Click "App passwords"
5. Select:
   - App: "Mail"
   - Device: "Other (Custom name)" → Type "Page Innovations LMS"
   `xsbx qmuy tlrr afmo`

6. Click "Generate"
7. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 3: Update Your .env File

```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop  # Remove spaces from the app password
EMAIL_FROM=Page Innovations LMS <your-email@gmail.com>
```

### Alternative: Use Other SMTP Services

If you prefer not to use Gmail:

**SendGrid:**
```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

**Mailgun:**
```bash
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.mailgun.org
EMAIL_PASSWORD=your-mailgun-password
```

---

## ☁️ 2. Cloudinary Setup

### Step 1: Create a Free Cloudinary Account

1. Go to https://cloudinary.com/users/register/free
2. Sign up (free tier includes 25GB storage, 25GB bandwidth/month)
3. Verify your email

### Step 2: Get Your Credentials

1. After login, you'll see your Dashboard
2. Find the "Account Details" section
3. Copy these three values:
   - **Cloud Name**: (e.g., `dxyz1234`)
   - **API Key**: (e.g., `123456789012345`)
   - **API Secret**: (e.g., `abcdefghijklmnopqrstuvwxyz123`)

### Step 3: Update Your .env File

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Cloudinary Features You'll Get:

- ✅ Profile picture uploads
- ✅ Course thumbnail uploads
- ✅ Document uploads (PDF, DOCX, PPTX)
- ✅ Article image uploads
- ✅ Automatic image optimization
- ✅ CDN delivery (fast worldwide)

---

## 🔐 3. Google OAuth Setup (Optional)

### Step 1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Project name: "Page Innovations LMS"
4. Click "Create"

### Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Google+ API" and click "Enable"

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - User Type: "External"
   - App name: "Page Innovations LMS"
   - User support email: your email
   - Developer contact: your email
   - Click "Save and Continue"
4. Click "Create Credentials" again → "OAuth client ID"
5. Application type: "Web application"
6. Name: "Page Innovations LMS Web"
7. Authorized redirect URIs:
   - Add: `http://localhost:5000/api/auth/google/callback`
   - For production, also add: `https://your-domain.com/api/auth/google/callback`
8. Click "Create"

### Step 4: Copy Your Credentials

You'll see a dialog with:
- **Client ID**: (e.g., `123456789-abcdefg.apps.googleusercontent.com`)
- **Client Secret**: (e.g., `GOCSPX-abcdefghijklmnop`)

### Step 5: Update Your .env File

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

---

## ✅ Testing Your Configuration

### Test Email Service

```bash
# After updating .env, restart the server
cd backend
npm start

# In another terminal, test password reset email
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com"}'
```

Check your email inbox for the password reset email!

### Test Cloudinary Upload

```bash
# Test profile picture upload
curl -X POST http://localhost:5000/api/upload/profile-picture \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/your/image.jpg"
```

### Test Google OAuth

1. Open browser: `http://localhost:5000/api/auth/google`
2. You should be redirected to Google's sign-in page
3. Sign in with your Google account
4. You should be redirected back with a JWT token

---

## 🔒 Security Best Practices

### For Production:

1. **Never commit .env to git** ✅ (already configured in .gitignore)
2. **Use different credentials** for development and production
3. **Rotate secrets** regularly
4. **Use environment variables** in your hosting platform (Railway, Render, etc.)

### Setting Environment Variables in Production:

**Railway:**
```bash
railway variables set EMAIL_USER=your-email@gmail.com
railway variables set EMAIL_PASSWORD=your-app-password
railway variables set CLOUDINARY_CLOUD_NAME=your-cloud-name
# etc...
```

**Render:**
1. Go to your service dashboard
2. Click "Environment"
3. Add each key-value pair manually

**Heroku:**
```bash
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASSWORD=your-app-password
# etc...
```

---

## 📝 Quick Reference - All Environment Variables

```bash
# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=Page Innovations LMS <your-email@gmail.com>

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

---

## 🆘 Troubleshooting

### Email Not Sending

**Error: "Invalid login"**
- Make sure 2FA is enabled on Gmail
- Make sure you're using an App Password, not your regular password
- Remove any spaces from the app password in .env

**Error: "Connection timeout"**
- Check your firewall settings
- Try port 465 with `EMAIL_SECURE=true`

### Cloudinary Upload Fails

**Error: "Invalid credentials"**
- Verify Cloud Name, API Key, and API Secret are correct
- Check for any extra spaces in .env file

### Google OAuth Not Working

**Error: "Redirect URI mismatch"**
- Make sure the redirect URI in Google Console exactly matches the one in your .env
- Include the protocol (http://) and port (:5000)

---

## 🎉 Next Steps

After configuration:
1. ✅ Restart your backend server
2. ✅ Test each service
3. ✅ Build your frontend
4. ✅ Deploy to production

**Need help?** Check the backend logs:
```bash
tail -f backend/logs/combined.log
```

---

**Page Innovations LMS** - The Leading Remote DBA Training Platform
