# Course Management System API Documentation

## Overview
Complete Course Management System including categories, courses, modules, content, enrollments, and progress tracking.

**Status:** ✅ **FULLY FUNCTIONAL**
**Date Completed:** December 13, 2025

---

## 📚 Available Endpoints

### Category Endpoints

#### 1. Get All Categories
```bash
GET /api/courses/categories
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Database Administration",
        "parent_category_id": null,
        "icon": "🗄️",
        "color": "#3B82F6",
        "description": "Learn database management and administration",
        "display_order": 1,
        "is_active": true,
        "subcategories": [...]
      }
    ]
  }
}
```

#### 2. Get Main Categories (No subcategories)
```bash
GET /api/courses/categories/main
```

#### 3. Get Subcategories by Parent
```bash
GET /api/courses/categories/:parentId/sub
```

---

### Course Endpoints

#### 1. Get All Courses (Public)
```bash
GET /api/courses?category=1&difficulty=beginner&search=sql&page=1&limit=12
```

**Query Parameters:**
- `category` (optional) - Filter by category ID
- `difficulty` (optional) - Filter by difficulty (beginner, intermediate, advanced)
- `search` (optional) - Search in title and description
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 12)

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "courses": [
      {
        "id": 1,
        "title": "MSSQL Server Fundamentals",
        "slug": "mssql-server-fundamentals",
        "description": "Master the fundamentals...",
        "thumbnail": "https://...",
        "category_id": 6,
        "instructor_id": 2,
        "duration_hours": 40,
        "difficulty": "beginner",
        "status": "published",
        "average_rating": "0.00",
        "total_reviews": 0,
        "enrollment_count": 1,
        "category": {
          "id": 6,
          "name": "MSSQL Server",
          "icon": "🔷"
        },
        "instructor": {
          "id": 2,
          "full_name": "John Instructor",
          "profile_picture": null
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 12
    }
  }
}
```

#### 2. Get Course by ID
```bash
GET /api/courses/:id
```

**Response:** Full course details with modules, contents, and enrollment status

#### 3. Create Course (Instructor/Admin)
```bash
POST /api/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Advanced SQL Optimization",
  "description": "Master query optimization techniques...",
  "category_id": 6,
  "duration_hours": 30,
  "difficulty": "advanced",
  "thumbnail": "https://...",
  "status": "draft"
}
```

**Required Role:** `instructor`, `admin`, or `super_admin`

#### 4. Update Course
```bash
PUT /api/courses/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "published"
}
```

**Permissions:** Only course owner or admin can update

#### 5. Delete Course (Soft Delete)
```bash
DELETE /api/courses/:id
Authorization: Bearer <token>
```

**Note:** This archives the course (status = 'archived'), doesn't delete it permanently

#### 6. Enroll in Course (Student)
```bash
POST /api/courses/:id/enroll
Authorization: Bearer <token>
```

**Required Role:** `student`

**Response:**
```json
{
  "success": true,
  "message": "Successfully enrolled in course",
  "data": {
    "enrollment": {
      "id": 2,
      "student_id": 5,
      "course_id": "1",
      "enrollment_date": "2025-12-13T05:49:46.116Z",
      "progress_percentage": 0
    }
  }
}
```

#### 7. Get My Enrolled Courses (Student)
```bash
GET /api/courses/my/enrollments?status=in_progress
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional) - Filter by status (`in_progress`, `completed`, `all`)

**Required Role:** `student`

#### 8. Get Instructor's Courses
```bash
GET /api/courses/my/teaching
Authorization: Bearer <token>
```

**Required Role:** `instructor`, `admin`, or `super_admin`

---

### Module Endpoints

#### 1. Get Course Modules
```bash
GET /api/courses/:courseId/modules
```

**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "modules": [
      {
        "id": 1,
        "course_id": 1,
        "title": "Introduction to MSSQL Server",
        "description": "Overview of SQL Server architecture",
        "order_index": 1,
        "contents": [...]
      }
    ]
  }
}
```

#### 2. Create Module (Instructor/Admin)
```bash
POST /api/courses/:courseId/modules
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Advanced Topics",
  "description": "Deep dive into advanced features",
  "order_index": 3
}
```

#### 3. Update Module
```bash
PUT /api/courses/modules/:moduleId
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Module Title",
  "order_index": 2
}
```

#### 4. Delete Module
```bash
DELETE /api/courses/modules/:moduleId
Authorization: Bearer <token>
```

---

### Content Endpoints

#### 1. Get Module Contents
```bash
GET /api/courses/modules/:moduleId/contents
```

#### 2. Get Content by ID
```bash
GET /api/courses/contents/:contentId
```

#### 3. Create Content (Instructor/Admin)
```bash
POST /api/courses/modules/:moduleId/contents
Authorization: Bearer <token>
Content-Type: application/json

