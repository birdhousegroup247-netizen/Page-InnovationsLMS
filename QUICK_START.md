# TekyPro LMS - Quick Start Guide

## Starting the Development Servers

### Method 1: Using the Startup Script (Recommended)

The easiest way to start both servers:

```bash
./start-dev.sh
```

This script will:
- Check if ports are already in use
- Start the backend API on port 5000
- Start the admin frontend on port 5174 (or 5175 if 5174 is busy)
- Create log files in the `logs/` directory
- Keep both servers running until you press Ctrl+C

### Method 2: Manual Startup

#### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```

The backend will start on: **http://localhost:5000**

#### Start Admin Frontend (Terminal 2)
```bash
cd frontend-admin
npm run dev
```

The admin frontend will start on: **http://localhost:5174** (or 5175)

## Server URLs

Once both servers are running:

- **Backend API**: http://localhost:5000
- **Admin Dashboard**: http://localhost:5174
- **Health Check**: http://localhost:5000/health
- **API Documentation**: http://localhost:5000/api-docs

## Troubleshooting

### Backend Won't Start

1. **Check if port 5000 is in use:**
   ```bash
   lsof -i :5000
   ```

2. **Kill the process if needed:**
   ```bash
   kill -9 $(lsof -ti:5000)
   ```

3. **Check database connection:**
   - Ensure MySQL is running
   - Verify `.env` file has correct database credentials
   - Test connection: `mysql -u your_user -p tekypro_lms`

4. **Check logs:**
   ```bash
   cd backend
   npm run dev
   # Look for error messages in the output
   ```

### Frontend Won't Start

1. **Check if port 5174/5175 is in use:**
   ```bash
   lsof -i :5174
   lsof -i :5175
   ```

2. **Kill the process if needed:**
   ```bash
   kill -9 $(lsof -ti:5174)
   kill -9 $(lsof -ti:5175)
   ```

3. **Clear cache and restart:**
   ```bash
   cd frontend-admin
   rm -rf node_modules/.vite
   npm run dev
   ```

### Login Issues

If you can't log in to the admin dashboard:

1. **Verify backend is running:**
   ```bash
   curl http://localhost:5000/health
   ```
   Should return: `{"success":true,"message":"TekyPro LMS API is running",...}`

2. **Check admin user exists in database:**
   ```sql
   SELECT email, role FROM users WHERE role IN ('admin', 'super_admin');
   ```

3. **Create admin user if needed:**
   - Use the registration endpoint with an admin account
   - Or manually set role in database:
     ```sql
     UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';
     ```

### API Connection Issues

If the frontend can't connect to the backend:

1. **Check CORS configuration** in `backend/server.js`:
   - Ensure frontend URL is in `allowedOrigins`
   - Default includes: `http://localhost:5174` and `http://localhost:5173`

2. **Verify frontend API URL** in `frontend-admin/.env`:
   ```
   VITE_API_URL=http://localhost:5000
   ```

3. **Check network tab** in browser DevTools:
   - Look for failed API requests
   - Check request/response details

## Configuration Files

### Backend Configuration (`backend/.env`)
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tekypro_lms

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
```

### Frontend Configuration (`frontend-admin/.env`)
```env
# API Configuration
VITE_API_URL=http://localhost:5000

# Main App URL
VITE_MAIN_APP_URL=http://localhost:5173
```

### Nodemon Configuration (`backend/nodemon.json`)

A `nodemon.json` file has been created to ensure proper server startup and auto-restart on file changes. This fixes issues where nodemon would exit unexpectedly.

## Common Commands

### Backend
```bash
# Start development server (with auto-reload)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Frontend Admin
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Development Workflow

1. **Start servers** using `./start-dev.sh`
2. **Access admin dashboard** at http://localhost:5174
3. **Login** with your admin credentials
4. **Make changes** to code - servers will auto-reload
5. **Check logs** in the `logs/` directory if issues occur
6. **Stop servers** with Ctrl+C

## Need Help?

- Check the main README.md for detailed setup instructions
- Review API documentation at http://localhost:5000/api-docs
- Check the logs in the `logs/` directory
- Verify environment variables in `.env` files

## Fixed Issues

### Nodemon Exit Issue
- **Problem**: Backend server would start then immediately exit with "clean exit"
- **Solution**: Created `backend/nodemon.json` with proper configuration
- **Status**: ✓ Fixed

### Port Conflicts
- **Problem**: Servers fail to start if ports are already in use
- **Solution**: Startup script checks ports and offers to kill existing processes
- **Status**: ✓ Fixed
