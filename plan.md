# 🎓 **LEARNING MANAGEMENT SYSTEM (LMS)**
## Complete MVP Development Blueprint
### *For Database Training Excellence*

---

**Project Name:** Ternary Technologies LMS  
**Version:** 1.0 MVP  
**Timeline:** 2 Weeks (14 Days)  
**Developer:** Anointed_Excel (Full-Stack Developer)  
**Target Launch:** January 2025

---

## 📋 **TABLE OF CONTENTS**

1. [Executive Summary](#executive-summary)
2. [Vision & Scalability](#vision-scalability)
3. [Core Features (MVP)](#core-features)
4. [System Architecture](#system-architecture)
5. [Database Design](#database-design)
6. [API Documentation](#api-documentation)
7. [Frontend Pages & Components](#frontend-pages)
8. [Development Timeline](#development-timeline)
9. [Deployment Strategy](#deployment-strategy)
10. [Testing & Quality Assurance](#testing)
11. [Future Enhancements](#future-enhancements)

---

<a name="executive-summary"></a>
## 🎯 **EXECUTIVE SUMMARY**

This Learning Management System transforms traditional database training into a modern, interactive digital experience. Built specifically for MSSQL Server training with scalability for PostgreSQL, MySQL, and beyond, the platform positions your training institution as a tech-forward leader in the Nigerian education market.

### **Key Value Propositions**

**For Students:**
- Learn at their own pace with structured courses
- Practice with real interview questions
- Earn verifiable certificates
- Track progress with visual dashboards
- Access materials offline (critical for Nigeria)

**For Instructors:**
- Easy course creation and management
- Assign and grade tests efficiently
- Track student performance
- Communicate through announcements
- Build a comprehensive question bank

**For Business:**
- Scalable from 10 to 10,000 students
- Multi-category support (expand beyond databases)
- Professional brand presence
- Student retention through engagement
- Competitive advantage over traditional training

### **MVP Success Metrics**

- ✅ 100% course completion tracking
- ✅ Automated exam grading system
- ✅ Certificate generation on completion
- ✅ Mobile-responsive on all devicesi th
- ✅ Zero video hosting costs (YouTube integration)
- ✅ $0 monthly operating cost (free tier hosting)

---

<a name="vision-scalability"></a>
## 🚀 **VISION & SCALABILITY ARCHITECTURE**

### **Current Focus: Database Training**
Starting with MSSQL Server training, the platform is architected to scale horizontally and vertically.

### **Scalability Design Principles**

#### **1. Multi-Database Support**
```javascript
// Course categories are dynamic, not hardcoded
const COURSE_CATEGORIES = {
  "Database Administration": {
    subcategories: ["MSSQL Server", "PostgreSQL", "MySQL", "Oracle", "MongoDB"],
    icon: "🗄️",
    color: "#3B82F6"
  },
  "Software Development": {
    subcategories: ["Frontend", "Backend", "Mobile", "Full-Stack"],
    icon: "💻",
    color: "#10B981"
  },
  "Data Analytics": {
    subcategories: ["Power BI", "Tableau", "Python Analytics", "Excel"],
    icon: "📊",
    color: "#F59E0B"
  },
  "Graphic Design": {
    subcategories: ["Photoshop", "Illustrator", "Figma", "UI/UX"],
    icon: "🎨",
    color: "#EC4899"
  }
  // Easily add more categories as business grows
};
```

#### **2. Database Schema Design**
```sql
-- Flexible categorization system
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    parent_category_id INT NULL, -- For subcategories
    icon VARCHAR(50),
    color VARCHAR(20),
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(id)
);

-- Example data:
-- id | name                    | parent_category_id
-- 1  | Database Administration | NULL
-- 2  | MSSQL Server           | 1
-- 3  | PostgreSQL             | 1
-- 4  | Software Development    | NULL
-- 5  | Frontend Development    | 4
```

#### **3. Content Type Flexibility**
The system supports multiple content delivery methods:
- **Video Tutorials** (YouTube embedded)
- **Written Articles** (Rich text with code snippets)
- **PDF Documents** (Downloadable guides)
- **Interactive Quizzes** (Self-assessment)
- **Live Class Links** (Future: Zoom integration)
- **Code Exercises** (Future: In-browser SQL editor)

#### **4. Multi-Instructor Support**
```sql
-- Each instructor can manage their own courses
CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT NOT NULL, -- Links to flexible categories
    instructor_id INT NOT NULL, -- Multiple instructors supported
    -- ... other fields
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (instructor_id) REFERENCES users(id)
);
```

### **Growth Roadmap**

| Phase | Focus | Timeline |
|-------|-------|----------|
| **Phase 1 (MVP)** | MSSQL Server Training | Week 1-2 |
| **Phase 2** | Add PostgreSQL & MySQL | Month 2 |
| **Phase 3** | Expand to Data Analytics | Month 3 |
| **Phase 4** | Add Software Development | Month 4-5 |
| **Phase 5** | Graphic Design Courses | Month 6 |

---

<a name="core-features"></a>
## ⭐ **CORE FEATURES (MVP)**

### **Feature Set Overview**

```
🔐 AUTHENTICATION & SECURITY
├── Email/Password Registration & Login
├── Google OAuth Integration
├── Password Reset via Email
├── Role-Based Access Control (Student, Instructor, Admin, Super Admin)
└── JWT Token Authentication

📊 DASHBOARDS
├── Student Dashboard (Progress Overview)
├── Instructor Dashboard (Course Management)
├── Admin Dashboard (Platform Analytics)
└── Super Admin Dashboard (Full Control)

📚 COURSE MANAGEMENT
├── Create/Edit/Delete Courses
├── Add Video Content (YouTube Integration)
├── Upload Documents (PDF, DOCX, PPTX)
├── Rich Text Articles (Knowledge Center)
├── Course Categorization & Filtering
├── Course Prerequisites System
└── Course Progress Tracking

🎥 VIDEO LEARNING
├── YouTube Embedded Player
├── Progress Tracking (90% = Complete)
├── Playback Controls (Speed, Quality)
├── Resume from Last Position
└── Mobile-Optimized Viewing

📝 KNOWLEDGE CENTER
├── Searchable Articles Library
├── Category & Tag Filtering
├── Rich Text Editor (Code Syntax Highlighting)
├── Bookmark Articles
├── Reading Time Estimation
└── Related Articles Suggestions

🧪 COMPREHENSIVE EXAM SYSTEM
├── Student Self-Generated Practice Tests
├── Instructor-Assigned Tests
├── Question Bank with Categories
├── Multiple Question Types (MCQ, True/False, Fill-in-Blank)
├── Auto-Grading System
├── Instant Results & Review
├── Retake Functionality
├── Exam History & Analytics
└── Timed & Untimed Exams

📈 PROGRESS TRACKING
├── Course Completion Percentage
├── Lesson Completion Tracking
├── Exam Scores & History
├── Learning Streak Counter
├── Time Spent Analytics
└── Visual Progress Indicators

🎓 CERTIFICATES
├── Auto-Generated Completion Certificates
├── Unique Certificate IDs
├── PDF Download
├── LinkedIn Sharing
└── Certificate Verification System

👥 USER MANAGEMENT
├── View All Users (Admin)
├── Create/Edit/Delete Users
├── Assign Roles & Permissions
├── Suspend/Activate Accounts
└── User Activity Logs

🔖 STUDENT ENGAGEMENT
├── Bookmark Lessons with Notes
├── Download Course Materials
├── Course Reviews & Ratings
├── Q&A on Lessons (Instructor Response)
└── Announcement System

🤖 SUPPORT & HELP
├── FAQ Chatbot (Keyword-Based)
├── Contact Support Form
├── Email Notifications
└── In-App Notifications

🎨 UI/UX EXCELLENCE
├── Fully Responsive Design (Mobile, Tablet, Desktop)
├── Modern, Professional Interface
├── Loading States & Animations
├── Error Handling & Validation
├── Toast Notifications
└── Accessibility Features
```

---

<a name="system-architecture"></a>
## 🏗️ **SYSTEM ARCHITECTURE**

### **Technology Stack**

#### **Frontend**
```javascript
Framework:        React.js 18+
Routing:          React Router v6
State Management: React Context API + Custom Hooks
UI Framework:     Tailwind CSS 3+
Component Library: shadcn/ui (Radix UI primitives)
Form Handling:    React Hook Form + Zod validation
HTTP Client:      Axios
Video Player:     react-player (for YouTube)
Rich Text Editor: TipTap or React Quill
Charts:           Recharts (for analytics)
Icons:            Lucide React
Date Handling:    date-fns
Deployment:       Vercel (Free Tier)
```

#### **Backend**
```javascript
Runtime:          Node.js 18+ LTS
Framework:        Express.js
Authentication:   JWT + Passport.js
OAuth:            Google OAuth 2.0
Database ORM:     Sequelize (supports MySQL & MSSQL)
File Upload:      Multer
Cloud Storage:    Cloudinary (for images/documents)
Email Service:    Nodemailer + Gmail SMTP
Security:         helmet, cors, express-rate-limit, bcrypt
Validation:       Joi
Environment:      dotenv
Logging:          Winston
Deployment:       Railway or Render (Free Tier)
```

#### **Database**
```javascript
Primary:          MySQL 8+ (MVP)
Migration Path:   MSSQL Server (Production)
ORM:              Sequelize (seamless migration)
Backup:           Automated daily backups
```

#### **DevOps & Tools**
```javascript
Version Control:  Git + GitHub
API Testing:      Postman
Code Quality:     ESLint + Prettier
Documentation:    Swagger/OpenAPI (future)
Monitoring:       Basic logging (Winston)
```

### **System Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Desktop │  │  Tablet  │  │  Mobile  │  │   PWA    │   │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘   │
│        └──────────────┴─────────────┴──────────────┘        │
│                            │                                │
│                      React Frontend                         │
│                      (Vercel CDN)                           │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS/REST API
┌─────────────────────────────┴───────────────────────────────┐
│                   APPLICATION LAYER                         │
│                                                             │
│  ┌───────────────────────────────────────────────────┐    │
│  │          Express.js API Server                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐         │    │
│  │  │   Auth   │ │ Courses  │ │  Exams   │ [More]  │    │
│  │  │ Service  │ │ Service  │ │ Service  │         │    │
│  │  └──────────┘ └──────────┘ └──────────┘         │    │
│  └───────────────────────────────────────────────────┘    │
│                       (Railway/Render)                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   DATABASE   │    │   STORAGE    │    │  EXTERNAL    │
│              │    │              │    │   SERVICES   │
│    MySQL     │    │  Cloudinary  │    │              │
│   (Railway)  │    │ (Images/Docs)│    │ Google OAuth │
│              │    │              │    │   YouTube    │
│              │    │              │    │ Gmail SMTP   │
└──────────────┘    └──────────────┘    └──────────────┘
```

### **API Architecture**

```
/api
├── /auth
│   ├── POST   /register
│   ├── POST   /login
│   ├── POST   /google
│   ├── POST   /forgot-password
│   ├── POST   /reset-password
│   ├── GET    /me
│   └── POST   /logout
│
├── /users
│   ├── GET    /users (Admin)
│   ├── GET    /users/:id
│   ├── PUT    /users/:id
│   ├── DELETE /users/:id
│   └── POST   /users/assign-role (Super Admin)
│
├── /categories
│   ├── GET    /categories
│   ├── POST   /categories (Admin)
│   ├── PUT    /categories/:id
│   └── DELETE /categories/:id
│
├── /courses
│   ├── GET    /courses
│   ├── GET    /courses/:id
│   ├── POST   /courses (Instructor)
│   ├── PUT    /courses/:id
│   ├── DELETE /courses/:id
│   ├── POST   /courses/:id/enroll
│   ├── GET    /my-courses
│   └── POST   /courses/:id/review
│
├── /modules
│   ├── POST   /modules
│   ├── PUT    /modules/:id
│   ├── DELETE /modules/:id
│   └── PUT    /modules/reorder
│
├── /content
│   ├── POST   /content (Add video/doc/article)
│   ├── PUT    /content/:id
│   ├── DELETE /content/:id
│   ├── POST   /content/:id/complete
│   └── GET    /content/:id/progress
│
├── /knowledge
│   ├── GET    /knowledge
│   ├── GET    /knowledge/:id
│   ├── POST   /knowledge (Instructor)
│   ├── PUT    /knowledge/:id
│   ├── DELETE /knowledge/:id
│   └── POST   /knowledge/:id/bookmark
│
├── /questions
│   ├── GET    /questions
│   ├── GET    /questions/:id
│   ├── POST   /questions (Instructor)
│   ├── PUT    /questions/:id
│   ├── DELETE /questions/:id
│   └── POST   /questions/bulk-upload
│
├── /practice-tests
│   ├── POST   /practice-tests/generate
│   ├── GET    /practice-tests/:attemptId
│   ├── POST   /practice-tests/:attemptId/submit
│   ├── GET    /practice-tests/:attemptId/results
│   └── GET    /practice-tests/history
│
├── /assigned-tests
│   ├── POST   /assigned-tests (Instructor)
│   ├── PUT    /assigned-tests/:id
│   ├── POST   /assigned-tests/:id/assign
│   ├── GET    /my-assignments
│   ├── POST   /assigned-tests/:id/start
│   ├── POST   /assigned-tests/:id/submit
│   └── GET    /assigned-tests/:id/results
│
├── /certificates
│   ├── GET    /certificates/:id
│   ├── GET    /my-certificates
│   └── GET    /certificates/:id/verify
│
├── /announcements
│   ├── GET    /announcements/:courseId
│   └── POST   /announcements (Instructor)
│
├── /analytics
│   ├── GET    /analytics/student
│   ├── GET    /analytics/instructor
│   └── GET    /analytics/platform (Admin)
│
└── /support
    ├── POST   /support/contact
    └── POST   /support/chatbot
```

---

<a name="database-design"></a>
## 🗄️ **DATABASE DESIGN (Complete Schema)**

### **Core Tables**

#### **1. Users & Authentication**
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULL if Google OAuth only
    google_id VARCHAR(255) UNIQUE,
    
    role ENUM('student', 'instructor', 'admin', 'super_admin') DEFAULT 'student',
    
    profile_picture VARCHAR(500),
    phone VARCHAR(20),
    bio TEXT,
    
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role)
);

CREATE TABLE password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **2. Categories & Course Structure**
```sql
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    parent_category_id INT NULL,
    icon VARCHAR(50),
    color VARCHAR(20),
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(id),
    INDEX idx_parent (parent_category_id),
    INDEX idx_active (is_active)
);

CREATE TABLE courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    thumbnail VARCHAR(500),
    
    category_id INT NOT NULL,
    instructor_id INT NOT NULL,
    
    duration_hours INT,
    difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    
    -- Ratings
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    
    -- Stats
    enrollment_count INT DEFAULT 0,
    completion_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (instructor_id) REFERENCES users(id),
    
    INDEX idx_category (category_id),
    INDEX idx_instructor (instructor_id),
    INDEX idx_status (status),
    INDEX idx_slug (slug)
);

CREATE TABLE course_prerequisites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    prerequisite_course_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_prerequisite (course_id, prerequisite_course_id)
);

CREATE TABLE course_modules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_order (course_id, order_index)
);

CREATE TABLE module_contents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    module_id INT NOT NULL,
    content_type ENUM('video', 'document', 'article') NOT NULL,
    title VARCHAR(255) NOT NULL,
    
    -- Video (YouTube)
    youtube_url VARCHAR(500),
    youtube_video_id VARCHAR(20),
    
    -- Document
    document_url VARCHAR(500),
    document_type VARCHAR(20), -- pdf, docx, pptx
    file_size_mb DECIMAL(10,2),
    
    -- Article
    article_content TEXT,
    
    order_index INT NOT NULL,
    duration_minutes INT,
    is_preview BOOLEAN DEFAULT false, -- Allow non-enrolled students to preview
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
    INDEX idx_module_order (module_id, order_index)
);
```

#### **3. Enrollments & Progress**
```sql
CREATE TABLE enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, course_id),
    INDEX idx_student (student_id),
    INDEX idx_course (course_id)
);

CREATE TABLE content_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    content_id INT NOT NULL,
    
    completed BOOLEAN DEFAULT false,
    watch_time_seconds INT DEFAULT 0,
    last_position_seconds INT DEFAULT 0, -- Resume video from here
    
    completed_at TIMESTAMP NULL,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES module_contents(id) ON DELETE CASCADE,
    UNIQUE KEY unique_progress (student_id, content_id)
);
```

#### **4. Question Bank System**
```sql
CREATE TABLE question_bank (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false', 'fill_blank') NOT NULL,
    
    -- For multiple choice (JSON array)
    options JSON, -- ["Option A", "Option B", "Option C", "Option D"]
    
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    
    -- Categorization
    category_id INT NOT NULL,
    subcategory VARCHAR(100),
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    tags JSON, -- ["interview", "performance", "joins"]
    
    -- Metadata
    marks INT DEFAULT 1,
    time_limit_seconds INT,
    
    -- Analytics
    times_used INT DEFAULT 0,
    times_correct INT DEFAULT 0,
    times_incorrect INT DEFAULT 0,
    average_time_seconds INT DEFAULT 0,
    
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    INDEX idx_category (category_id),
    INDEX idx_difficulty (difficulty),
    FULLTEXT idx_question_text (question_text)
);
```

#### **5. Practice Tests (Student Self-Generated)**
```sql
CREATE TABLE practice_test_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    
    question_count INT NOT NULL,
    time_limit_minutes INT,
    difficulty VARCHAR(20), -- 'easy', 'medium', 'hard', 'mixed'
    
    -- Selected categories (JSON array)
    categories JSON,
    
    score INT,
    total_marks INT,
    percentage DECIMAL(5,2),
    
    time_taken_seconds INT,
    
    status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
    
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_status (status)
);

CREATE TABLE practice_test_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    order_index INT,
    FOREIGN KEY (attempt_id) REFERENCES practice_test_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(id)
);

CREATE TABLE practice_test_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    student_answer TEXT,
    is_correct BOOLEAN,
    marks_awarded INT,
    time_taken_seconds INT,
    FOREIGN KEY (attempt_id) REFERENCES practice_test_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(id)
);
```

#### **6. Assigned Tests (Instructor Created)**
```sql
CREATE TABLE assigned_tests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    test_name VARCHAR(255) NOT NULL,
    test_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "INT-001"
    description TEXT,
    
    instructor_id INT NOT NULL,
    course_id INT, -- Optional: link to specific course
    
    -- Configuration
    total_questions INT NOT NULL,
    total_marks INT NOT NULL,
    time_limit_minutes INT,
    passing_score INT DEFAULT 70,
    
    -- Scheduling
    start_date DATETIME,
    end_date DATETIME,
    
    -- Settings
    show_results_immediately BOOLEAN DEFAULT true,
    allow_retake BOOLEAN DEFAULT false,
    max_attempts INT DEFAULT 1,
    randomize_questions BOOLEAN DEFAULT true,
    randomize_options BOOLEAN DEFAULT true,
    
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (instructor_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    
    INDEX idx_test_code (test_code),
    INDEX idx_instructor (instructor_id)
);

