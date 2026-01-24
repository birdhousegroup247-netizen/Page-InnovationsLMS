# 🔗 Connect to Render PostgreSQL Database Locally

## 📋 Current Situation

You're currently connected to a **local MySQL database**, but your Render deployment uses **PostgreSQL**. To test the login credentials that are in Render's database, you need to temporarily connect to it.

---

## ✅ Step 1: Get Render PostgreSQL Credentials

1. **Go to your Render Dashboard**: https://dashboard.render.com
2. **Navigate to your PostgreSQL database** (not the web service, the database)
3. **Click on "Info"** or "Connect"
4. **Copy the connection details**:
   - **Internal Database URL** (if connecting from Render services)
   - **External Database URL** (if connecting from your local machine)

The connection string will look like:
```
postgresql://user:password@host:port/database
```

Or individual credentials:
```
Host: xxx.oregon-postgres.render.com
Port: 5432
Database: tekypro_lms_xxxx
Username: tekypro_lms_xxxx_user
Password: xxxxxxxxxxxxx
```

---

## ✅ Step 2: Create a Temporary `.env.render` File

Create a new file for testing with Render's database:

```bash
cd /home/anointed/Desktop/Tekypro/backend
cp .env .env.backup  # Backup your current .env
```

Then create `.env.render` with your Render credentials:

```env
# Render PostgreSQL Connection
DB_HOST=<your-render-host>.oregon-postgres.render.com
DB_PORT=5432
DB_NAME=<your-database-name>
DB_USER=<your-database-user>
DB_PASSWORD=<your-database-password>
DB_DIALECT=postgres

# Keep your other env vars
NODE_ENV=development
PORT=5000
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
SESSION_SECRET=your_session_secret_here

# Other settings (copy from your current .env)
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5174
CLOUDINARY_CLOUD_NAME=xxxxxxxxx
CLOUDINARY_API_KEY=xxxxxxxxx
CLOUDINARY_API_SECRET=xxxxxxxxx
```

---

## ✅ Step 3: Test Connection to Render Database

Replace your `.env` temporarily:

```bash
cd /home/anointed/Desktop/Tekypro/backend
mv .env .env.local
mv .env.render .env
```

Now run the test script:

```bash
node test-login.js
```

This will show you:
- ✅ Which users exist in Render's database
- ✅ Whether `password123` works
- ❌ Which credentials are invalid

---

## ✅ Step 4: Restore Local Database Connection

After testing, restore your local connection:

```bash
cd /home/anointed/Desktop/Tekypro/backend
mv .env .env.render  # Save Render config for later
mv .env.local .env   # Restore local config
```

---

## 🔧 Alternative: Use Custom Environment Variable

Instead of replacing `.env`, you can use dotenv-cli:

```bash
# Install dotenv-cli globally (one time)
npm install -g dotenv-cli

# Run test with Render database
dotenv -e .env.render -- node test-login.js

# Your default .env stays unchanged
```

---

## 📝 Expected Results

### If Database is Seeded Correctly:
```
✅ VALID - admin@tekypro.com (Role: super_admin, Active: true)
✅ VALID - jerod.homenick38@tekypro.com (Role: admin, Active: true)
✅ VALID - aliyah_veum@tekypro.com (Role: admin, Active: true)
✅ VALID - shannon_hayes71@yahoo.com (Role: instructor, Active: true)
...
```

### If Password is Wrong:
```
❌ INVALID - admin@tekypro.com (Role: super_admin, Active: true)
   Hash: $2b$10$abcdefghijk...
```

### If Users Don't Exist:
```
❌ admin@tekypro.com - NOT FOUND IN DATABASE
```

---

## 🚀 If Database Needs Reseeding

If the test shows users don't exist or passwords are wrong:

```bash
# Connect to Render database (using .env.render)
cd /home/anointed/Desktop/Tekypro/backend
mv .env .env.local && mv .env.render .env

# Run seed with reset flag
node scripts/seedDatabase.js --reset

# Restore local connection
mv .env .env.render && mv .env.local .env
```

---

## 🔐 Security Note

**IMPORTANT**: Never commit `.env.render` with real credentials to Git!

Add to `.gitignore`:
```
.env.render
.env.local
.env.backup
```

---

## 📞 Need Help?

If you can't find your Render credentials:
1. Check Render Dashboard → Database → Info tab
2. Look for "Internal Connection String" or "External Connection String"
3. Make sure your IP is whitelisted (Render usually allows all by default)