{
  "content_type": "video",
  "title": "Introduction Video",
  "youtube_url": "https://youtube.com/watch?v=xyz",
  "youtube_video_id": "xyz",
  "duration_minutes": 15,
  "order_index": 1,
  "is_preview": true
}
```

**Content Types:**
- `video` - YouTube video (requires `youtube_url` and `youtube_video_id`)
- `document` - PDF/DOC file (requires `document_url` and `document_type`)
- `article` - Rich text content (requires `article_content`)

**Document Example:**
```json
{
  "content_type": "document",
  "title": "SQL Cheat Sheet",
  "document_url": "https://cloudinary.com/.../guide.pdf",
  "document_type": "pdf",
  "file_size_mb": 2.5,
  "order_index": 2
}
```

**Article Example:**
```json
{
  "content_type": "article",
  "title": "Understanding Indexes",
  "article_content": "<h1>Indexes</h1><p>Indexes speed up...</p>",
  "order_index": 3
}
```

#### 4. Update Content
```bash
PUT /api/courses/contents/:contentId
Authorization: Bearer <token>
Content-Type: application/json
```

#### 5. Delete Content
```bash
DELETE /api/courses/contents/:contentId
Authorization: Bearer <token>
```

---

### Progress Tracking Endpoints

#### 1. Mark Content as Complete (Student)
```bash
POST /api/courses/contents/:contentId/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "watch_time_seconds": 890,
  "last_position_seconds": 900
}
```

**Required Role:** `student`

**Response:** Returns updated content progress and overall course progress

#### 2. Update Video Progress (Student)
```bash
POST /api/courses/contents/:contentId/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "watch_time_seconds": 450,
  "last_position_seconds": 450
}
```

**Note:** Use this to save video position for resume functionality

---

## 🔒 Authentication & Authorization

### Required Headers
```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### Role-Based Access

| Endpoint | Student | Instructor | Admin | Super Admin |
|----------|---------|------------|-------|-------------|
| Browse Courses | ✅ | ✅ | ✅ | ✅ |
| View Course Details | ✅ | ✅ | ✅ | ✅ |
| Enroll in Course | ✅ | ❌ | ❌ | ❌ |
| Create Course | ❌ | ✅ | ✅ | ✅ |
| Update Own Course | ❌ | ✅ | ✅ | ✅ |
| Update Any Course | ❌ | ❌ | ✅ | ✅ |
| Delete Own Course | ❌ | ✅ | ✅ | ✅ |
| Delete Any Course | ❌ | ❌ | ✅ | ✅ |
| Manage Modules/Content | ❌ | ✅ | ✅ | ✅ |
| Track Progress | ✅ | ❌ | ❌ | ❌ |

---

## 🧪 Testing Results

### ✅ All Tests Passed

1. **Categories**
   - ✅ Get all categories with subcategories
   - ✅ Proper hierarchical structure

2. **Courses**
   - ✅ Browse all published courses
   - ✅ Pagination working
   - ✅ Get course by ID with modules
   - ✅ Enrollment working correctly
   - ✅ Enrollment count increments

3. **Enrollments**
   - ✅ Student can enroll in courses
   - ✅ Get my enrolled courses
   - ✅ Cannot enroll twice in same course

4. **Modules**
   - ✅ Get course modules with contents
   - ✅ Proper ordering by order_index

5. **Authentication**
   - ✅ Protected routes require authentication
   - ✅ Role-based authorization working
   - ✅ JWT tokens valid

---

## 📊 Database Statistics

**Current Data:**
- Categories: 18 (5 main + 13 subcategories)
- Courses: 1 (MSSQL Server Fundamentals)
- Modules: Multiple with video/document contents
- Enrollments: Active and tracking
- Users: Admin, Instructor, Students

---

## 🎯 Next Steps

### Recommended Additions:

1. **Course Reviews & Ratings**
   - Add review endpoints
   - Update average_rating calculation

2. **File Upload Integration**
   - Integrate Cloudinary service for thumbnails
   - Document upload functionality

3. **Email Notifications**
   - Send enrollment confirmation emails
   - Course completion notifications

4. **Search & Filtering**
   - Full-text search implementation
   - Advanced filtering options

5. **Course Prerequisites**
   - Implement prerequisite checking
   - Prevent enrollment if prerequisites not met

---

## 🔧 Services Created

### 1. Cloudinary Service (`/services/storage/cloudinaryService.js`)

**Methods:**
- `uploadImage(fileBuffer, folder, fileName)` - Upload images with optimization
- `uploadDocument(fileBuffer, folder, fileName)` - Upload PDF, DOC, etc.
- `uploadVideo(fileBuffer, folder, fileName)` - Upload videos
- `deleteFile(publicId, resourceType)` - Delete files
- `getOptimizedImageUrl(publicId, options)` - Get optimized URLs
- `uploadFromUrl(url, folder)` - Upload from URL
- `getFileDetails(publicId, resourceType)` - Get file metadata

**Configuration:** Uses environment variables for Cloudinary credentials

### 2. Email Service (`/services/email/emailService.js`)

**Methods:**
- `sendEmail(options)` - Generic email sender
- `sendWelcomeEmail(email, name)` - Welcome new users
- `sendPasswordResetEmail(email, name, resetToken)` - Password reset
- `sendEnrollmentConfirmation(email, name, course)` - Course enrollment
- `sendCourseCompletionEmail(email, name, course, certificateUrl)` - Course completion
- `sendTestAssignmentEmail(email, name, test)` - Test notifications
- `verifyConnection()` - Test email configuration

**Configuration:** Uses Nodemailer with Gmail SMTP

---

## 📝 Notes

- All endpoints follow consistent API response format
- Proper error handling implemented
- Logging for all major operations
- Soft delete for courses (archived status)
- Progress tracking calculates course completion percentage
- JWT authentication for protected routes
- Role-based authorization middleware

---

**Page Innovations LMS - The Leading Remote DBA Service Provider**
**Documentation Version:** 1.0
**Last Updated:** December 13, 2025