CREATE TABLE assigned_test_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    test_id INT NOT NULL,
    question_id INT NOT NULL,
    order_index INT,
    FOREIGN KEY (test_id) REFERENCES assigned_tests(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(id)
);

CREATE TABLE test_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    test_id INT NOT NULL,
    student_id INT NOT NULL,
    
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME,
    
    status ENUM('pending', 'in_progress', 'completed', 'overdue') DEFAULT 'pending',
    
    FOREIGN KEY (test_id) REFERENCES assigned_tests(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (test_id, student_id)
);

CREATE TABLE assigned_test_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    test_id INT NOT NULL,
    
    attempt_number INT DEFAULT 1,
    
    score INT,
    total_marks INT,
    percentage DECIMAL(5,2),
    passed BOOLEAN,
    
    time_taken_seconds INT,
    
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (assignment_id) REFERENCES test_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (test_id) REFERENCES assigned_tests(id)
);

CREATE TABLE assigned_test_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    attempt_id INT NOT NULL,
    question_id INT NOT NULL,
    student_answer TEXT,
    is_correct BOOLEAN,
    marks_awarded INT,
    FOREIGN KEY (attempt_id) REFERENCES assigned_test_attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES question_bank(id)
);
```

#### **7. Knowledge Center**
```sql
CREATE TABLE knowledge_articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    
    category_id INT NOT NULL,
    author_id INT NOT NULL,
    
    tags JSON, -- ["sql", "performance", "indexing"]
    
    reading_time_minutes INT,
    views INT DEFAULT 0,
    
    status ENUM('draft', 'published') DEFAULT 'draft',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (author_id) REFERENCES users(id),
    
    INDEX idx_category (category_id),
    INDEX idx_slug (slug),
    FULLTEXT idx_content (title, content)
);

