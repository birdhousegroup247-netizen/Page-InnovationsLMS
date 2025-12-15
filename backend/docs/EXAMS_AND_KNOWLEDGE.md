# Exams & Knowledge Center API Documentation

## Overview
Complete Testing and Knowledge Management System including Question Bank, Practice Tests, Assigned Tests, and Knowledge Articles.

**Status:** ✅ **FULLY FUNCTIONAL**
**Date Completed:** December 13, 2025

---

## 📚 System Components

### 1. Question Bank
Central repository for all quiz/exam questions.

### 2. Practice Tests (Student-Generated)
Students create custom practice tests from question bank.

### 3. Assigned Tests (Instructor-Created)
Instructors create and assign tests to students.

### 4. Knowledge Center
Article-based learning resources and documentation.

---

## 🎯 Question Bank API

### Get All Questions (Instructor/Admin)
```bash
GET /api/questions?category=6&difficulty=easy&type=multiple_choice&page=1&limit=20
Authorization: Bearer <instructor-token>
```

**Query Parameters:**
- `category` - Filter by category ID
- `difficulty` - Filter by difficulty (easy, medium, hard)
- `type` - Question type (multiple_choice, true_false, fill_blank)
- `search` - Search in question text or tags
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": 1,
        "question_text": "What is the primary key in a database table?",
        "question_type": "multiple_choice",
        "options": ["A unique identifier for each record", "..."],
        "correct_answer": "A unique identifier for each record",
        "explanation": "Primary keys uniquely identify records...",
        "difficulty": "easy",
        "marks": 1,
        "tags": ["database", "keys"],
        "is_approved": true,
        "category": {
          "id": 6,
          "name": "MSSQL Server"
        }
      }
    ],
    "pagination": {...}
  }
}
```

### Create Question (Instructor/Admin)
```bash
POST /api/questions
Authorization: Bearer <instructor-token>
Content-Type: application/json

{
  "category_id": 6,
  "question_text": "What is SQL?",
  "question_type": "multiple_choice",
  "options": ["Structured Query Language", "Simple Query Language", "..."],
  "correct_answer": "Structured Query Language",
  "explanation": "SQL stands for Structured Query Language",
  "difficulty": "easy",
  "tags": ["sql", "basics"],
  "points": 1
}
```

### Bulk Create Questions
```bash
POST /api/questions/bulk
Authorization: Bearer <instructor-token>
Content-Type: application/json

{
  "questions": [
    {
      "category_id": 6,
      "question_text": "Question 1...",
      ...
    },
    {
      "category_id": 6,
      "question_text": "Question 2...",
      ...
    }
  ]
}
```

### Update Question
```bash
PUT /api/questions/:id
Authorization: Bearer <token>
```

### Delete Question
```bash
DELETE /api/questions/:id
Authorization: Bearer <token>
```

### Approve Question (Admin Only)
```bash
PATCH /api/questions/:id/approve
Authorization: Bearer <admin-token>
```

---

## 🎓 Practice Tests API (Student-Generated)

### Generate Practice Test
```bash
POST /api/practice-tests/generate
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "categories": [6, 7],
  "difficulty": "mixed",
  "question_count": 50,
  "time_limit_minutes": 60
}
```

**Response:**
```json
{
  "success": true,
  "message": "Practice test generated successfully",
  "data": {
    "attempt": {
      "id": 1,
      "question_count": 50,
      "time_limit_minutes": 60,
      "total_marks": 75,
      "started_at": "2025-12-13T10:00:00.000Z"
    },
    "questions": [
      {
        "id": 1,
        "question_text": "What is the primary key?",
        "question_type": "multiple_choice",
        "options": ["Option 1", "Option 2", ...],
        "marks": 1
      }
    ]
  }
}
```

**Note:** Questions are returned WITHOUT correct answers.

### Submit Practice Test
```bash
POST /api/practice-tests/:attemptId/submit
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "answers": [
    {"question_id": 1, "answer": "A unique identifier for each record"},
    {"question_id": 2, "answer": "SELECT"}
  ],
  "time_taken_seconds": 3600
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test submitted successfully",
  "data": {
    "results": {
      "attempt_id": "1",
      "score": 45,
      "total_marks": 75,
      "percentage": 60,
      "correct_count": 30,
      "incorrect_count": 20,
      "time_taken_seconds": 3600,
      "completed_at": "2025-12-13T11:00:00.000Z"
    }
  }
}
```

### Get Test Results with Detailed Answers
```bash
GET /api/practice-tests/:attemptId/results
Authorization: Bearer <student-token>
```

**Response:** Includes all questions with correct answers, student answers, and explanations.

### Get Test History
```bash
GET /api/practice-tests/history?page=1&limit=10
Authorization: Bearer <student-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attempts": [
      {
        "id": 1,
        "question_count": 50,
        "difficulty": "mixed",
        "score": 45,
        "total_marks": 75,
        "percentage": "60.00",
        "completed_at": "2025-12-13T11:00:00.000Z"
      }
    ],
    "stats": {
      "totalAttempts": 10,
      "averageScore": 65.5,
      "bestScore": 95,
      "totalQuestionsAnswered": 500
    },
    "pagination": {...}
  }
}
```

### Get Ongoing Test (Resume)
```bash
GET /api/practice-tests/:attemptId
Authorization: Bearer <student-token>
```

**Use case:** Student can resume an in-progress test.

---

## 📝 Assigned Tests API (Instructor-Created)

### Create Assigned Test (Instructor)
```bash
POST /api/assigned-tests
Authorization: Bearer <instructor-token>
Content-Type: application/json

