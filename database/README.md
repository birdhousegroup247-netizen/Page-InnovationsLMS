# TekyPro LMS - Database Documentation

## Overview

This directory contains the complete database schema and seed data for the TekyPro Learning Management System.

## Database Structure

- **Total Tables:** 30
- **Database Engine:** MySQL 8+ / MSSQL Server
- **Character Set:** UTF8MB4 (supports emojis and international characters)

## Tables Overview

### 1. Authentication & Users (2 tables)
- `users` - User accounts with role-based access
- `password_resets` - Password reset tokens

### 2. Course Structure (5 tables)
- `categories` - Course categories (hierarchical)
- `courses` - Course information
- `course_prerequisites` - Course dependencies
- `course_modules` - Course module organization
- `module_contents` - Video, document, and article content

### 3. Student Progress (2 tables)
- `enrollments` - Student course enrollments
- `content_progress` - Individual content completion tracking

### 4. Examination System (11 tables)
- `question_bank` - Question repository
- `practice_test_attempts` - Student self-generated tests
- `practice_test_questions` - Questions in practice tests
- `practice_test_answers` - Student answers for practice tests
- `assigned_tests` - Instructor-created tests
- `assigned_test_questions` - Questions in assigned tests
- `test_assignments` - Test assignments to students
- `assigned_test_attempts` - Student test attempts
- `assigned_test_answers` - Student answers for assigned tests

### 5. Knowledge Center (2 tables)
- `knowledge_articles` - Educational articles
- `article_bookmarks` - Bookmarked articles

### 6. Engagement (4 tables)
- `lesson_bookmarks` - Bookmarked lessons
- `lesson_questions` - Q&A on lessons
- `question_replies` - Replies to lesson questions
- `course_reviews` - Course ratings and reviews

### 7. Certificates (1 table)
- `certificates` - Completion certificates

### 8. Communication (1 table)
- `course_announcements` - Instructor announcements

### 9. System (2 tables)
- `activity_logs` - User activity tracking
- `notifications` - In-app notifications

## Quick Setup

### Option 1: Using MySQL Command Line

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE tekypro_lms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Use the database
USE tekypro_lms;

# Run schema
SOURCE schema.sql;

# Run seed data
SOURCE seed.sql;

# Verify installation
SHOW TABLES;
```

### Option 2: Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your MySQL server
3. File → Run SQL Script → Select `schema.sql`
4. File → Run SQL Script → Select `seed.sql`

### Option 3: Using the Setup Script

```bash
# Make the script executable
chmod +x setup.sh

# Run the setup
./setup.sh
```

## Default Users (After Seed Data)

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@tekypro.com | Admin@123 | Super Admin | Full system access |
| instructor@tekypro.com | Admin@123 | Instructor | Create courses and tests |
| student@tekypro.com | Admin@123 | Student | Enroll and learn |

**⚠️ IMPORTANT:** Change these passwords in production!

## Sample Data Included

- ✅ 5 Main categories (Database, Software, Analytics, Cloud, DevOps)
- ✅ 14 Sub-categories
- ✅ 1 Sample course (MSSQL Server Fundamentals)
- ✅ 4 Course modules with content
- ✅ 5 Sample questions in question bank
- ✅ 1 Knowledge article
- ✅ Sample enrollment and progress

## Database Indexes

All tables include optimized indexes for:
- Primary keys
- Foreign keys
- Frequently queried columns
- Full-text search (courses, articles, questions)

## Relationships

- **CASCADE DELETE:** When a parent record is deleted, child records are automatically deleted
  - User → Enrollments, Progress, Bookmarks
  - Course → Modules → Contents
  - Tests → Questions, Assignments

- **RESTRICT DELETE:** Prevents deletion if child records exist
  - Categories (if courses exist)
  - Instructors (if courses exist)
  - Questions (if used in tests)

## Key Features

### 1. Flexible Categorization
```sql
-- Categories support hierarchy
-- Example: Database Administration → MSSQL Server → Advanced Topics
parent_category_id allows unlimited nesting
```

### 2. Multi-Content Types
```sql
-- Each lesson can be:
- YouTube Video (youtube_video_id)
- Document (PDF, DOCX, PPTX)
- Article (Rich HTML content)
```

### 3. Comprehensive Progress Tracking
```sql
-- Tracks:
- Video watch time
- Last position (resume feature)
- Completion status
- Overall course progress percentage
```

### 4. Advanced Testing System
```sql
-- Two test types:
1. Practice Tests (Student-generated)
   - Select categories, difficulty, count
   - Instant feedback
   - Unlimited attempts

2. Assigned Tests (Instructor-created)
   - Scheduled start/end dates
   - Limited attempts
   - Graded assignments
```

### 5. Question Analytics
```sql
-- Tracks for each question:
- times_used
- times_correct
- times_incorrect
- average_time_seconds
```

## Maintenance

### Backup Database
```bash
mysqldump -u root -p tekypro_lms > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
mysql -u root -p tekypro_lms < backup_20250112.sql
```

### Check Database Size
```sql
SELECT
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'tekypro_lms'
GROUP BY table_schema;
```

### View Table Row Counts
```sql
SELECT
    table_name,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'tekypro_lms'
ORDER BY table_rows DESC;
```

## Performance Optimization

### Analyze Query Performance
```sql
EXPLAIN SELECT * FROM courses WHERE status = 'published';
```

### Check Index Usage
```sql
SHOW INDEX FROM courses;
```

### Optimize Tables
```sql
OPTIMIZE TABLE courses, enrollments, question_bank;
```

## Security Considerations

1. **Password Hashing:** All passwords use bcrypt with salt rounds ≥ 10
2. **SQL Injection Prevention:** Use parameterized queries (prepared statements)
3. **Role-Based Access:** Enforce permissions at application and database level
4. **Sensitive Data:** Never log passwords, tokens, or personal information

## Migration to MSSQL Server

When ready to migrate from MySQL to MSSQL:

1. Data type adjustments:
   - `AUTO_INCREMENT` → `IDENTITY(1,1)`
   - `BOOLEAN` → `BIT`
   - `TEXT` → `NVARCHAR(MAX)`
   - `JSON` → `NVARCHAR(MAX)` (store as JSON string)

2. Use the ORM (Sequelize) to handle differences automatically

## Support

For database-related issues:
- Check the logs: `tail -f /var/log/mysql/error.log`
- Verify connections: `SHOW PROCESSLIST;`
- Check permissions: `SHOW GRANTS FOR 'user'@'localhost';`

## Version History

- **v1.0** (2025-01-12) - Initial schema design
  - 30 tables
  - Complete LMS functionality
  - Seed data for testing

---

**TekyPro** - The Leading Remote DBA Service Provider
https://www.tekypro.com