CREATE TABLE article_bookmarks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    article_id INT NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (article_id) REFERENCES knowledge_articles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_bookmark (student_id, article_id)
);
```

#### **8. Student Engagement**
```sql
CREATE TABLE lesson_bookmarks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    content_id INT NOT NULL,
    note TEXT,
    timestamp_seconds INT, -- For videos: bookmark at specific time
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (content_id) REFERENCES module_contents(id) ON DELETE CASCADE
);

CREATE TABLE lesson_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content_id INT NOT NULL,
    student_id INT NOT NULL,
    question_text TEXT NOT NULL,
    timestamp_seconds INT, -- For videos
    is_answered BOOLEAN DEFAULT false,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES module_contents(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE TABLE question_replies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT NOT NULL,
    user_id INT NOT NULL,
    reply_text TEXT NOT NULL,
    is_instructor_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (question_id) REFERENCES lesson_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE course_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    helpful_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id),
    UNIQUE KEY unique_review (course_id, student_id)
);
```

#### **9. Certificates**
```sql
CREATE TABLE certificates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    certificate_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., "DBA-2025-001234"
    
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    
    student_name VARCHAR(255) NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    
    issue_date DATE NOT NULL,
    
    certificate_url VARCHAR(500), -- PDF stored in Cloudinary
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    
    INDEX idx_certificate_id (certificate_id),
    INDEX idx_student (student_id)
);
```

#### **10. Announcements**
```sql
CREATE TABLE course_announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    instructor_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (instructor_id) REFERENCES users(id)
);
```

#### **11. System & Analytics**
```sql
CREATE TABLE activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'login', 'course_complete', 'exam_taken'
    entity_type VARCHAR(50), -- 'course', 'exam', 'article'
    entity_id INT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_action (user_id, action),
    INDEX idx_created (created_at)
);

CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'exam_graded', 'course_announcement', 'certificate_issued'
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read)
);
```

### **Database Indexes Summary**
```sql
-- Performance optimization indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_content_progress_student ON content_progress(student_id);
CREATE INDEX idx_question_bank_category ON question_bank(category_id);

-- Full-text search indexes
CREATE FULLTEXT INDEX idx_courses_search ON courses(title, description);
CREATE FULLTEXT INDEX idx_articles_search ON knowledge_articles(title, content);
CREATE FULLTEXT INDEX idx_questions_search ON question_bank(question_text);
```

---

<a name="api-documentation"></a>
## 📡 **COMPLETE API DOCUMENTATION**

### **Authentication Endpoints**

#### **1. Register New User**
```
POST /api/auth/register

Request Body:
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "student" // Optional, defaults to 'student'
}

Success Response (201):
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "profile_picture": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

Error Response (400):
{
  "success": false,
  "message": "Email already exists"
}
```

#### **2. Login**
```
POST /api/auth/login

Request Body:
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Success Response (200):
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "...",
    "refreshToken": "..."
  }
}
```

#### **3. Google OAuth Login**
```
POST /api/auth/google

Request Body:
{
  "googleToken": "google-oauth-token-here"
}

Success Response (200):
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "...",
    "refreshToken": "...",
    "isNewUser": false
  }
}
```

#### **4. Forgot Password**
```
POST /api/auth/forgot-password

Request Body:
{
  "email": "john@example.com"
}

Success Response (200):
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

#### **5. Reset Password**
```
POST /api/auth/reset-password

Request Body:
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}

Success Response (200):
{
  "success": true,
  "message": "Password reset successful"
}
```

#### **6. Get Current User**
```
GET /api/auth/me

Headers:
Authorization: Bearer <token>

Success Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "profile_picture": "https://...",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  }
}
```

### **Course Management Endpoints**

#### **1. Get All Courses (Public)**
```
GET /api/courses?category=1&difficulty=beginner&search=sql&page=1&limit=12

Query Parameters:
- category (optional): Filter by category ID
- difficulty (optional): 'beginner', 'intermediate', 'advanced'
- search (optional): Search in title and description
- page (optional): Page number (default: 1)
- limit (optional): Items per page (default: 12)

Success Response (200):
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": 1,
        "title": "MSSQL Server Fundamentals",
        "slug": "mssql-server-fundamentals",
        "description": "Learn the basics...",
        "thumbnail": "https://...",
        "category": {
          "id": 1,
          "name": "Database Administration"
        },
        "instructor": {
          "id": 2,
          "full_name": "Instructor Name",
          "profile_picture": "https://..."
        },
        "duration_hours": 20,
        "difficulty": "beginner",
        "average_rating": 4.8,
        "total_reviews": 156,
        "enrollment_count": 1234,
        "status": "published"
      }
      // ... more courses
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 58,
      "itemsPerPage": 12
    }
  }
}
```