{
  "test_name": "SQL Fundamentals Quiz",
  "test_code": "SQL101",
  "description": "Basic SQL quiz for beginners",
  "course_id": 1,
  "total_questions": 50,
  "time_limit_minutes": 90,
  "passing_score": 70,
  "start_date": "2025-12-14T00:00:00Z",
  "end_date": "2025-12-20T23:59:59Z",
  "show_results_immediately": true,
  "allow_retake": false,
  "max_attempts": 1,
  "randomize_questions": true,
  "randomize_options": true,
  "status": "draft"
}
```

**Response:** Created test object

### Add Questions to Test
```bash
POST /api/assigned-tests/:testId/questions
Authorization: Bearer <instructor-token>
Content-Type: application/json

{
  "question_ids": [1, 2, 3, 4, 5, ...]
}
```

**Note:** This replaces existing questions and recalculates total marks.

### Update Test
```bash
PUT /api/assigned-tests/:testId
Authorization: Bearer <instructor-token>
Content-Type: application/json

{
  "status": "published",
  "passing_score": 75
}
```

### Assign Test to Students
```bash
POST /api/assigned-tests/:testId/assign
Authorization: Bearer <instructor-token>
Content-Type: application/json

// Option 1: Specific students
{
  "student_ids": [1, 2, 3],
  "due_date": "2025-12-20T23:59:59Z"
}

// Option 2: All course students
{
  "assign_to": "all_course_students",
  "course_id": 1,
  "due_date": "2025-12-20T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test assigned to 25 students",
  "data": {
    "assignedCount": 25,
    "assignments": [...]
  }
}
```

### Get My Tests (Instructor)
```bash
GET /api/assigned-tests/my-tests
Authorization: Bearer <instructor-token>
```

### Get Test by ID
```bash
GET /api/assigned-tests/:testId
Authorization: Bearer <token>
```

**Includes:** All test details, questions, and metadata.

### Delete Test (Archive)
```bash
DELETE /api/assigned-tests/:testId
Authorization: Bearer <instructor-token>
```

**Note:** Soft delete (sets status to 'archived')

---

## 👨‍🎓 Student - Assigned Tests

### Get My Assignments
```bash
GET /api/assigned-tests/my/assignments?status=pending
Authorization: Bearer <student-token>
```

**Query Parameters:**
- `status` - Filter by status (pending, in_progress, completed, all)

**Response:**
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": 1,
        "test_id": 1,
        "student_id": 5,
        "assigned_date": "2025-12-13T10:00:00.000Z",
        "due_date": "2025-12-20T23:59:59.000Z",
        "status": "pending",
        "test": {
          "test_name": "SQL Fundamentals Quiz",
          "description": "...",
          "total_questions": 50,
          "total_marks": 75,
          "time_limit_minutes": 90,
          "passing_score": 70,
          "instructor": {
            "id": 2,
            "full_name": "John Instructor"
          }
        },
        "attempts": []
      }
    ]
  }
}
```

