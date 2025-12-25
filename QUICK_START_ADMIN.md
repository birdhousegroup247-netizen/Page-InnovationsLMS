# Quick Start Guide - Admin Panel Setup

This guide will help you run both the main frontend and admin frontend simultaneously.

---

## 🚀 Running Both Applications

### Terminal 1: Backend Server
```bash
cd backend
npm run dev
```
**URL:** http://localhost:5000

---

### Terminal 2: Main Frontend (Student/Instructor)
```bash
cd frontend
npm run dev
```
**URL:** http://localhost:5173

**Access:**
- Students: `/dashboard`
- Instructors: `/instructor/dashboard`
- Admins: `/admin/dashboard`
- Role Selector: `/role-selector`

---

### Terminal 3: Admin Frontend (Admin Only)
```bash
cd frontend-admin
npm run dev
```
**URL:** http://localhost:5174

**Access:**
- Admin Dashboard: `/dashboard`
- User Management: `/users`
- Course Management: `/courses`
- Analytics: `/analytics`
- Activity Logs: `/activity`
- Instructor Applications: `/instructor-applications`

---

## 🔑 Testing Admin Access

### Option 1: Login as Admin
1. Go to http://localhost:5174
2. Login with admin credentials
3. You'll be redirected to `/dashboard`

### Option 2: Main App → Switch to Admin
1. Go to http://localhost:5173
2. Login as admin
3. Click profile menu (top right)
4. Click "Switch Role"
5. Select "Administrator" card
6. Click "Continue"

---

## 📱 Main App vs Admin App

| Feature | Main App (5173) | Admin App (5174) |
|---------|-----------------|------------------|
| **Users** | All (Student/Instructor/Admin) | Admin only |
| **Routes** | Student, Instructor, Admin routes | Admin routes only |
| **Navigation** | Role-based sidebar | Admin-specific sidebar |
| **Access Control** | Multi-role support | Strict admin-only |
| **URL** | app.tekypro.com | admin.tekypro.com |

---

## 🛠️ Troubleshooting

### Issue: CORS errors
**Solution:** Make sure backend is running on port 5000 and CORS is configured correctly.

### Issue: Admin app shows "Access Denied"
**Solution:** Login with an account that has `role: 'admin'` or `role: 'super_admin'`.

### Issue: Components not rendering
**Solution:**
```bash
cd frontend-admin
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Can't switch roles
**Solution:** Make sure you're logged in with an account that has multiple role capabilities (instructor can be student, admin can be instructor).

---

## 📋 Admin Pages Overview

### 1. Dashboard (`/dashboard`)
- Platform statistics
- Recent activity
- Quick actions
- Platform health metrics

### 2. Users (`/users`)
- User list with search and filters
- Role management
- User activation/deactivation
- User deletion (super_admin only)

### 3. Courses (`/courses`)
- Course listing with pagination
- Status management (Published, Draft, Pending, Archived)
- Search and filter
- View course details
- Change course status

### 4. Analytics (`/analytics`)
- KPIs (Revenue, Users, Enrollments, Ratings)
- User engagement (DAU, WAU, MAU)
- Top courses
- Top instructors
- Revenue breakdown

### 5. Activity Logs (`/activity`)
- Real-time activity feed
- Activity type filtering
- Severity filtering
- Search functionality
- Metadata display
- Export logs

### 6. Instructor Applications (`/instructor-applications`)
- Pending applications
- Approve/Reject functionality
- Application history

---

## 🎯 Development Workflow

### Adding a New Admin Page

1. **Create the page:**
```bash
# In frontend-admin/src/pages/admin/
touch NewPage.jsx
```

2. **Import in App.jsx:**
```javascript
import NewPage from './pages/admin/NewPage';
```

3. **Add route:**
```javascript
<Route
  path="/new-page"
  element={
    <AdminRoute>
      <NewPage />
    </AdminRoute>
  }
/>
```

4. **Add to navigation:**
```javascript
// frontend-admin/src/utils/navigationItems.jsx
{
  label: 'New Page',
  path: '/new-page',
  icon: <Icon className="w-5 h-5" />,
}
```

---

## 🔒 Security Best Practices

1. **Never commit .env files** - Already in .gitignore
2. **Use environment variables** for sensitive data
3. **Implement 2FA** for admin panel in production
4. **Regular security audits** - npm audit
5. **Keep dependencies updated** - npm outdated
6. **Use HTTPS in production** - Let's Encrypt
7. **Implement rate limiting** - Already configured in backend
8. **Monitor activity logs** - Regular reviews

---

## 📦 Production Deployment

### Main App
```bash
cd frontend
npm run build
# Deploy to app.tekypro.com
```

### Admin App
```bash
cd frontend-admin
npm run build
# Deploy to admin.tekypro.com
```

### Environment Variables (Production)
```bash
# Main App
VITE_API_URL=https://api.tekypro.com
VITE_ADMIN_APP_URL=https://admin.tekypro.com

# Admin App
VITE_API_URL=https://api.tekypro.com
VITE_MAIN_APP_URL=https://app.tekypro.com

# Backend
FRONTEND_URL=https://app.tekypro.com
ADMIN_FRONTEND_URL=https://admin.tekypro.com
```

---

## 🎉 You're All Set!

Your TekyPro LMS now has:
- ✅ Complete admin pages (Courses, Analytics, Activity)
- ✅ Role selection screen
- ✅ Separate admin frontend
- ✅ Enhanced security and performance
- ✅ Production-ready architecture

Happy coding! 🚀