#### **2. Get Course by ID**
```
GET /api/courses/:id

Success Response (200):
{
  "success": true,
  "data": {
    "course": {
      "id": 1,
      "title": "MSSQL Server Fundamentals",
      "description": "Comprehensive course...",
      "thumbnail": "https://...",
      "category": { /* category object */ },
      "instructor": { /* instructor object */ },
      "duration_hours": 20,
      "difficulty": "beginner",
      "average_rating": 4.8,
      "total_reviews": 156,
      "enrollment_count": 1234,
      "modules": [
        {
          "id": 1,
          "title": "Introduction to MSSQL",
          "order_index": 1,
          "contents": [
            {
              "id": 1,
              "content_type": "video",
              "title": "What is MSSQL Server?",
              "youtube_video_id": "abc123",
              "duration_minutes": 15,
              "order_index": 1
            }
            // ... more contents
          ]
        }
        // ... more modules
      ],
      "prerequisites": [
        {
          "id": 5,
          "title": "SQL Basics",
          "slug": "sql-basics"
        }
      ],
      "reviews": [
        {
          "id": 1,
          "student": { /* student info */ },
          "rating": 5,
          "review_text": "Excellent course!",
          "created_at": "2025-01-10"
        }
        // ... more reviews
      ]
    },
    "isEnrolled": false, // If user is logged in
    "progress": null // If enrolled
  }
}
```

#### **3. Create Course (Instructor/Admin)**
```
POST /api/courses

Headers:
Authorization: Bearer <token>

Request Body:
{
  "title": "Advanced SQL Optimization",
  "description": "Master query optimization...",
  "category_id": 1,
  "duration_hours": 30,
  "difficulty": "advanced",
  "thumbnail": "base64-or-url",
  "status": "draft" // or "published"
}

Success Response (201):
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "course": { /* created course object */ }
  }
}
```

#### **4. Enroll in Course**
```
POST /api/courses/:id/enroll

Headers:
Authorization: Bearer <token>

Success Response (201):
{
  "success": true,
  "message": "Successfully enrolled in course",
  "data": {
    "enrollment": {
      "id": 123,
      "course_id": 1,
      "student_id": 45,
      "enrollment_date": "2025-01-15T10:30:00.000Z",
      "progress_percentage": 0
    }
  }
}

Error Response (400):
{
  "success": false,
  "message": "Already enrolled in this course"
}
```

#### **5. Get My Courses (Enrolled)**
```
GET /api/my-courses?status=in_progress

Headers:
Authorization: Bearer <token>

Query Parameters:
- status (optional): 'in_progress', 'completed', 'all'

Success Response (200):
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": 1,
        "title": "MSSQL Server Fundamentals",
        "thumbnail": "https://...",
        "instructor": { /* instructor info */ },
        "enrollment_date": "2025-01-10",
        "last_accessed": "2025-01-14",
        "progress_percentage": 45.5,
        "completed_at": null
      }
      // ... more courses
    ]
  }
}
```

### **Content & Progress Endpoints**

#### **1. Mark Content as Complete**
```
POST /api/content/:id/complete

Headers:
Authorization: Bearer <token>

Request Body:
{
  "watch_time_seconds": 890, // For videos
  "last_position_seconds": 900 // For resume
}

Success Response (200):
{
  "success": true,
  "message": "Content marked as complete",
  "data": {
    "progress": {
      "content_id": 15,
      "completed": true,
      "completed_at": "2025-01-15T14:30:00.000Z"
    },
    "courseProgress": {
      "course_id": 1,
      "progress_percentage": 52.3
    }
  }
}
```

#### **2. Update Video Progress**
```
POST /api/content/:id/progress

Headers:
Authorization: Bearer <token>

Request Body:
{
  "watch_time_seconds": 450,
  "last_position_seconds": 450
}

Success Response (200):
{
  "success": true,
  "message": "Progress saved"
}
```

### **Question Bank Endpoints**

#### **1. Browse Question Bank**
```
GET /api/questions?category=1&difficulty=medium&search=join&page=1

Headers:
Authorization: Bearer <token> (Instructor/Admin)

Success Response (200):
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": 1,
        "question_text": "What is the difference between INNER JOIN and LEFT JOIN?",
        "question_type": "multiple_choice",
        "options": ["A) No difference", "B) INNER returns only matches...", "C) ...", "D) ..."],
        "correct_answer": "B",
        "explanation": "INNER JOIN returns...",
        "category": { /* category info */ },
        "subcategory": "Joins",
        "difficulty": "medium",
        "tags": ["joins", "interview"],
        "times_used": 45,
        "times_correct": 32,
        "times_incorrect": 13
      }
      // ... more questions
    ],
    "pagination": { /* pagination info */ }
  }
}
```

#### **2. Create Question (Instructor/Admin)**
```
POST /api/questions

Headers:
Authorization: Bearer <token>

Request Body:
{
  "question_text": "Explain the purpose of database normalization.",
  "question_type": "multiple_choice",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "B",
  "explanation": "Normalization reduces redundancy...",
  "category_id": 1,
  "subcategory": "Database Design",
  "difficulty": "medium",
  "tags": ["normalization", "design", "interview"],
  "marks": 2
}

Success Response (201):
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "question": { /* created question object */ }
  }
}
```

#### **3. Bulk Upload Questions**
```
POST /api/questions/bulk-upload

Headers:
Authorization: Bearer <token>
Content-Type: multipart/form-data

Request Body (FormData):
- file: CSV/Excel file

CSV Format:
question_text,question_type,options,correct_answer,explanation,category_id,subcategory,difficulty,tags
"What is...","multiple_choice","A) ...|B) ...|C) ...|D) ...","B","Explanation...","1","SQL Basics","easy","sql,basics"

Success Response (201):
{
  "success": true,
  "message": "45 questions uploaded successfully",
  "data": {
    "uploadedCount": 45,
    "failedCount": 2,
    "errors": [
      { "row": 12, "error": "Invalid category_id" },
      { "row": 28, "error": "Missing correct_answer" }
    ]
  }
}
```

### **Practice Test Endpoints (Student Self-Generated)**

#### **1. Generate Practice Test**
```
POST /api/practice-tests/generate

Headers:
Authorization: Bearer <token>

Request Body:
{
  "categories": [1, 2], // Category IDs
  "difficulty": "mixed", // 'easy', 'medium', 'hard', 'mixed'
  "questionCount": 50,
  "timeLimit": 60 // minutes, null for untimed
}

Success Response (201):
{
  "success": true,
  "message": "Practice test generated",
  "data": {
    "attempt": {
      "id": 123,
      "question_count": 50,
      "time_limit_minutes": 60,
      "started_at": "2025-01-15T10:00:00.000Z"
    },
    "questions": [
      {
        "id": 45,
        "question_text": "What is the purpose of an index?",
        "question_type": "multiple_choice",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "marks": 1
        // Note: correct_answer NOT included yet
      }
      // ... 49 more questions
    ]
  }
}
```

#### **2. Submit Practice Test**
```
POST /api/practice-tests/:attemptId/submit

Headers:
Authorization: Bearer <token>

Request Body:
{
  "answers": [
    { "question_id": 45, "answer": "B" },
    { "question_id": 46, "answer": "A" },
    // ... all answers
  ],
  "time_taken_seconds": 3245
}

Success Response (200):
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "results": {
      "attempt_id": 123,
      "score": 42,
      "total_marks": 50,
      "percentage": 84.0,
      "time_taken_seconds": 3245,
      "correct_count": 42,
      "incorrect_count": 8,
      "completed_at": "2025-01-15T11:05:00.000Z"
    },
    "categoryBreakdown": [
      {
        "category": "SQL Fundamentals",
        "correct": 25,
        "total": 30,
        "percentage": 83.3
      },
      {
        "category": "Performance Tuning",
        "correct": 17,
        "total": 20,
        "percentage": 85.0
      }
    ]
  }
}
```

#### **3. Get Practice Test Results**
```
GET /api/practice-tests/:attemptId/results

Headers:
Authorization: Bearer <token>

Success Response (200):
{
  "success": true,
  "data": {
    "results": { /* same as submit response */ },
    "questions": [
      {
        "id": 45,
        "question_text": "What is the purpose of an index?",
        "question_type": "multiple_choice",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correct_answer": "B",
        "explanation": "Indexes speed up data retrieval...",
        "student_answer": "B",
        "is_correct": true,
        "marks_awarded": 1
      },
      {
        "id": 46,
        "question_text": "What is normalization?",
        // ...
        "student_answer": "A",
        "is_correct": false,
        "marks_awarded": 0
      }
      // ... all questions with answers
    ]
  }
}
```