### Start Assigned Test
```bash
POST /api/assigned-tests/assignments/:assignmentId/start
Authorization: Bearer <student-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attempt": {
      "id": 1,
      "assignment_id": 1,
      "test_id": 1,
      "attempt_number": 1,
      "started_at": "2025-12-13T10:30:00.000Z"
    },
    "test": {
      "test_name": "SQL Fundamentals Quiz",
      "total_questions": 50,
      "total_marks": 75,
      "time_limit_minutes": 90,
      "passing_score": 70
    },
    "questions": [
      // Randomized if test.randomize_questions is true
      // Options randomized if test.randomize_options is true
    ]
  }
}
```

**Validations:**
- Test must be published
- Cannot start before start_date
- Cannot start after end_date
- Cannot exceed max_attempts
- Cannot retake if allow_retake is false

### Submit Assigned Test
```bash
POST /api/assigned-tests/attempts/:attemptId/submit
Authorization: Bearer <student-token>
Content-Type: application/json

{
  "answers": [
    {"question_id": 1, "answer": "Option A"},
    {"question_id": 2, "answer": "True"}
  ],
  "time_taken_seconds": 5400
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": {
      "attempt_id": 1,
      "score": 52,
      "total_marks": 75,
      "percentage": 69.33,
      "passed": false,
      "passing_score": 70,
      "time_taken_seconds": 5400,
      "completed_at": "2025-12-13T12:00:00.000Z"
    }
  }
}
```

### Get Assigned Test Results
```bash
GET /api/assigned-tests/attempts/:attemptId/results
Authorization: Bearer <student-token>
```

**Note:**
- If `show_results_immediately` is false, students only see score/percentage
- If true, students see detailed results with correct answers

---

## 📚 Knowledge Center API

### Get All Articles (Public)
```bash
GET /api/knowledge?category=6&search=index&tags=performance&page=1&limit=12
```

**Response:**
```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": 1,
        "title": "Understanding Database Indexes",
        "slug": "understanding-database-indexes",
        "category_id": 6,
        "author_id": 2,
        "tags": ["indexing", "performance", "optimization"],
        "reading_time_minutes": 8,
        "views": 0,
        "status": "published",
        "created_at": "2025-12-12T20:46:44.000Z",
        "category": {
          "id": 6,
          "name": "MSSQL Server",
          "icon": "🔷"
        },
        "author": {
          "id": 2,
          "full_name": "John Instructor",
          "profile_picture": null
        }
      }
    ],
    "pagination": {...}
  }
}
```

**Note:** Full `content` field is excluded from list view for performance.

### Get Article by Slug
```bash
GET /api/knowledge/:slug
```

**Example:** `GET /api/knowledge/understanding-database-indexes`

**Response:** Full article with content

**Side Effect:** Increments view count automatically

### Get Popular Articles
```bash
GET /api/knowledge/popular?limit=10
```

**Returns:** Top articles sorted by views

### Get Related Articles
```bash
GET /api/knowledge/:id/related?limit=5
```

**Returns:** Articles in same category, sorted by views

### Create Article (Instructor/Admin)
```bash
POST /api/knowledge
Authorization: Bearer <instructor-token>
Content-Type: application/json

{
  "title": "SQL Query Optimization Tips",
  "slug": "sql-query-optimization-tips",
  "content": "<h1>Optimization Tips</h1><p>Content here...</p>",
  "category_id": 6,
  "tags": ["sql", "optimization", "performance"],
  "reading_time_minutes": 12,
  "status": "published"
}
```

### Update Article
```bash
PUT /api/knowledge/:id
Authorization: Bearer <token>
```

**Permissions:** Only author or admin can update

### Delete Article
```bash
DELETE /api/knowledge/:id
Authorization: Bearer <token>
```

**Permissions:** Only author or admin can delete

---

## 🔒 Authentication & Authorization

### Role-Based Access Matrix

