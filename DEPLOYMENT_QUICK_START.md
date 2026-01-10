# TekyPro LMS - Deployment Quick Start

**Get your project live in 30 minutes - FREE!**

---

## What You Need

1. GitHub account (free)
2. Render.com account (free - no credit card!)
3. 30 minutes of time

---

## Quick Steps

### 1. Generate Secrets (2 minutes)

Open terminal and run:
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# JWT Refresh Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Session Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Save these 3 values!**

### 2. Push to GitHub (5 minutes)

```bash
git add .
git commit -m "Ready for deployment"
git push origin master
```

If you haven't set up GitHub yet:
```bash
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/tekypro-lms.git
git branch -M master
git push -u origin master
```

### 3. Create Render Account (2 minutes)

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with GitHub

### 4. Deploy Database (3 minutes)

1. New + → PostgreSQL
2. Name: `tekypro-db`
3. Region: Oregon
4. Plan: Free
5. Create Database
6. **Save the connection details!**

### 5. Deploy Backend (5 minutes)

1. New + → Web Service
2. Connect your repo
3. Settings:
   ```
   Name: tekypro-api
   Root: backend
   Build: npm install
   Start: npm start
   ```

4. Environment Variables (click "Add Environment Variable"):
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=[from database]
   DB_DIALECT=postgres
   DB_SSL=true
   JWT_SECRET=[from step 1]
   JWT_REFRESH_SECRET=[from step 1]
   SESSION_SECRET=[from step 1]
   REDIS_ENABLED=false
   FRONTEND_URL=https://tekypro-student.onrender.com
   ADMIN_FRONTEND_URL=https://tekypro-admin.onrender.com
   ```

5. Create Web Service

### 6. Deploy Student Frontend (5 minutes)

1. New + → Static Site
2. Connect your repo
3. Settings:
   ```
   Name: tekypro-student
   Root: frontend
   Build: npm install && npm run build
   Publish: dist
   ```

4. Environment Variable:
   ```
   VITE_API_URL=https://tekypro-api.onrender.com
   ```

5. Create Static Site

### 7. Deploy Admin Frontend (5 minutes)

1. New + → Static Site
2. Connect your repo
3. Settings:
   ```
   Name: tekypro-admin
   Root: frontend-admin
   Build: npm install && npm run build
   Publish: dist
   ```

4. Environment Variable

https://tekypro-admin.onrender.com

API:
https://tekypro-api.onrender.com
```

---

## Default Login

```
Email: admin@tekypro.com
Password: Admin@123
```

**Change this immediately after first login!**

---

## Common Issues

### "Service Unavailable"
- **Wait 30-60 seconds** - free tier sleeps after inactivity
- First request wakes it up

### "Database Connection Error"
- Check DATABASE_URL is set correctly
- Make sure DB_DIALECT=postgres
- Verify DB_SSL=true

### Build Failed
- Check logs in Render dashboard
- Make sure Root Directory is correct
- Verify Build Command is correct

---

## Need Detailed Help?

See: `RENDER_DEPLOYMENT_GUIDE.md` for complete step-by-step instructions with screenshots and troubleshooting.

---

## Test Builds Locally First

Run this before deploying:
```bash
./test-production-build.sh
```

This will test that everything builds correctly.

---

## Automatic Updates

Once deployed, just push to GitHub:
```bash
git add .
git commit -m "Update feature"
git push
```

Render **automatically redeploys**!

---

## Files You'll Need

- `render.yaml` - Automated deployment config ✓
- `.env.production.example` - Environment variables template ✓
- `RENDER_DEPLOYMENT_GUIDE.md` - Detailed guide ✓
- `test-production-build.sh` - Build test script ✓

All files are already created and ready!

---

**Ready? Start with Step 1!**

**Estimated Time: 30 minutes**