#### **4. Get Practice Test History**
```
GET /api/practice-tests/history?page=1&limit=10

Headers:
Authorization: Bearer <token>

Success Response (200):
{
  "success": true,
  "data": {
    "attempts": [
      {
        "id": 123,
        "question_count": 50,
        "score": 42,
        "percentage": 84.0,
        "time_taken_seconds": 3245,
        "categories": ["SQL Fundamentals", "Performance Tuning"],
        "difficulty": "mixed",
        "completed_at": "2025-01-15T11:05:00.000Z"
      }
      // ... more attempts
    ],
    "stats": {
      "totalAttempts": 15,
      "averageScore": 78.5,
      "bestScore": 96.0,
      "totalQuestionsAnswered": 750
    }
  }
}
```

### **Assigned Test Endpoints (Instructor)**

#### **1. Create Assigned Test**
```
POST /api/assigned-tests

Headers:
Authorization: Bearer <token> (Instructor/Admin)

Request Body:
{
  "test_name": "Final Exam - MSSQL Fundamentals",
  "test_code": "FINAL-001",
  "description": "This exam covers all topics...",
  "course_id": 1, // optional
  "total_questions": 50,
  "time_limit_minutes": 90,
  "passing_score": 70,
  "start_date": "2025-01-20T09:00:00Z",
  "end_date": "2025-01-25T23:59:59Z",
  "show_results_immediately": true,
  "allow_retake": false,
  "max_attempts": 1,
  "randomize_questions": true,
  "randomize_options": true,
  "status": "draft" // or "published"
}

Success Response (201):
{
  "success": true,
  "message": "Test created successfully",
  "data": {
    "test": { /* created test object */ }
  }
}
```

#### **2. Add Questions to Assigned Test**
```
POST /api/assigned-tests/:id/questions

Headers:
Authorization: Bearer <token>

Request Body:
{
  "question_ids": [1, 5, 12, 23, 34, 45, ...] // Array of question IDs
}

Success Response (200):
{
  "success": true,
  "message": "50 questions added to test"
}
```

#### **3. Assign Test to Students**
```
POST /api/assigned-tests/:id/assign

Headers:
Authorization: Bearer <token>

Request Body:
{
  "student_ids": [10, 15, 23, 45], // Specific students
  // OR
  "assign_to": "all_course_students", // All students in course
  "course_id": 1, // Required if assign_to is "all_course_students"
  
  "due_date": "2025-01-25T23:59:59Z",
  "send_email_notification": true
}

Success Response (200):
{
  "success": true,
  "message": "Test assigned to 4 students",
  "data": {
    "assignedCount": 4,
    "assignments": [
      {
        "id": 1,
        "test_id": 5,
        "student_id": 10,
        "due_date": "2025-01-25T23:59:59Z",
        "status": "pending"
      }
      // ... more assignments
    ]
  }
}
```

#### **4. Get My Assigned Tests (Student)**
```
GET /api/my-assignments?status=pending

Headers:
Authorization: Bearer <token>

Query Parameters:
- status (optional): 'pending', 'in_progress', 'completed', 'overdue', 'all'

Success Response (200):
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": 1,
        "test": {
          "id": 5,
          "test_name": "Final Exam - MSSQL Fundamentals",
          "test_code": "FINAL-001",
          "description": "...",
          "total_questions": 50,
          "time_limit_minutes": 90,
          "passing_score": 70
        },
        "assigned_date": "2025-01-15T10:00:00Z",
        "due_date": "2025-01-25T23:59:59Z",
        "status": "pending",
        "attempts": []
      }
      // ... more assignments
    ]
  }
}
```

#### **5. Start Assigned Test (Student)**
```
POST /api/assigned-tests/:id/start

Headers:
Authorization: Bearer <token>

Success Response (200):
{
  "success": true,
  "message": "Test started",
  "data": {
    "attempt": {
      "id": 45,
      "assignment_id": 1,
      "test_id": 5,
      "attempt_number": 1,
      "started_at": "2025-01-20T14:30:00Z"
    },
    "questions": [
      {
        "id": 12,
        "question_text": "...",
        "question_type": "multiple_choice",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "marks": 2
      }
      // ... 49 more questions (randomized if enabled)
    ],
    "timeLimit": 90 // minutes
  }
}
```

#### **6. Submit Assigned Test (Student)**
```
POST /api/assigned-tests/:id/submit

Headers:
Authorization: Bearer <token>

Request Body:
{
  "attempt_id": 45,
  "answers": [
    { "question_id": 12, "answer": "B" },
    // ... all answers
  ],
  "time_taken_seconds": 4567
}

Success Response (200):
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "results": {
      "attempt_id": 45,
      "score": 88,
      "total_marks": 100,
      "percentage": 88.0,
      "passed": true,
      "time_taken_seconds": 4567,
      "completed_at": "2025-01-20T16:06:00Z"
    }
  }
}
```

### **Certificate Endpoints**

#### **1. Get My Certificates**
```
GET /api/my-certificates

Headers:
Authorization: Bearer <token>

Success Response (200):
{
  "success": true,
  "data": {
    "certificates": [
      {
        "id": 1,
        "certificate_id": "DBA-2025-001234",
        "course": {
          "id": 1,
          "title": "MSSQL Server Fundamentals"
        },
        "student_name": "John Doe",
        "issue_date": "2025-01-15",
        "certificate_url": "https://res.cloudinary.com/.../certificate.pdf"
      }
      // ... more certificates
    ]
  }
}
```

#### **2. Verify Certificate**
```
GET /api/certificates/:certificateId/verify

Public endpoint (no auth required)

Success Response (200):
{
  "success": true,
  "data": {
    "valid": true,
    "certificate": {
      "certificate_id": "DBA-2025-001234",
      "student_name": "John Doe",
      "course_title": "MSSQL Server Fundamentals",
      "issue_date": "2025-01-15",
      "institution": "Ternary Technologies"
    }
  }
}
```

### **Knowledge Center Endpoints**

#### **1. Browse Articles**
```
GET /api/knowledge?category=1&search=indexing&page=1

Success Response (200):
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": 1,
        "title": "Understanding Database Indexes",
        "slug": "understanding-database-indexes",
        "excerpt": "Learn how indexes improve query performance...",
        "category": { /* category info */ },
        "author": { /* author info */ },
        "tags": ["indexing", "performance", "optimization"],
        "reading_time_minutes": 8,
        "views": 1234,
        "created_at": "2025-01-10"
      }
      // ... more articles
    ],
    "pagination": { /* pagination info */ }
  }
}
```

#### **2. Get Article by Slug**
```
GET /api/knowledge/:slug

Success Response (200):
{
  "success": true,
  "data": {
    "article": {
      "id": 1,
      "title": "Understanding Database Indexes",
      "content": "<p>Full article content with HTML...</p>",
      "category": { /* category info */ },
      "author": { /* author info */ },
      "tags": ["indexing", "performance"],
      "reading_time_minutes": 8,
      "views": 1235,
      "created_at": "2025-01-10",
      "updated_at": "2025-01-12"
    },
    "relatedArticles": [
      {
        "id": 5,
        "title": "Query Optimization Techniques",
        "slug": "query-optimization-techniques"
      }
      // ... more related articles
    ],
    "isBookmarked": false // If user is logged in
  }
}
```

#### **3. Bookmark Article**
```
POST /api/knowledge/:id/bookmark

Headers:
Authorization: Bearer <token>

Request Body (optional):
{
  "note": "Important article on indexing strategies"
}

Success Response (200):
{
  "success": true,
  "message": "Article bookmarked successfully"
}
```

### **Analytics Endpoints**

#### **1. Student Analytics**
```
GET /api/analytics/student

Headers:
Authorization: Bearer <token>

Success Response (200):
{
  "success": true,
  "data": {
    "overview": {
      "coursesEnrolled": 5,
      "coursesCompleted": 2,
      "totalTimeSpent": 3456, // minutes
      "averageExamScore": 82.5
    },
    "progressByCategory": [
      {
        "category": "Database Administration",
        "coursesEnrolled": 3,
        "coursesCompleted": 1,
        "averageProgress": 65.2
      }
      // ... more categories
    ],
    "recentActivity": [
      {
        "date": "2025-01-15",
        "action": "Completed lesson",
        "details": "Introduction to MSSQL"
      }
      // ... more activities
    ],
    "examHistory": [
      {
        "exam_name": "Midterm Exam",
        "score": 85,
        "percentage": 85.0,
        "passed": true,
        "date": "2025-01-12"
      }
      // ... more exams
    ]
  }
}
```