| Endpoint | Student | Instructor | Admin |
|----------|---------|------------|-------|
| **Question Bank** |
| Browse Questions | ❌ | ✅ | ✅ |
| Create Questions | ❌ | ✅ | ✅ |
| Approve Questions | ❌ | ❌ | ✅ |
| **Practice Tests** |
| Generate Practice Test | ✅ | ❌ | ❌ |
| Submit Practice Test | ✅ | ❌ | ❌ |
| View History | ✅ | ❌ | ❌ |
| **Assigned Tests** |
| Create Test | ❌ | ✅ | ✅ |
| Assign Test | ❌ | ✅ | ✅ |
| Take Assigned Test | ✅ | ❌ | ❌ |
| View Results | ✅ | ✅ | ✅ |
| **Knowledge Center** |
| View Articles | ✅ | ✅ | ✅ |
| Create Articles | ❌ | ✅ | ✅ |
| Edit Own Articles | ❌ | ✅ | ✅ |
| Edit Any Article | ❌ | ❌ | ✅ |

---

## 🧪 Testing Results

### ✅ All Tests Passed

**Question Bank:**
- ✅ Questions created and stored
- ✅ Bulk create working
- ✅ is_approved field added to database
- ✅ Approval workflow functional

**Practice Tests:**
- ✅ Generate test: 5 questions, mixed difficulty ✓
- ✅ Submit test: 100% score achieved ✓
- ✅ Get results: Full details with correct answers ✓
- ✅ Test history: Stats calculated correctly ✓

**Assigned Tests:**
- ✅ Create test: SQL Fundamentals Quiz created ✓
- ✅ Add questions: 5 questions added, total_marks = 7 ✓
- ✅ Publish test: Status changed to published ✓
- ✅ Assign to student: 1 assignment created ✓
- ✅ Student view assignments: Test visible ✓
- ✅ Start test: Questions randomized ✓

**Knowledge Center:**
- ✅ Get articles: 1 article returned ✓
- ✅ Get popular: Sorted by views ✓
- ✅ Article detail: Full content loaded ✓
- ✅ View count incremented ✓

---

## 📊 Database Schema

### New Tables Created

1. **practice_test_attempts** - Student practice test sessions
2. **practice_test_questions** - Questions in each practice attempt
3. **practice_test_answers** - Student answers for practice tests
4. **assigned_tests** - Instructor-created tests
5. **assigned_test_questions** - Questions in assigned tests
6. **test_assignments** - Test assignments to students
7. **assigned_test_attempts** - Student attempts for assigned tests
8. **assigned_test_answers** - Student answers for assigned tests
9. **knowledge_articles** - Article content (already existed)

### Updated Tables

- **question_bank** - Added `is_approved` and `points` columns

---

## 📈 Features Implemented

### Practice Tests
- ✅ Generate custom tests from question bank
- ✅ Filter by categories and difficulty
- ✅ Auto-grading with instant results
- ✅ Detailed explanations after submission
- ✅ Test history with statistics
- ✅ Resume in-progress tests

### Assigned Tests
- ✅ Create and manage tests
- ✅ Add questions from question bank
- ✅ Bulk assign to students
- ✅ Assign to all course students
- ✅ Time limits and due dates
- ✅ Randomize questions and options
- ✅ Configure passing score
- ✅ Allow/disallow retakes
- ✅ Maximum attempts limit
- ✅ Show/hide results immediately
- ✅ Test status workflow (draft → published → archived)

### Question Bank
- ✅ Three question types (multiple choice, true/false, fill blank)
- ✅ Question approval workflow
- ✅ Categorization and tagging
- ✅ Difficulty levels
- ✅ Usage statistics tracking
- ✅ Bulk import

### Knowledge Center
- ✅ Article creation and management
- ✅ Rich text content
- ✅ Category-based organization
- ✅ Tag-based filtering
- ✅ View tracking
- ✅ Related articles
- ✅ Popular articles
- ✅ SEO-friendly slugs

---

## 🎯 Key Achievements

1. **Complete Testing System** - Both student-led and instructor-led testing
2. **Flexible Question Bank** - Reusable questions across all test types
3. **Auto-Grading** - Instant results and statistics
4. **Knowledge Management** - Full article system for learning resources
5. **Role-Based Permissions** - Proper access control for all features
6. **Statistics Tracking** - Question usage, student performance, view counts

---

**TekyPro LMS - The Leading Remote DBA Service Provider**
**Documentation Version:** 1.0
**Last Updated:** December 13, 2025