#### **2. Instructor Analytics**
```
GET /api/analytics/instructor

Headers:
Authorization: Bearer <token> (Instructor)

Success Response (200):
{
  "success": true,
  "data": {
    "overview": {
      "totalCourses": 3,
      "totalStudents": 245,
      "averageCourseRating": 4.7,
      "totalReviews": 89
    },
    "coursePerformance": [
      {
        "course_id": 1,
        "course_title": "MSSQL Server Fundamentals",
        "enrollments": 156,
        "completions": 98,
        "completion_rate": 62.8,
        "average_rating": 4.8,
        "average_exam_score": 78.5
      }
      // ... more courses
    ],
    "studentEngagement": {
      "activeThisWeek": 123,
      "newEnrollmentsThisMonth": 45,
      "averageTimePerStudent": 1234 // minutes
    }
  }
}
```

#### **3. Platform Analytics (Admin)**
```
GET /api/analytics/platform

Headers:
Authorization: Bearer <token> (Admin/Super Admin)

Success Response (200):
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1245,
      "totalCourses": 25,
      "totalEnrollments": 3456,
      "totalExamsCompleted": 8901
    },
    "userGrowth": [
      { "month": "2024-12", "newUsers": 145 },
      { "month": "2025-01", "newUsers": 198 }
    ],
    "popularCourses": [
      {
        "course_id": 1,
        "title": "MSSQL Server Fundamentals",
        "enrollments": 456,
        "rating": 4.8
      }
      // ... top 10 courses
    ],
    "categoryDistribution": [
      { "category": "Database Administration", "courseCount": 15, "enrollmentCount": 2345 },
      { "category": "Data Analytics", "courseCount": 8, "enrollmentCount": 890 }
    ]
  }
}
```

---

<a name="frontend-pages"></a>
## 🎨 **FRONTEND PAGES & COMPONENTS**

### **Page Structure**

```
src/
├── pages/
│   ├── public/
│   │   ├── Landing.jsx              // Homepage
│   │   ├── About.jsx                // About the platform
│   │   ├── CourseCatalog.jsx        // Browse courses
│   │   ├── CourseDetail.jsx         // Course detail page
│   │   ├── Login.jsx                // Login page
│   │   ├── Register.jsx             // Registration page
│   │   ├── ForgotPassword.jsx       // Password recovery
│   │   └── ResetPassword.jsx        // Password reset
│   │
│   ├── student/
│   │   ├── Dashboard.jsx            // Student dashboard
│   │   ├── MyCourses.jsx            // Enrolled courses
│   │   ├── CourseLearn.jsx          // Course learning page
│   │   ├── MyAssignments.jsx        // Assigned tests
│   │   ├── TakeTest.jsx             // Test interface
│   │   ├── TestResults.jsx          // Test results
│   │   ├── PracticeTests.jsx        // Practice test generator
│   │   ├── TestHistory.jsx          // Test history
│   │   ├── MyCertificates.jsx       // Certificates
│   │   ├── Profile.jsx              // User profile
│   │   └── Bookmarks.jsx            // Bookmarked content
│   │
│   ├── instructor/
│   │   ├── Dashboard.jsx            // Instructor dashboard
│   │   ├── MyCourses.jsx            // Manage courses
│   │   ├── CreateCourse.jsx         // Create new course
│   │   ├── EditCourse.jsx           // Edit course
│   │   ├── QuestionBank.jsx         // Question management
│   │   ├── CreateTest.jsx           // Create assigned test
│   │   ├── ManageTests.jsx          // Manage tests
│   │   ├── Students.jsx             // View students
│   │   └── Analytics.jsx            // Performance metrics
│   │
│   ├── admin/
│   │   ├── Dashboard.jsx            // Admin dashboard
│   │   ├── Users.jsx                // User management
│   │   ├── Courses.jsx              // All courses
│   │   ├── Categories.jsx           // Manage categories
│   │   ├── Analytics.jsx            // Platform analytics
│   │   └── Settings.jsx             // Platform settings
│   │
│   └── shared/
│       ├── KnowledgeCenter.jsx      // Browse articles
│       ├── ArticleDetail.jsx        // Article page
│       ├── Support.jsx              // Contact support
│       └── NotFound.jsx             // 404 page
│
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx               // Main navigation
│   │   ├── Sidebar.jsx              // Dashboard sidebar
│   │   ├── Footer.jsx               // Footer
│   │   └── MobileMenu.jsx           // Mobile navigation
│   │
│   ├── course/
│   │   ├── CourseCard.jsx           // Course card
│   │   ├── CourseGrid.jsx           // Course grid layout
│   │   ├── CourseFilter.jsx         // Filter component
│   │   ├── ModuleList.jsx           // Course modules
│   │   ├── VideoPlayer.jsx          // YouTube player
│   │   ├── ContentProgress.jsx      // Progress indicator
│   │   └── ReviewForm.jsx           // Course review
│   │
│   ├── exam/
│   │   ├── QuestionCard.jsx         // Question display
│   │   ├── QuestionNav.jsx          // Question navigation
│   │   ├── Timer.jsx                // Countdown timer
│   │   ├── ResultsSummary.jsx       // Results overview
│   │   └── AnswerReview.jsx         // Review answers
│   │
│   ├── common/
│   │   ├── Button.jsx               // Reusable button
│   │   ├── Input.jsx                // Form input
│   │   ├── Select.jsx               // Dropdown
│   │   ├── Modal.jsx                // Modal dialog
│   │   ├── Toast.jsx                // Notifications
│   │   ├── Loading.jsx              // Loading spinner
│   │   ├── Pagination.jsx           // Pagination
│   │   ├── SearchBar.jsx            // Search input
│   │   ├── Badge.jsx                // Badge component
│   │   └── ProgressBar.jsx          // Progress bar
│   │
│   ├── dashboard/
│   │   ├── StatCard.jsx             // Dashboard stat card
│   │   ├── ActivityFeed.jsx         // Recent activity
│   │   ├── ProgressChart.jsx        // Chart component
│   │   └── QuickActions.jsx         // Quick action buttons
│   │
│   └── auth/
│       ├── ProtectedRoute.jsx       // Route guard
│       ├── GoogleLoginButton.jsx    // OAuth button
│       └── RoleGuard.jsx            // Role-based access
│
├── hooks/
│   ├── useAuth.js                   // Authentication hook
│   ├── useCourses.js                // Course data hook
│   ├── useExams.js                  // Exam hook
│   └── useToast.js                  // Toast notifications
│
├── context/
│   ├── AuthContext.jsx              // Auth state
│   ├── ThemeContext.jsx             // Theme (future)
│   └── NotificationContext.jsx      // Notifications
│
├── services/
│   ├── api.js                       // Axios instance
│   ├── auth.service.js              // Auth API calls
│   ├── course.service.js            // Course API calls
│   ├── exam.service.js              // Exam API calls
│   └── storage.service.js           // Local storage utils
│
└── utils/
    ├── validation.js                // Form validation
    ├── formatters.js                // Data formatters
    ├── constants.js                 // App constants
    └── helpers.js                   // Helper functions
```

### **Key Frontend Features**

#### **1. Responsive Navigation**
```jsx
// Navbar.jsx - Adaptive for mobile, tablet, desktop
<Navbar>
  <Logo />
  <DesktopMenu items={menuItems} />
  <UserMenu>
    {isAuthenticated ? (
      <ProfileDropdown user={currentUser} />
    ) : (
      <>
        <Button variant="ghost" to="/login">Login</Button>
        <Button to="/register">Sign Up</Button>
      </>
    )}
  </UserMenu>
  <MobileMenuToggle onClick={toggleMobile} />
</Navbar>
```

#### **2. Dashboard Layouts**

**Student Dashboard:**
```jsx
<Dashboard>
  <Header>
    <h1>Welcome back, {user.full_name}! 👋</h1>
  </Header>
  
  <StatsGrid>
    <StatCard icon="📚" label="Enrolled Courses" value={5} />
    <StatCard icon="✅" label="Completed" value={2} />
    <StatCard icon="📝" label="Tests Taken" value={12} />
    <StatCard icon="🔥" label="Day Streak" value={7} />
  </StatsGrid>
  
  <Section title="My Courses">
    <CourseGrid courses={enrolledCourses} showProgress />
  </Section>
  
  <Section title="Assigned Tests">
    <TestList tests={assignments} />
  </Section>
  
  <Section title="Recent Activity">
    <ActivityFeed activities={recentActivity} />
  </Section>
</Dashboard>
```

**Instructor Dashboard:**
```jsx
<Dashboard>
  <Header>
    <h1>Instructor Dashboard</h1>
    <Button to="/instructor/course/create">+ Create Course</Button>
  </Header>
  
  <StatsGrid>
    <StatCard icon="📚" label="Total Courses" value={3} />
    <StatCard icon="👥" label="Total Students" value={245} />
    <StatCard icon="⭐" label="Avg Rating" value={4.8} />
    <StatCard icon="📝" label="Active Tests" value={5} />
  </StatsGrid>
  
  <Section title="Course Performance">
    <CoursePerformanceTable courses={myCourses} />
  </Section>
  
  <Section title="Recent Submissions">
    <SubmissionList submissions={recentSubmissions} />
  </Section>
</Dashboard>
```

#### **3. Course Learning Interface**
```jsx
<CourseLearn course={course}>
  <Sidebar>
    <CourseInfo course={course} />
    <ModuleList 
      modules={course.modules} 
      currentContent={currentContent}
      onSelectContent={handleContentChange}
    />
  </Sidebar>
  
  <MainContent>
    {currentContent.type === 'video' ? (
      <VideoPlayer
        videoId={currentContent.youtube_video_id}
        onProgress={handleProgress}
        onComplete={markComplete}
      />
    ) : currentContent.type === 'document' ? (
      <DocumentViewer url={currentContent.document_url} />
    ) : (
      <ArticleContent html={currentContent.article_content} />
    )}
    
    <ContentActions>
      <Button onClick={bookmarkWithNote}>🔖 Bookmark</Button>
      <Button onClick={markComplete}>✅ Mark Complete</Button>
      <Button onClick={downloadMaterial}>⬇️ Download</Button>
    </ContentActions>
    
    <QASection contentId={currentContent.id} />
  </MainContent>
</CourseLearn>
```

#### **4. Test Interface (Responsive)**
```jsx
<TestInterface attempt={attempt}>
  <TestHeader>
    <TestInfo name={test.name} code={test.code} />
    {isTimerTest && <Timer timeLimit={timeLimit} onExpire={autoSubmit} />}
  </TestHeader>
  
  <QuestionArea>
    <QuestionCard
      question={currentQuestion}
      answer={answers[currentQuestion.id]}
      onAnswerChange={handleAnswerChange}
    />
  </QuestionArea>
  
  <ControlBar>
    <Button onClick={prevQuestion} disabled={isFirstQuestion}>
      ← Previous
    </Button>
    <Button variant="secondary" onClick={markForReview}>
      🚩 Mark for Review
    </Button>
    <Button onClick={nextQuestion} disabled={isLastQuestion}>
      Next →
    </Button>
  </ControlBar>
  
  <ProgressIndicator>
    <span>Question {currentIndex + 1} of {totalQuestions}</span>
    <ProgressBar value={answeredCount} max={totalQuestions} />
    <span>Answered: {answeredCount} | Marked: {markedCount}</span>
  </ProgressIndicator>
  
  <QuestionNav
    questions={questions}
    answers={answers}
    markedQuestions={marked}
    currentIndex={currentIndex}
    onJumpTo={handleJumpToQuestion}
  />
  
  <SubmitButton onClick={handleSubmit}>
    Submit Test
  </SubmitButton>
</TestInterface>
```

#### **5. Certificate Display**
```jsx
<CertificateCard certificate={cert}>
  <CertificatePreview>
    <Badge>🎓</Badge>
    <Title>Certificate of Completion</Title>
    <StudentName>{cert.student_name}</StudentName>
    <CourseTitle>{cert.course_title}</CourseTitle>
    <Issuer>Ternary Technologies</Issuer>
    <IssueDate>{formatDate(cert.issue_date)}</IssueDate>
    <CertificateID>ID: {cert.certificate_id}</CertificateID>
  </CertificatePreview>
  
  <Actions>
    <Button onClick={downloadPDF}>
      <DownloadIcon /> Download PDF
    </Button>
    <Button variant="secondary" onClick={shareLinkedIn}>
      <LinkedInIcon /> Share on LinkedIn
    </Button>
    <Button variant="ghost" onClick={copyVerificationLink}>
      <LinkIcon /> Copy Verification Link
    </Button>
  </Actions>
</CertificateCard>
```

---

<a name="development-timeline"></a>
## 📅 **DEVELOPMENT TIMELINE (14 DAYS)**

### **WEEK 1: FOUNDATION & CORE FEATURES**

#### **Day 1-2: Project Setup & Authentication** ✅
**Day 1 (8 hours):**
- [ ] Initialize React project (Vite)
- [ ] Setup Tailwind CSS + shadcn/ui
- [ ] Configure folder structure
- [ ] Setup Express.js backend
- [ ] Configure MySQL database (local + Railway)
- [ ] Setup environment variables
- [ ] Create basic landing page

**Day 2 (8 hours):**
- [ ] Build user registration API
- [ ] Build login API (JWT)
- [ ] Implement Google OAuth
- [ ] Create Login/Register UI
- [ ] Build password reset flow (email + API)
- [ ] Implement protected routes
- [ ] Test authentication end-to-end

**Deliverables:** ✅ Users can register, login, reset password

---

#### **Day 3-4: Role-Based Dashboards** ✅
**Day 3 (8 hours):**
- [ ] Create role-based access control middleware
- [ ] Build Student Dashboard UI
- [ ] Build Instructor Dashboard UI
- [ ] Build Admin Dashboard UI
- [ ] Implement user profile page
- [ ] Create navigation components (Navbar, Sidebar)

**Day 4 (8 hours):**
- [ ] Build dashboard stats API endpoints
- [ ] Connect dashboards to real data
- [ ] Implement activity feed component
- [ ] Build quick actions components
- [ ] Create stat cards with animations
- [ ] Test role switching

**Deliverables:** ✅ Role-specific dashboards fully functional

---

#### **Day 5-6: Course Management System** ✅
**Day 5 (8 hours):**
- [ ] Create categories table & API
- [ ] Build course CRUD API endpoints
- [ ] Create course creation form (Instructor)
- [ ] Implement image upload to Cloudinary
- [ ] Build course catalog page (public)
- [ ] Implement course filtering & search

**Day 6 (8 hours):**
- [ ] Build course detail page
- [ ] Create module & content management UI
- [ ] Implement drag-and-drop content ordering
- [ ] Build course enrollment API
- [ ] Create "My Courses" page (Student)
- [ ] Test course creation flow end-to-end

**Deliverables:** ✅ Instructors can create courses, students can enroll

---

#### **Day 7: Video Integration & Progress Tracking** ✅
**Day 7 (8 hours):**
- [ ] Install react-player for YouTube
- [ ] Build VideoPlayer component
- [ ] Implement watch time tracking
- [ ] Create progress tracking API
- [ ] Build course learning interface
- [ ] Implement "mark as complete" functionality
- [ ] Calculate & display course progress percentage
- [ ] Test video playback on mobile

**Deliverables:** ✅ Students can watch videos and track progress

---

### **WEEK 2: EXAMS, KNOWLEDGE CENTER & POLISH**

#### **Day 8-9: Question Bank & Practice Tests** ✅
**Day 8 (8 hours):**
- [ ] Create question bank database tables
- [ ] Build question CRUD API
- [ ] Create question management UI (Instructor)
- [ ] Implement bulk question upload (CSV)
- [ ] Build category & tag filtering
- [ ] Test question creation

**Day 9 (8 hours):**
- [ ] Build practice test generation API
- [ ] Create practice test generator UI (Student)
- [ ] Implement test-taking interface
- [ ] Build auto-grading system
- [ ] Create results page with analytics
- [ ] Build answer review interface
- [ ] Test practice test flow

**Deliverables:** ✅ Students can generate & take practice tests

---

#### **Day 10-11: Assigned Tests System** ✅
**Day 10 (8 hours):**
- [ ] Create assigned tests database tables
- [ ] Build assigned test creation API
- [ ] Create test creation UI (Instructor)
- [ ] Implement question selection interface
- [ ] Build test assignment API
- [ ] Create assignment UI (select students, set deadline)

**Day 11 (8 hours):**
- [ ] Build "My Assignments" page (Student)
- [ ] Implement assigned test-taking interface
- [ ] Create test submission API
- [ ] Build results page for assigned tests
- [ ] Implement test history (Student)
- [ ] Create test analytics (Instructor)
- [ ] Test full assigned test workflow

**Deliverables:** ✅ Instructors can create & assign tests, students can take them

---

#### **Day 12: Knowledge Center & Engagement Features** ✅
**Day 12 (8 hours):**
- [ ] Create knowledge articles table
- [ ] Build article CRUD API
- [ ] Create rich text editor for articles
- [ ] Build knowledge center browsing UI
- [ ] Implement article search & filtering
- [ ] Create article detail page
- [ ] Build bookmark system (lessons + articles)
- [ ] Implement Q&A on lessons
- [ ] Create course review system
- [ ] Build announcements feature

**Deliverables:** ✅ Knowledge center fully functional with engagement features

---

#### **Day 13: Certificates & Final Features** ✅
**Day 13 (8 hours):**
- [ ] Install PDFKit for certificate generation
- [ ] Create certificate template design
- [ ] Build certificate generation API
- [ ] Implement auto-issue on course completion
- [ ] Create "My Certificates" page
- [ ] Build certificate verification page (public)
- [ ] Implement document download system
- [ ] Create FAQ chatbot
- [ ] Build email notification system
- [ ] Test all user journeys

**Deliverables:** ✅ Certificates auto-generated, all features complete

---

#### **Day 14: Testing, Deployment & Polish** ✅
**Day 14 (8 hours):**
- [ ] Comprehensive bug testing
- [ ] Mobile responsiveness check
- [ ] Performance optimization
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Configure production environment variables
- [ ] Setup MySQL database on Railway
- [ ] Test production deployment
- [ ] Create user documentation (Admin guide)
- [ ] Prepare demo presentation
- [ ] Final review & handoff

**Deliverables:** ✅ **MVP LIVE IN PRODUCTION!** 🎉

---

<a name="deployment-strategy"></a>
## 🚀 **DEPLOYMENT STRATEGY**

### **Backend Deployment (Railway)**

#### **Step 1: Prepare Backend**
```bash
# Ensure .gitignore includes
node_modules/
.env
*.log

# Create Procfile (Railway auto-detects)
web: node server.js

# Ensure package.json has start script
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

#### **Step 2: Deploy to Railway**
1. Go to [Railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your backend repository
5. Railway auto-detects Node.js

#### **Step 3: Add MySQL Database**
1. In Railway project, click "New" → "Database" → "MySQL"
2. Railway provisions MySQL automatically
3. Copy `DATABASE_URL` from MySQL service

#### **Step 4: Configure Environment Variables**
In Railway project settings, add:
```
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://user:pass@host:port/dbname
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-here
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
FRONTEND_URL=https://your-lms.vercel.app
```

#### **Step 5: Run Database Migrations**
```bash
# Connect to Railway MySQL via CLI (or use Railway's MySQL client)
railway run npm run migrate

# Or manually run SQL scripts
railway run mysql < database/schema.sql
```

#### **Step 6: Verify Deployment**
- Railway provides a URL: `https://your-app.up.railway.app`
- Test API: `https://your-app.up.railway.app/api/health`

---

### **Frontend Deployment (Vercel)**

#### **Step 1: Prepare Frontend**
```bash
# Ensure .env.production exists
VITE_API_URL=https://your-app.up.railway.app/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Test production build locally
npm run build
npm run preview
```

#### **Step 2: Deploy to Vercel**
1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New" → "Project"
4. Import your frontend repository
5. Vercel auto-detects React/Vite

#### **Step 3: Configure Build Settings**
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

#### **Step 4: Add Environment Variables**
In Vercel project settings → Environment Variables:
```
VITE_API_URL=https://your-app.up.railway.app/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

#### **Step 5: Deploy**
- Vercel automatically deploys on every push to `main` branch
- Provides URL: `https://your-lms.vercel.app`

#### **Step 6: Configure Custom Domain (Optional)**
1. Buy domain on Namecheap/GoDaddy
2. In Vercel → Domains → Add domain
3. Update DNS records as instructed
4. SSL certificate auto-provisioned

---

### **Post-Deployment Checklist**

#### **Backend**
- [ ] API health check returns 200
- [ ] Database connection successful
- [ ] All endpoints responding
- [ ] CORS configured for frontend domain
- [ ] Rate limiting active
- [ ] Logging working (Winston)

#### **Frontend**
- [ ] Site loads correctly
- [ ] API calls working
- [ ] Google OAuth functional
- [ ] Images loading from Cloudinary
- [ ] Mobile responsive
- [ ] No console errors

#### **Integration**
- [ ] Can register new user
- [ ] Can login with email/password
- [ ] Can login with Google
- [ ] Can create course (Instructor)
- [ ] Can enroll in course (Student)
- [ ] Videos play correctly
- [ ] Can take practice test
- [ ] Can submit assigned test
- [ ] Certificates generate
- [ ] Email notifications send

---

### **Monitoring & Maintenance**

#### **Railway**
- Free tier: 500 hours/month (enough for MVP)
- Monitor usage in Railway dashboard
- Setup alerts for downtime

#### **Vercel**
- Free tier: Unlimited bandwidth
- Monitor analytics in Vercel dashboard

#### **Database Backups**
```sql
-- Manual backup (run weekly)
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql

-- Railway auto-backups (upgrade to Pro plan)
```

#### **Logging & Errors**
- Backend logs visible in Railway console
- Frontend errors in Vercel logs
- Consider Sentry for error tracking (free tier)

---

<a name="testing"></a>
## 🧪 **TESTING & QUALITY ASSURANCE**

### **Testing Checklist**

#### **Authentication Tests**
- [ ] Register with valid email/password
- [ ] Register with existing email (should fail)
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials (should fail)
- [ ] Login with Google OAuth
- [ ] Request password reset
- [ ] Reset password with valid token
- [ ] Reset password with expired token (should fail)
- [ ] Access protected route without login (should redirect)
- [ ] Logout successfully

#### **Role-Based Access Tests**
- [ ] Student cannot access Instructor routes
- [ ] Instructor cannot access Admin routes
- [ ] Admin can access all routes
- [ ] Super Admin can manage admins

#### **Course Management Tests**
- [ ] Instructor creates new course
- [ ] Instructor edits course
- [ ] Instructor deletes course (soft delete)
- [ ] Student enrolls in course
- [ ] Student cannot enroll twice in same course
- [ ] Course catalog filters by category
- [ ] Course search returns relevant results
- [ ] Course detail page displays correctly
- [ ] Prerequisite check prevents enrollment

#### **Video & Progress Tests**
- [ ] YouTube video embeds correctly
- [ ] Video progress saves every 30 seconds
- [ ] Video marked complete at 90% watched
- [ ] Course progress updates after lesson completion
- [ ] Resume video from last position
- [ ] Video plays on mobile devices

#### **Exam System Tests**
- [ ] Student generates practice test with filters
- [ ] Practice test questions randomized
- [ ] Timer counts down correctly
- [ ] Auto-submit when timer expires
- [ ] Student submits test manually
- [ ] Auto-grading calculates score correctly
- [ ] Results page displays score & breakdown
- [ ] Answer review shows correct/incorrect answers
- [ ] Instructor creates assigned test
- [ ] Instructor assigns test to students
- [ ] Student receives test assignment
- [ ] Student takes assigned test
- [ ] Test submission updates assignment status
- [ ] Retake limit enforced

#### **Question Bank Tests**
- [ ] Instructor creates question
- [ ] Bulk upload CSV imports questions
- [ ] Questions filter by category
- [ ] Questions filter by difficulty
- [ ] Search finds questions by keyword

#### **Knowledge Center Tests**
- [ ] Browse all articles
- [ ] Filter articles by category
- [ ] Search articles by keyword
- [ ] Article detail page displays content
- [ ] Bookmark article with note
- [ ] View bookmarked articles

#### **Certificate Tests**
- [ ] Certificate auto-generates on course completion
- [ ] Certificate PDF downloads correctly
- [ ] Certificate verification page works (public)
- [ ] Invalid certificate ID shows error

#### **Mobile Responsiveness Tests**
- [ ] All pages display correctly on mobile (375px)
- [ ] Navigation menu works on mobile
- [ ] Forms are usable on mobile
- [ ] Videos play on mobile
- [ ] Test interface works on mobile

#### **Performance Tests**
- [ ] Homepage loads in < 2 seconds
- [ ] Course catalog loads 100 courses smoothly
- [ ] Video starts playing in < 3 seconds
- [ ] Large practice test (100 questions) loads quickly
- [ ] No memory leaks during navigation

#### **Security Tests**
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized
- [ ] CSRF protection active
- [ ] JWT tokens expire correctly
- [ ] Refresh token rotation works
- [ ] Rate limiting prevents brute force
- [ ] File upload size limit enforced
- [ ] Only allowed file types accepted

---