# 📚 Question Bank & Exam Management System - Complete Architecture

**Project:** TekyPro LMS
**Document Type:** Critical Architecture & Implementation Guide
**Date:** December 25, 2025
**Status:** Backend Complete ✅ | Frontend Missing ❌
**Priority:** HIGH - Critical Feature Gap

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Database Architecture](#database-architecture)
4. [Backend API Architecture](#backend-api-architecture)
5. [Frontend Architecture (To Be Built)](#frontend-architecture)
6. [User Workflows](#user-workflows)
7. [UI/UX Design Specifications](#uiux-design-specifications)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Security & Permissions](#security--permissions)
10. [Performance Optimization](#performance-optimization)
11. [Testing Strategy](#testing-strategy)
12. [Integration Points](#integration-points)

---

## 🎯 Executive Summary

### What Is Question Bank Management?

The **Question Bank & Exam Management System** is a comprehensive testing and assessment platform that allows:

- **Admins/Instructors**: Create, manage, and organize questions in a centralized repository
- **Admins/Instructors**: Build tests from question bank and assign to students
- **Students**: Take practice tests (self-generated) or assigned tests (instructor-created)
- **System**: Auto-grade tests, track analytics, and provide detailed feedback

### Current Status: **75% Complete**

| Component | Status | Completeness |
|-----------|--------|--------------|
| **Database Schema** | ✅ Complete | 100% |
| **Backend Models** | ✅ Complete | 100% |
| **Backend Controllers** | ✅ Complete | 100% |
| **Backend Routes** | ✅ Complete | 100% |
| **Backend Tests** | ✅ Complete | 100% |
| **Student Frontend** | ⚠️ Partial | 40% (view only) |
| **Admin Frontend** | ❌ Missing | 0% |
| **Instructor Frontend** | ❌ Missing | 0% |

**Critical Gap**: No admin/instructor UI to manage questions and tests!

### Why This Feature Is Critical

1. **Course Monetization**: Tests are essential for paid certifications
2. **Student Assessment**: Measure learning outcomes objectively
3. **Instructor Tools**: Empower instructors to create custom assessments
4. **Competitive Advantage**: Most LMS platforms have weak testing systems
5. **Data Analytics**: Question performance data improves content quality

---

## 🔍 Current State Analysis

### ✅ What Exists (Backend - 100% Complete)

#### **1. Database Layer (9 Tables)**

```
Question Bank Ecosystem:
└── question_bank (11,000+ potential questions)
    ├── Practice Tests (Student Self-Generated)
    │   ├── practice_test_attempts
    │   ├── practice_test_questions
    │   └── practice_test_answers
    └── Assigned Tests (Instructor-Created)
        ├── assigned_tests
        ├── assigned_test_questions
        ├── test_assignments
        ├── assigned_test_attempts
        └── assigned_test_answers
```

**All tables have:**
- Proper indexes for performance
- Foreign key constraints
- Full-text search capabilities
- Analytics tracking fields
- Soft delete support

#### **2. API Layer (30+ Endpoints)**

**Question Bank API:**
- `GET /api/questions` - List all questions (filters: category, difficulty, type, search)
- `GET /api/questions/:id` - Get single question
- `POST /api/questions` - Create question
- `POST /api/questions/bulk` - Bulk import (CSV/JSON)
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `PATCH /api/questions/:id/approve` - Approve question (admin)

**Practice Test API:**
- `POST /api/practice-tests/generate` - Generate random test
- `GET /api/practice-tests/history` - Student test history
- `GET /api/practice-tests/:attemptId` - Get ongoing test
- `POST /api/practice-tests/:attemptId/submit` - Submit & auto-grade
- `GET /api/practice-tests/:attemptId/results` - View results

**Assigned Test API:**
- `POST /api/assigned-tests` - Create test
- `GET /api/assigned-tests/my-tests` - Instructor's tests
- `GET /api/assigned-tests/:testId` - Get test details
- `PUT /api/assigned-tests/:testId` - Update test
- `DELETE /api/assigned-tests/:testId` - Archive test
- `POST /api/assigned-tests/:testId/questions` - Add questions
- `POST /api/assigned-tests/:testId/assign` - Assign to students
- `GET /api/assigned-tests/my/assignments` - Student assignments
- `POST /api/assigned-tests/assignments/:id/start` - Start test
- `POST /api/assigned-tests/attempts/:id/submit` - Submit & auto-grade
- `GET /api/assigned-tests/attempts/:id/results` - View results

#### **3. Features Implemented**

**Question Management:**
- ✅ Multiple question types (MCQ, True/False, Fill-in-Blank)
- ✅ Category-based organization
- ✅ Difficulty levels (Easy, Medium, Hard)
- ✅ Tags system for advanced filtering
- ✅ Rich text support with formatting
- ✅ Image/media support in questions
- ✅ Explanation for correct answers
- ✅ Point/mark allocation per question
- ✅ Time limit per question
- ✅ Approval workflow for non-admin questions
- ✅ Bulk import (CSV/JSON)
- ✅ Question analytics (usage, accuracy stats)

**Practice Test System:**
- ✅ Student-generated random tests
- ✅ Filter by category, difficulty, question count
- ✅ Configurable time limits
- ✅ Auto-grading with immediate results
- ✅ Detailed explanations for each answer
- ✅ Score tracking and history
- ✅ Unlimited retakes
- ✅ Progress analytics

**Assigned Test System:**
- ✅ Instructor/admin test creation
- ✅ Unique test codes
- ✅ Course association
- ✅ Manual question selection
- ✅ Scheduling (start/end dates)
- ✅ Multiple attempts configuration
- ✅ Passing score threshold
- ✅ Randomize questions option
- ✅ Randomize answer options
- ✅ Show/hide results immediately
- ✅ Bulk student assignment
- ✅ Draft/Published/Archived workflow
- ✅ Auto-grading
- ✅ Detailed result reports
- ✅ Time tracking per student

### ❌ What's Missing (Frontend UI)

**Admin Panel Gaps:**
1. ❌ Question Bank management page (`/admin/questions`)
2. ❌ Test Builder page (`/admin/test-builder`)
3. ❌ Test Results Dashboard (`/admin/test-results`)
4. ❌ Question approval workflow UI
5. ❌ Bulk import interface
6. ❌ Question analytics dashboard

**Instructor Panel Gaps:**
1. ❌ My Questions page (`/instructor/questions`)
2. ❌ Create Test wizard (`/instructor/create-test`)
3. ❌ My Tests page (`/instructor/tests`)
4. ❌ Student Results page (`/instructor/test-results`)
5. ❌ Test analytics for instructors

**Student Panel Gaps:**
1. ⚠️ Basic view exists but needs enhancement
2. ❌ No detailed test analytics
3. ❌ No practice test builder UI
4. ❌ No review wrong answers feature

**Navigation Gaps:**
- ❌ No sidebar menu items for questions/tests
- ❌ No quick actions on dashboard
- ❌ No breadcrumb navigation

---

## 🗄️ Database Architecture

### Table: `question_bank`

**Purpose:** Centralized repository of all questions

```sql
CREATE TABLE question_bank (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Question Content
  question_text TEXT NOT NULL,
  question_type ENUM('multiple_choice', 'true_false', 'fill_blank') NOT NULL,
  options JSON NULL,  -- For MCQ: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer TEXT NOT NULL,  -- For MCQ: "A" or "Option A"
  explanation TEXT NULL,  -- Why this answer is correct

  -- Organization
  category_id INT NULL,  -- Links to categories table
  subcategory VARCHAR(100) NULL,  -- Finer categorization
  difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
  tags JSON NULL,  -- ["javascript", "arrays", "algorithms"]

  -- Scoring & Timing
  marks DECIMAL(5,2) DEFAULT 1.00,  -- Points for this question
  time_limit_seconds INT DEFAULT 60,  -- Suggested time to answer

  -- Analytics (Auto-updated)
  times_used INT DEFAULT 0,
  times_correct INT DEFAULT 0,
  times_incorrect INT DEFAULT 0,
  average_time_seconds DECIMAL(6,2) DEFAULT 0,

  -- Approval & Ownership
  is_approved BOOLEAN DEFAULT false,  -- Admin approval required
  created_by INT NOT NULL,  -- Instructor/Admin who created

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Indexes
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_category (category_id),
  INDEX idx_difficulty (difficulty),
  INDEX idx_type (question_type),
  INDEX idx_approved (is_approved),
  INDEX idx_created_by (created_by),
  FULLTEXT INDEX ft_question (question_text)
);
```

**Key Design Decisions:**

1. **JSON for Options**: Flexible for different question types
2. **Analytics Fields**: Track question effectiveness over time
3. **Approval Workflow**: Quality control for instructor-created questions
4. **Full-Text Search**: Fast question searching by content
5. **Soft Analytics**: Performance data improves content quality

**Sample Data:**

```json
{
  "id": 1,
  "question_text": "What is the output of console.log(typeof null)?",
  "question_type": "multiple_choice",
  "options": ["\"null\"", "\"object\"", "\"undefined\"", "\"number\""],
  "correct_answer": "\"object\"",
  "explanation": "This is a well-known JavaScript quirk. typeof null returns 'object' due to legacy reasons in the language design.",
  "category_id": 5,
  "subcategory": "JavaScript Basics",
  "difficulty": "medium",
  "tags": ["javascript", "typeof", "quirks"],
  "marks": 2.0,
  "time_limit_seconds": 90,
  "times_used": 145,
  "times_correct": 87,
  "times_incorrect": 58,
  "average_time_seconds": 45.3,
  "is_approved": true,
  "created_by": 2
}
```

---

### Table: `practice_test_attempts`

**Purpose:** Student-generated random practice tests

```sql
CREATE TABLE practice_test_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Student & Configuration
  student_id INT NOT NULL,
  question_count INT DEFAULT 10,
  time_limit_minutes INT DEFAULT 30,
  difficulty ENUM('easy', 'medium', 'hard', 'mixed') DEFAULT 'mixed',
  categories JSON NULL,  -- Filter by categories: [1, 3, 5]

  -- Results
  score DECIMAL(5,2) DEFAULT 0,
  total_marks DECIMAL(5,2) NOT NULL,
  percentage DECIMAL(5,2) DEFAULT 0,
  time_taken_seconds INT NULL,

  -- Status
  status ENUM('in_progress', 'completed', 'abandoned') DEFAULT 'in_progress',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,

  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_status (status),
  INDEX idx_started (started_at)
);
```

**Features:**
- Random question generation based on filters
- No limit on attempts
- Instant results
- Full explanations provided

---

### Table: `assigned_tests`

**Purpose:** Instructor/Admin created tests

```sql
CREATE TABLE assigned_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,

  -- Test Identity
  test_name VARCHAR(200) NOT NULL,
  test_code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "JS-FINAL-2025"
  description TEXT NULL,

  -- Ownership
  instructor_id INT NOT NULL,
  course_id INT NULL,  -- Optional course association

  -- Configuration
  total_questions INT DEFAULT 0,
  total_marks DECIMAL(6,2) DEFAULT 0,
  time_limit_minutes INT DEFAULT 60,
  passing_score DECIMAL(5,2) DEFAULT 60.00,  -- 60%

  -- Scheduling
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,

  -- Settings
  show_results_immediately BOOLEAN DEFAULT true,
  allow_retake BOOLEAN DEFAULT false,
  max_attempts INT DEFAULT 1,
  randomize_questions BOOLEAN DEFAULT false,
  randomize_options BOOLEAN DEFAULT false,

  -- Status
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',

  -- Instructions
  instructions TEXT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (instructor_id) REFERENCES users(id),
  FOREIGN KEY (course_id) REFERENCES courses(id),
  INDEX idx_instructor (instructor_id),
  INDEX idx_course (course_id),
  INDEX idx_status (status),
  INDEX idx_code (test_code)
);
```

**Features:**
- Draft mode for building tests
- Scheduling for timed releases
- Randomization for academic integrity
- Attempt control
- Configurable result visibility

---

### Relationship Diagram

```
┌─────────────────────┐
│   question_bank     │
│  (Question Repo)    │
└──────────┬──────────┘
           │
           ├──────────────────────────────┐
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│ practice_test        │      │ assigned_test        │
│ _questions           │      │ _questions           │
└──────────┬───────────┘      └──────────┬───────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│ practice_test        │      │ assigned_tests       │
│ _attempts            │      │                      │
└──────────┬───────────┘      └──────────┬───────────┘
           │                              │
           │                              ▼
           │                   ┌──────────────────────┐
           │                   │ test_assignments     │
           │                   │ (Assigned to Students)│
           │                   └──────────┬───────────┘
           │                              │
           │                              ▼
           │                   ┌──────────────────────┐
           │                   │ assigned_test        │
           │                   │ _attempts            │
           │                   └──────────┬───────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│ practice_test        │      │ assigned_test        │
│ _answers             │      │ _answers             │
│ (Student Answers)    │      │ (Graded Answers)     │
└──────────────────────┘      └──────────────────────┘
```

---

## 🔧 Backend API Architecture

### Question Bank API

#### **GET /api/questions**
**Purpose:** List all questions with filtering

**Query Parameters:**
```javascript
{
  category_id: number,      // Filter by category
  difficulty: string,       // 'easy' | 'medium' | 'hard'
  question_type: string,    // 'multiple_choice' | 'true_false' | 'fill_blank'
  search: string,          // Full-text search
  is_approved: boolean,    // Filter by approval status
  created_by: number,      // Filter by creator
  page: number,            // Pagination
  limit: number            // Items per page
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": 1,
        "question_text": "What is React?",
        "question_type": "multiple_choice",
        "options": ["Library", "Framework", "Language", "Tool"],
        "correct_answer": "Library",
        "difficulty": "easy",
        "category": {
          "id": 5,
          "name": "JavaScript"
        },
        "tags": ["react", "frontend"],
        "marks": 1.0,
        "times_used": 42,
        "accuracy_rate": 85.7,
        "is_approved": true,
        "created_by": {
          "id": 2,
          "full_name": "John Doe"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 20,
      "pages": 8
    }
  }
}
```

#### **POST /api/questions**
**Purpose:** Create a new question

**Request Body:**
```json
{
  "question_text": "What is the capital of France?",
  "question_type": "multiple_choice",
  "options": ["London", "Berlin", "Paris", "Madrid"],
  "correct_answer": "Paris",
  "explanation": "Paris has been the capital of France since 987 AD.",
  "category_id": 12,
  "subcategory": "European Geography",
  "difficulty": "easy",
  "tags": ["geography", "europe", "capitals"],
  "marks": 1.0,
  "time_limit_seconds": 30
}
```

**Validation Rules:**
- `question_text`: Required, min 10 characters
- `question_type`: Required, valid enum
- `options`: Required for MCQ (2-6 options)
- `correct_answer`: Required, must match an option
- `marks`: Positive number
- `time_limit_seconds`: 10-600 seconds

**Authorization:**
- Instructors can create (requires approval)
- Admins can create (auto-approved)

#### **POST /api/questions/bulk**
**Purpose:** Bulk import questions

**Request Body (CSV format):**
```csv
question_text,question_type,options,correct_answer,difficulty,category_id,marks
"What is 2+2?","multiple_choice","[\"2\",\"3\",\"4\",\"5\"]","4","easy",1,1.0
"Is Earth round?","true_false","[\"True\",\"False\"]","True","easy",2,0.5
```

**Request Body (JSON format):**
```json
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "...",
      // ... other fields
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "failed": 3,
    "errors": [
      {
        "row": 12,
        "error": "Missing correct_answer"
      }
    ]
  }
}
```

---

### Practice Test API

#### **POST /api/practice-tests/generate**
**Purpose:** Generate a random practice test

**Request Body:**
```json
{
  "question_count": 20,
  "difficulty": "mixed",  // or "easy", "medium", "hard"
  "categories": [1, 3, 5],  // Optional category filter
  "time_limit_minutes": 30
}
```

**Algorithm:**
```javascript
1. Fetch approved questions matching filters
2. Randomly select question_count questions
3. For "mixed" difficulty: 40% easy, 40% medium, 20% hard
4. Create practice_test_attempt record
5. Create practice_test_questions mappings
6. Calculate total_marks
7. Return test ID and questions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attempt_id": 123,
    "questions": [
      {
        "id": 1,
        "question_text": "...",
        "question_type": "multiple_choice",
        "options": ["A", "B", "C", "D"],
        "marks": 2.0,
        "time_limit_seconds": 90
      }
    ],
    "total_questions": 20,
    "total_marks": 35.0,
    "time_limit_minutes": 30
  }
}
```

#### **POST /api/practice-tests/:attemptId/submit**
**Purpose:** Submit practice test for grading

**Request Body:**
```json
{
  "answers": {
    "1": "Option A",
    "2": "True",
    "3": "Paris"
  },
  "time_taken_seconds": 1245
}
```

**Auto-Grading Logic:**
```javascript
For each answer:
  1. Compare student answer with correct_answer
  2. Award marks if correct
  3. Record is_correct status
  4. Update question analytics (times_used, times_correct)

Calculate:
  - Total score
  - Percentage
  - Pass/Fail status

Return:
  - Score breakdown
  - Correct answers
  - Explanations
  - Analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 28.5,
    "total_marks": 35.0,
    "percentage": 81.43,
    "passed": true,
    "time_taken_seconds": 1245,
    "results": [
      {
        "question_id": 1,
        "question_text": "What is React?",
        "your_answer": "Library",
        "correct_answer": "Library",
        "is_correct": true,
        "marks_awarded": 2.0,
        "explanation": "React is indeed a JavaScript library..."
      }
    ]
  }
}
```

---

### Assigned Test API

#### **POST /api/assigned-tests**
**Purpose:** Create a new assigned test

**Request Body:**
```json
{
  "test_name": "JavaScript Final Exam",
  "test_code": "JS-FINAL-2025",
  "description": "Comprehensive final exam covering all JavaScript topics",
  "course_id": 3,
  "time_limit_minutes": 120,
  "passing_score": 70.0,
  "start_date": "2025-01-15T09:00:00Z",
  "end_date": "2025-01-15T23:59:59Z",
  "show_results_immediately": false,
  "allow_retake": true,
  "max_attempts": 2,
  "randomize_questions": true,
  "randomize_options": true,
  "instructions": "Read each question carefully. No calculator allowed."
}
```

**Authorization:**
- Instructors: Can create for their courses
- Admins: Can create for any course

**Response:**
```json
{
  "success": true,
  "data": {
    "test_id": 45,
    "test_code": "JS-FINAL-2025",
    "status": "draft",
    "message": "Test created. Add questions to publish."
  }
}
```

#### **POST /api/assigned-tests/:testId/questions**
**Purpose:** Add questions to test

**Request Body:**
```json
{
  "question_ids": [1, 5, 12, 18, 23],  // Manual selection
  "order": [1, 2, 3, 4, 5]  // Optional custom order
}
```

**Or Auto-Select:**
```json
{
  "auto_select": true,
  "count": 50,
  "categories": [1, 3],
  "difficulty_distribution": {
    "easy": 20,    // 20 easy questions
    "medium": 20,  // 20 medium questions
    "hard": 10     // 10 hard questions
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "questions_added": 50,
    "total_marks": 85.0
  }
}
```

#### **POST /api/assigned-tests/:testId/assign**
**Purpose:** Assign test to students

**Request Body:**
```json
{
  "student_ids": [10, 15, 23, 45],  // Individual students
  "due_date": "2025-01-20T23:59:59Z"
}
```

**Or Bulk by Course:**
```json
{
  "assign_to_course": true,
  "course_id": 3,
  "due_date": "2025-01-20T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "assigned_to": 42,
    "assignments_created": 42
  }
}
```

---

## 💻 Frontend Architecture (To Be Built)

### Admin Panel Pages

#### **1. Question Bank Management (`/admin/questions`)**

**Purpose:** Browse, search, filter, and manage all questions in the system.

**Page Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 📚 Question Bank Management                          [+ Add Question] │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search: [________________]  📁 Category: [All ▼]        │ │
│ │ 📊 Difficulty: [All ▼]  📝 Type: [All ▼]  ✓ Approved Only │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📊 Stats Cards                                             │   │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │   │
│ │ │  Total   │ │ Approved │ │ Pending  │ │ Most Used│      │   │
│ │ │  1,247   │ │   1,156  │ │    91    │ │   #145   │      │   │
│ │ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Bulk Actions: [Select All] [Export CSV] [Delete Selected] │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ☑ What is the output of console.log(typeof null)?        │   │
│ │   Type: MCQ  │  Difficulty: Medium  │  Used: 145 times   │   │
│ │   Category: JavaScript  │  Accuracy: 60%  │  2.0 marks   │   │
│ │   Created by: John Doe  │  ✓ Approved                    │   │
│ │   [👁 View] [✏️ Edit] [📋 Clone] [🗑️ Delete]              │   │
│ ├───────────────────────────────────────────────────────────┤   │
│ │ ☑ Explain the difference between let and var             │   │
│ │   Type: Fill Blank  │  Difficulty: Easy  │  Used: 89     │   │
│ │   Category: JavaScript  │  Accuracy: 78%  │  1.0 marks   │   │
│ │   Created by: Jane Smith  │  ⏳ Pending Approval          │   │
│ │   [👁 View] [✏️ Edit] [✅ Approve] [❌ Reject]             │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ [← Prev]  Page 1 of 63  [Next →]                                │
└───────────────────────────────────────────────────────────────────┘
```

**Features:**
- 🔍 **Search**: Full-text search across question text
- 🏷️ **Filters**: Category, difficulty, type, approval status, creator
- 📊 **Stats Cards**: Total, approved, pending, most used
- ☑️ **Bulk Selection**: Select multiple for export/delete
- 👁️ **Quick View**: Preview question without opening modal
- ✏️ **Inline Edit**: Edit question details
- 📋 **Clone**: Duplicate question for variations
- ✅ **Approval**: Admin approve/reject instructor questions
- 📈 **Analytics**: Usage count, accuracy rate per question
- 📤 **Export**: CSV export of selected questions
- 🔄 **Sorting**: By date, usage, accuracy, difficulty

**State Management:**
```javascript
const [questions, setQuestions] = useState([]);
const [filters, setFilters] = useState({
  search: '',
  category_id: null,
  difficulty: null,
  question_type: null,
  is_approved: null,
  created_by: null
});
const [selectedQuestions, setSelectedQuestions] = useState([]);
const [pagination, setPagination] = useState({ page: 1, limit: 20 });
const [stats, setStats] = useState({});
```

**API Calls:**
```javascript
// Fetch questions with filters
const fetchQuestions = async () => {
  const response = await adminQuestionsAPI.getAll({
    ...filters,
    ...pagination
  });
  setQuestions(response.data.questions);
  setStats(response.data.stats);
};

// Bulk approve
const bulkApprove = async () => {
  await adminQuestionsAPI.bulkApprove(selectedQuestions);
  fetchQuestions();
};
```

---

#### **2. Add/Edit Question Modal**

**Purpose:** Create or modify individual questions

**Modal Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ ✏️ Add New Question                              [✕]     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Question Type *                                          │
│ ○ Multiple Choice  ○ True/False  ○ Fill in the Blank   │
│                                                           │
│ Question Text *                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Rich Text Editor with formatting toolbar]         │ │
│ │ - Bold, Italic, Code                                │ │
│ │ - Lists, Links                                      │ │
│ │ - Image upload                                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Options (for Multiple Choice) *                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ A: [_________________________________________] [✕]  │ │
│ │ B: [_________________________________________] [✕]  │ │
│ │ C: [_________________________________________] [✕]  │ │
│ │ D: [_________________________________________] [✕]  │ │
│ │                                        [+ Add Option]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Correct Answer *                                         │
│ [Dropdown: Option A ▼]                                   │
│                                                           │
│ Explanation (optional)                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Explain why this answer is correct...               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌──────────┬──────────┬──────────┬─────────────────┐   │
│ │ Category │Difficulty│  Marks   │  Time Limit     │   │
│ │[Select ▼]│[Medium ▼]│  [2.0]   │  [60] seconds   │   │
│ └──────────┴──────────┴──────────┴─────────────────┘   │
│                                                           │
│ Tags (comma-separated)                                   │
│ [javascript, arrays, loops]                              │
│                                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👁️ Preview                                           │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ [Shows how question will appear to students]    │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│         [Cancel]  [Save as Draft]  [Save & Approve]      │
└─────────────────────────────────────────────────────────┘
```

**Form Validation:**
```javascript
const validateQuestion = (data) => {
  const errors = {};

  if (!data.question_text || data.question_text.length < 10) {
    errors.question_text = 'Question must be at least 10 characters';
  }

  if (data.question_type === 'multiple_choice') {
    if (!data.options || data.options.length < 2) {
      errors.options = 'At least 2 options required';
    }
    if (!data.correct_answer) {
      errors.correct_answer = 'Select correct answer';
    }
  }

  if (data.marks <= 0) {
    errors.marks = 'Marks must be positive';
  }

  return errors;
};
```

---

#### **3. Test Builder Page (`/admin/test-builder`)**

**Purpose:** Create and manage assigned tests

**Page Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 Test Builder                                  [💾 Save Draft]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Step 1: Basic Information                                  │   │
│ │                                                             │   │
│ │ Test Name *                                                │   │
│ │ [JavaScript Fundamentals Quiz_______________]              │   │
│ │                                                             │   │
│ │ Test Code *          Course                                │   │
│ │ [JS-QUIZ-001]        [JavaScript Basics ▼]                 │   │
│ │                                                             │   │
│ │ Description                                                │   │
│ │ ┌─────────────────────────────────────────────────────┐   │   │
│ │ │ This quiz covers variables, data types, operators  │   │   │
│ │ └─────────────────────────────────────────────────────┘   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Step 2: Question Selection                                 │   │
│ │                                                             │   │
│ │ Selection Method:                                          │   │
│ │ ○ Manual Selection  ● Auto-Select from Question Bank      │   │
│ │                                                             │   │
│ │ [Auto-Select Mode]                                         │   │
│ │ ┌──────────┬──────────┬──────────┬──────────┐            │   │
│ │ │ Easy     │ Medium   │ Hard     │ Total    │            │   │
│ │ │ [10]     │ [15]     │ [5]      │ 30 Q's   │            │   │
│ │ └──────────┴──────────┴──────────┴──────────┘            │   │
│ │                                                             │   │
│ │ Filter by Categories:                                      │   │
│ │ [☑ Variables] [☑ Data Types] [☐ Functions] [☐ Arrays]     │   │
│ │                                                             │   │
│ │                          [🎲 Generate Question Set]         │   │
│ │                                                             │   │
│ │ Selected Questions (30)                  [🔍 Filter]       │   │
│ │ ┌─────────────────────────────────────────────────────┐   │   │
│ │ │ 1. What is a variable? (Easy, 1.0 marks)      [✕]  │   │   │
│ │ │ 2. Explain let vs var (Medium, 2.0 marks)     [✕]  │   │   │
│ │ │ 3. What is hoisting? (Hard, 3.0 marks)        [✕]  │   │   │
│ │ │ ...                                                 │   │   │
│ │ └─────────────────────────────────────────────────────┘   │   │
│ │                                                             │   │
│ │ Total Marks: 45.0                                          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Step 3: Test Settings                                      │   │
│ │                                                             │   │
│ │ ┌────────────────┬────────────────┬─────────────────┐     │   │
│ │ │ Time Limit     │ Passing Score  │ Max Attempts    │     │   │
│ │ │ [60] minutes   │ [70] %         │ [2]             │     │   │
│ │ └────────────────┴────────────────┴─────────────────┘     │   │
│ │                                                             │   │
│ │ Schedule                                                   │   │
│ │ Start Date: [2025-01-15 09:00]  End Date: [2025-01-20]    │   │
│ │                                                             │   │
│ │ Options:                                                   │   │
│ │ ☑ Randomize question order                                │   │
│ │ ☑ Randomize answer options                                │   │
│ │ ☑ Show results immediately after submission               │   │
│ │ ☐ Allow retake                                            │   │
│ │                                                             │   │
│ │ Instructions for Students                                 │   │
│ │ ┌─────────────────────────────────────────────────────┐   │   │
│ │ │ - Read each question carefully                      │   │   │
│ │ │ - You cannot go back once submitted                │   │   │
│ │ │ - No external resources allowed                    │   │   │
│ │ └─────────────────────────────────────────────────────┘   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Step 4: Assign to Students                                 │   │
│ │                                                             │   │
│ │ Assignment Method:                                         │   │
│ │ ○ Select Individual Students  ● Assign to Entire Course   │   │
│ │                                                             │   │
│ │ Course: JavaScript Basics (42 enrolled students)           │   │
│ │                                                             │   │
│ │ Due Date: [2025-01-25 23:59]                               │   │
│ │                                                             │   │
│ │ [📧 Send email notification to students]                   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ [← Back] [Save as Draft] [Publish Test & Assign →]              │
└───────────────────────────────────────────────────────────────────┘
```

**Workflow Steps:**
1. **Basic Info**: Name, code, course, description
2. **Question Selection**: Manual or auto-select with filters
3. **Settings**: Time, passing score, randomization
4. **Assignment**: Select students, set due date, send notifications

**State Management:**
```javascript
const [testData, setTestData] = useState({
  test_name: '',
  test_code: '',
  course_id: null,
  description: '',
  questions: [],
  time_limit_minutes: 60,
  passing_score: 70,
  settings: {
    randomize_questions: true,
    randomize_options: true,
    show_results_immediately: true,
    allow_retake: false,
    max_attempts: 1
  },
  schedule: {
    start_date: null,
    end_date: null
  },
  instructions: ''
});

const [currentStep, setCurrentStep] = useState(1);
const [selectedQuestions, setSelectedQuestions] = useState([]);
```

**Question Auto-Selection Logic:**
```javascript
const autoSelectQuestions = async (criteria) => {
  const { easy, medium, hard, categories } = criteria;

  const questions = [];

  // Fetch easy questions
  const easyQuestions = await questionBankAPI.getAll({
    difficulty: 'easy',
    categories,
    limit: easy,
    random: true
  });
  questions.push(...easyQuestions.data);

  // Fetch medium questions
  const mediumQuestions = await questionBankAPI.getAll({
    difficulty: 'medium',
    categories,
    limit: medium,
    random: true
  });
  questions.push(...mediumQuestions.data);

  // Fetch hard questions
  const hardQuestions = await questionBankAPI.getAll({
    difficulty: 'hard',
    categories,
    limit: hard,
    random: true
  });
  questions.push(...hardQuestions.data);

  setSelectedQuestions(questions);

  // Calculate total marks
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  setTestData(prev => ({ ...prev, total_marks: totalMarks }));
};
```

---

#### **4. My Tests Page (`/admin/tests`)**

**Purpose:** View and manage all tests

**Page Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 Tests Management                            [+ Create Test]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ Tabs: [All (45)] [Published (32)] [Draft (8)] [Archived (5)]    │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📊 JavaScript Final Exam                    Status: Published│ │
│ │ Code: JS-FINAL-2025  │  Course: JS Advanced                 │ │
│ │ 50 Questions  │  100 Marks  │  120 min  │  Pass: 70%        │ │
│ │ Assigned to: 42 students  │  Completed: 38  │  Avg: 78.5%   │ │
│ │ Schedule: Jan 15 - Jan 20, 2025                              │ │
│ │ [👁 View] [📊 Results] [✏️ Edit] [📋 Clone] [📥 Archive]      │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ 📊 React Basics Quiz                           Status: Draft │ │
│ │ Code: REACT-Q1-2025  │  Course: React Fundamentals          │ │
│ │ 20 Questions  │  30 Marks  │  45 min  │  Pass: 60%          │ │
│ │ Not yet published                                            │ │
│ │ [👁 Preview] [✏️ Continue Editing] [🗑️ Delete]               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ [← Prev]  Page 1 of 9  [Next →]                                 │
└───────────────────────────────────────────────────────────────────┘
```

**Test Card Information:**
- Test name and code
- Course association
- Question count, total marks, time limit
- Passing score
- Assignment stats (assigned, completed, average)
- Schedule dates
- Status badge
- Quick actions

---

#### **5. Test Results Dashboard (`/admin/test-results/:testId`)**

**Purpose:** View detailed student results for a test

**Page Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Test Results: JavaScript Final Exam                   [Export]│
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📈 Overview Statistics                                     │   │
│ │ ┌──────────┬──────────┬──────────┬──────────┬─────────┐   │   │
│ │ │ Assigned │Completed │  Pending │  Average │Pass Rate│   │   │
│ │ │    42    │    38    │     4    │   78.5%  │  85.7%  │   │   │
│ │ └──────────┴──────────┴──────────┴──────────┴─────────┘   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📊 Score Distribution (Bar Chart)                          │   │
│ │ ┌─────────────────────────────────────────────────────┐   │   │
│ │ │   |                                                 │   │   │
│ │ │ 20|     ■■                                          │   │   │
│ │ │   |     ■■  ■■■                                     │   │   │
│ │ │ 10|  ■  ■■  ■■■  ■■■  ■                            │   │   │
│ │ │   |  ■  ■■  ■■■  ■■■  ■    ■                       │   │   │
│ │ │  0└─────────────────────────────────────────────    │   │   │
│ │ │    0-20 20-40 40-60 60-80 80-100                   │   │   │
│ │ └─────────────────────────────────────────────────────┘   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ Student Results                           [🔍 Search] [⬇ Export] │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Student Name      Score    %    Time   Status    Actions  │   │
│ ├───────────────────────────────────────────────────────────┤   │
│ │ John Doe         92/100   92%   95min   ✅ Passed  [View] │   │
│ │ Jane Smith       78/100   78%  108min   ✅ Passed  [View] │   │
│ │ Bob Johnson      65/100   65%  115min   ❌ Failed  [View] │   │
│ │ Alice Brown      --/--     --    --     ⏳ Pending  [--]  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ [← Back to Tests]                                                │
└───────────────────────────────────────────────────────────────────┘
```

**Features:**
- Overview statistics (assigned, completed, average, pass rate)
- Score distribution chart
- Student-by-student results table
- Individual result details
- Export to CSV/PDF
- Filter by status (completed, pending, passed, failed)

---

#### **6. Individual Result Detail Page**

**Purpose:** View detailed answers for a specific student

**Page Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 👤 Student: John Doe - JavaScript Final Exam                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Score: 92/100 (92%)  │  Time: 95 minutes  │  ✅ PASSED    │   │
│ │ Submitted: Jan 15, 2025 10:45 AM                           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Question 1 of 50                              ✅ Correct  │   │
│ │                                                             │   │
│ │ What is the output of console.log(typeof null)?            │   │
│ │                                                             │   │
│ │ A) "null"                                                  │   │
│ │ B) "object"      ← ✅ Student Answer (Correct)             │   │
│ │ C) "undefined"                                             │   │
│ │ D) "number"                                                │   │
│ │                                                             │   │
│ │ Marks: 2/2                                                 │   │
│ │ Time Spent: 45 seconds                                     │   │
│ │                                                             │   │
│ │ 💡 Explanation: This is a well-known JavaScript quirk...   │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Question 2 of 50                              ❌ Incorrect │   │
│ │                                                             │   │
│ │ Explain the difference between let and var                │   │
│ │                                                             │   │
│ │ Student Answer:                                            │   │
│ │ "let is block scoped"  ← ❌ Incomplete                     │   │
│ │                                                             │   │
│ │ Correct Answer:                                            │   │
│ │ "let is block-scoped and not hoisted, var is function-    │   │
│ │  scoped and hoisted"                                       │   │
│ │                                                             │   │
│ │ Marks: 0/3                                                 │   │
│ │ Time Spent: 120 seconds                                    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│ [← Previous] [Next →]  [📄 Print Results]  [📧 Email Student]   │
└───────────────────────────────────────────────────────────────────┘
```

**Features:**
- Question-by-question review
- Student answer vs correct answer comparison
- Marks awarded per question
- Time spent per question
- Explanations shown
- Navigation between questions
- Print/export individual result
- Email result to student

---

### Instructor Panel Pages

The instructor panel will have similar pages but with restricted access:

1. **My Questions** (`/instructor/questions`)
   - Only questions created by this instructor
   - Cannot approve questions (admin only)
   - Can create questions (pending approval)

2. **My Tests** (`/instructor/tests`)
   - Only tests for courses taught by this instructor
   - Cannot create tests for other courses

3. **Test Builder** (`/instructor/test-builder`)
   - Same interface as admin
   - Limited to their courses

4. **Student Results** (`/instructor/test-results/:testId`)
   - Only for their tests
   - Same analytics and export features

---

### Student Panel Enhancements

**Current:** Basic PracticeTests.jsx exists
**Enhancements Needed:**

1. **Practice Test Builder UI**
   - Visual interface to configure practice test
   - Category selection with checkboxes
   - Difficulty slider
   - Question count selector
   - Time limit configuration

2. **Test Taking Interface**
   - Question navigation sidebar
   - Timer countdown
   - Flag questions for review
   - Progress indicator
   - Auto-save draft answers
   - Submit confirmation

3. **Results Analysis**
   - Detailed score breakdown
   - Question-by-question review
   - Time spent per question
   - Strength/weakness analysis
   - Improvement suggestions

4. **Test History Dashboard**
   - Past test attempts
   - Score trends over time
   - Best/worst categories
   - Practice recommendations

---

## 👥 User Workflows

### Workflow 1: Admin Creates Question

```
1. Admin clicks "Question Bank" in sidebar
2. Clicks "+ Add Question" button
3. Modal opens with form
4. Admin fills in:
   - Question type (MCQ)
   - Question text "What is React?"
   - Options: Library, Framework, Language, Tool
   - Correct answer: Library
   - Explanation
   - Category: JavaScript
   - Difficulty: Easy
   - Marks: 1.0
   - Tags: react, frontend
5. Clicks "Save & Approve"
6. Question added to bank (auto-approved for admins)
7. Modal closes, table refreshes
8. Success toast: "Question added successfully"
```

### Workflow 2: Instructor Creates Question

```
1. Instructor clicks "My Questions"
2. Clicks "+ Add Question"
3. Fills form (same as admin)
4. Clicks "Save"
5. Question added with status "Pending Approval"
6. Admin receives notification
7. Admin reviews question in Question Bank
8. Admin clicks "Approve" or "Reject"
9. Instructor notified of decision
10. If approved, question available in test builder
```

### Workflow 3: Admin Bulk Imports Questions

```
1. Admin clicks "Import Questions" button
2. Upload modal opens
3. Download CSV template (if needed)
4. Fill CSV with questions:
   question_text,type,options,correct_answer,difficulty,category_id
   "What is 2+2?","mcq","[2,3,4,5]","4","easy",1
5. Upload CSV file
6. System validates each row
7. Shows preview:
   - ✅ 45 questions valid
   - ❌ 3 questions failed (with errors)
8. Admin clicks "Import Valid Questions"
9. 45 questions added to bank
10. Error report shown for failed questions
11. Success toast: "45 questions imported successfully"
```

### Workflow 4: Instructor Creates Test

```
1. Instructor clicks "Tests" → "+ Create Test"
2. Test Builder opens (Step 1: Basic Info)
   - Enter test name: "JavaScript Quiz 1"
   - Generate test code: "JS-Q1-2025"
   - Select course: "JavaScript Fundamentals"
   - Add description
   - Click "Next"

3. Step 2: Question Selection
   - Choose "Auto-Select"
   - Configure distribution:
     * 10 Easy questions
     * 10 Medium questions
     * 5 Hard questions
   - Select categories: Variables, Data Types
   - Click "Generate Question Set"
   - System fetches 25 random questions
   - Review selected questions
   - Remove/replace specific questions
   - Click "Next"

4. Step 3: Settings
   - Time limit: 60 minutes
   - Passing score: 70%
   - Max attempts: 2
   - Enable randomization
   - Show results immediately: Yes
   - Add instructions
   - Set schedule: Jan 15-20
   - Click "Next"

5. Step 4: Assign Students
   - Select "Entire Course" (42 students)
   - Set due date: Jan 25
   - Enable email notification
   - Click "Publish Test & Assign"

6. System creates:
   - Test record (status: published)
   - 25 test_question mappings
   - 42 test_assignment records

7. System sends:
   - 42 email notifications to students
   - Adds test to student dashboards

8. Redirect to "My Tests" page
9. Success toast: "Test published and assigned to 42 students"
```

### Workflow 5: Student Takes Practice Test

```
1. Student clicks "Practice Tests" in sidebar
2. Clicks "+ Generate Practice Test"
3. Practice Test Builder modal opens
4. Student configures:
   - Categories: ☑ JavaScript ☑ HTML ☐ CSS
   - Difficulty: Mixed
   - Questions: 20
   - Time: 30 minutes
5. Clicks "Generate Test"
6. System:
   - Fetches 20 random questions (8 easy, 8 med, 4 hard)
   - Creates practice_test_attempt
   - Links questions
7. Test interface loads:
   - Question 1/20 displayed
   - Timer starts (30:00)
   - Answer options shown
8. Student answers questions:
   - Selects answer
   - Clicks "Next"
   - Can flag for review
   - Can navigate using sidebar
9. Clicks "Submit Test"
10. Confirmation dialog: "Are you sure?"
11. Student confirms
12. System auto-grades:
    - Compares answers with correct answers
    - Calculates score
    - Updates analytics
13. Results page loads:
    - Score: 16/20 (80%)
    - Time: 24 minutes
    - Pass/Fail: Passed
    - Question-by-question breakdown
    - Explanations shown
14. Student can:
    - Review all answers
    - See correct answers
    - Read explanations
    - Retake test
```

### Workflow 6: Student Takes Assigned Test

```
1. Student sees notification: "New test assigned"
2. Clicks notification → redirects to test
3. Test details page shows:
   - Test name, description
   - Time limit, passing score
   - Number of questions
   - Due date
   - Attempts left: 2/2
4. Clicks "Start Test"
5. Confirmation: "Once started, timer begins. Continue?"
6. Student confirms
7. System:
   - Creates assigned_test_attempt
   - Randomizes questions/options (if configured)
   - Starts timer
8. Test interface loads (similar to practice)
9. Student takes test
10. Submits test
11. System auto-grades
12. If "show immediately" enabled:
    - Results shown immediately
13. If not enabled:
    - "Results will be available after: [end date]"
14. Instructor can view results in real-time
15. Student receives grade notification
```

### Workflow 7: Instructor Views Results

```
1. Instructor clicks "Tests" → specific test
2. Clicks "View Results"
3. Results dashboard loads:
   - Overview stats (42 assigned, 38 completed)
   - Average score: 78.5%
   - Pass rate: 85.7%
   - Score distribution chart
4. Student results table shows:
   - Name, score, percentage, time, status
5. Instructor clicks "View" for John Doe
6. Individual result page loads:
   - Overall score: 92/100
   - Question-by-question review
   - Time spent per question
7. Instructor can:
   - Print result
   - Email student
   - Add comments
   - Manually adjust marks (if needed)
8. Clicks "Export All Results"
9. CSV downloaded with all student data
```

---

## 🎨 UI/UX Design Specifications

### Design System Integration

All question bank pages should follow the existing TekyPro admin design system:

**Colors:**
```css
Primary: #3b82f6 (Brand Blue)
Success: #10b981 (Green)
Warning: #f59e0b (Yellow)
Danger: #ef4444 (Red)
Background: #f9fafb (Light) / #111827 (Dark)
```

**Typography:**
```css
Headings: font-family: 'Inter', sans-serif; font-weight: 600;
Body: font-family: 'Inter', sans-serif; font-weight: 400;
Code: font-family: 'Fira Code', monospace;
```

**Components:**
- Use existing Button, Input, Modal, Badge, Table components
- Maintain gradient headers on all pages
- Follow existing sidebar/topbar layout
- Use Lucide icons consistently

**Spacing:**
```css
Containers: p-6 (24px padding)
Cards: rounded-xl, shadow-sm
Gaps: gap-4 (16px) or gap-6 (24px)
```

### Responsive Breakpoints

```javascript
sm: 640px   // Mobile
md: 768px   // Tablet
lg: 1024px  // Desktop
xl: 1280px  // Large Desktop
```

**Mobile Considerations:**
- Stack filters vertically on mobile
- Make tables horizontally scrollable
- Use accordion for question lists
- Bottom sheet modals on mobile

---

## 🔐 Security & Permissions

### Role-Based Access Control

```javascript
const permissions = {
  super_admin: {
    questions: ['create', 'read', 'update', 'delete', 'approve', 'bulk_import'],
    tests: ['create', 'read', 'update', 'delete', 'assign'],
    results: ['view_all', 'export', 'modify_grades']
  },
  admin: {
    questions: ['create', 'read', 'update', 'delete', 'approve', 'bulk_import'],
    tests: ['create', 'read', 'update', 'delete', 'assign'],
    results: ['view_all', 'export']
  },
  instructor: {
    questions: ['create', 'read', 'update_own', 'delete_own'],
    tests: ['create_own_courses', 'read_own', 'update_own', 'delete_own', 'assign_own'],
    results: ['view_own_tests', 'export_own']
  },
  student: {
    questions: ['none'],
    tests: ['view_assigned', 'take_test'],
    results: ['view_own']
  }
};
```

### Backend Middleware

```javascript
// Protect question routes
router.post('/api/questions',
  authenticate,
  authorize(['admin', 'super_admin', 'instructor']),
  createQuestion
);

// Approve question (admin only)
router.patch('/api/questions/:id/approve',
  authenticate,
  authorize(['admin', 'super_admin']),
  approveQuestion
);

// View test results (ownership check)
router.get('/api/assigned-tests/:testId/results',
  authenticate,
  checkTestOwnership,
  getTestResults
);
```

### Validation Rules

**Question Creation:**
```javascript
- question_text: min 10 chars, max 5000 chars
- options (MCQ): min 2, max 6 options
- correct_answer: must match an option
- marks: min 0.5, max 100
- time_limit_seconds: min 10, max 600
```

**Test Creation:**
```javascript
- test_name: min 5 chars, max 200 chars
- test_code: unique, alphanumeric + dash
- time_limit_minutes: min 5, max 300
- passing_score: 0-100%
- start_date < end_date
- min 1 question
```

**SQL Injection Prevention:**
```javascript
// Use parameterized queries
const questions = await QuestionBank.findAll({
  where: {
    category_id: req.query.category_id,  // Sequelize escapes
    difficulty: req.query.difficulty
  }
});

// Whitelist validation
const allowedDifficulties = ['easy', 'medium', 'hard'];
if (!allowedDifficulties.includes(difficulty)) {
  throw new Error('Invalid difficulty');
}
```

---

## ⚡ Performance Optimization

### Database Optimization

**Indexes Already Created:**
```sql
-- question_bank
INDEX idx_category (category_id)
INDEX idx_difficulty (difficulty)
INDEX idx_type (question_type)
INDEX idx_approved (is_approved)
FULLTEXT INDEX ft_question (question_text)

-- assigned_tests
INDEX idx_instructor (instructor_id)
INDEX idx_course (course_id)
INDEX idx_status (status)

-- test_assignments
INDEX idx_student (student_id)
INDEX idx_test (test_id)
INDEX idx_status (status)
```

**Query Optimization:**
```javascript
// Fetch questions with pagination
const { count, rows } = await QuestionBank.findAndCountAll({
  where: filters,
  include: [
    { model: Category, attributes: ['id', 'name'] },
    { model: User, as: 'creator', attributes: ['id', 'full_name'] }
  ],
  limit: 20,
  offset: (page - 1) * 20,
  order: [['created_at', 'DESC']]
});

// Efficient: Only fetch needed fields
// Efficient: Use includes instead of separate queries
// Efficient: Limit results
```

### Frontend Optimization

**Pagination:**
```javascript
// Load 20 questions per page (not all 1,000+)
const [questions, setQuestions] = useState([]);
const [page, setPage] = useState(1);
const limit = 20;

useEffect(() => {
  fetchQuestions({ page, limit });
}, [page]);
```

**Debounced Search:**
```javascript
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch.length >= 3) {
    fetchQuestions({ search: debouncedSearch });
  }
}, [debouncedSearch]);
```

**Lazy Loading:**
```javascript
// Load test builder only when needed
const TestBuilder = lazy(() => import('./pages/admin/TestBuilder'));

<Suspense fallback={<Spinner />}>
  <TestBuilder />
</Suspense>
```

**Caching:**
```javascript
// Cache question categories (rarely change)
const [categories, setCategories] = useState([]);

useEffect(() => {
  const cached = localStorage.getItem('categories');
  if (cached) {
    setCategories(JSON.parse(cached));
  } else {
    fetchCategories().then(data => {
      setCategories(data);
      localStorage.setItem('categories', JSON.stringify(data));
    });
  }
}, []);
```

---

## 🧪 Testing Strategy

### Unit Tests

**Question Controller Tests:**
```javascript
describe('QuestionController', () => {
  test('should create question with valid data', async () => {
    const data = {
      question_text: 'What is React?',
      question_type: 'multiple_choice',
      options: ['Library', 'Framework'],
      correct_answer: 'Library',
      category_id: 1,
      difficulty: 'easy',
      marks: 1.0
    };

    const question = await questionController.create(data);
    expect(question.id).toBeDefined();
    expect(question.question_text).toBe('What is React?');
  });

  test('should reject question with invalid data', async () => {
    const data = { question_text: 'Too short' };
    await expect(questionController.create(data))
      .rejects.toThrow('Validation error');
  });
});
```

### Integration Tests

**Test Creation Flow:**
```javascript
describe('Test Creation Flow', () => {
  test('admin creates test, adds questions, assigns to students', async () => {
    // Create test
    const test = await request(app)
      .post('/api/assigned-tests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        test_name: 'Final Exam',
        test_code: 'FINAL-2025',
        course_id: 1
      });
    expect(test.status).toBe(201);

    // Add questions
    const questions = await request(app)
      .post(`/api/assigned-tests/${test.body.data.id}/questions`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ question_ids: [1, 2, 3] });
    expect(questions.status).toBe(200);

    // Assign to students
    const assignment = await request(app)
      .post(`/api/assigned-tests/${test.body.data.id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ student_ids: [10, 11, 12] });
    expect(assignment.status).toBe(200);
    expect(assignment.body.data.assigned_to).toBe(3);
  });
});
```

### E2E Tests

**Student Takes Test:**
```javascript
describe('Student Test Taking Flow', () => {
  test('student generates practice test, answers questions, submits', async () => {
    // Generate test
    const test = await page.click('#generate-practice-test');
    await page.fill('#question-count', '10');
    await page.click('#start-test');

    // Answer questions
    await page.click('[data-answer="option-a"]');
    await page.click('#next-question');
    // ... answer remaining questions

    // Submit
    await page.click('#submit-test');
    await page.click('#confirm-submit');

    // Check results
    await expect(page.locator('#test-score')).toBeVisible();
    await expect(page.locator('#test-percentage')).toContainText('%');
  });
});
```

---

## 🔌 Integration Points

### Email Notifications

**When to Send:**
```javascript
// Test assigned to student
await emailService.sendTestAssignment({
  to: student.email,
  student_name: student.full_name,
  test_name: test.test_name,
  due_date: assignment.due_date,
  test_link: `${FRONTEND_URL}/tests/${test.id}`
});

// Test results available
await emailService.sendTestResults({
  to: student.email,
  student_name: student.full_name,
  test_name: test.test_name,
  score: attempt.score,
  percentage: attempt.percentage,
  passed: attempt.percentage >= test.passing_score,
  results_link: `${FRONTEND_URL}/test-results/${attempt.id}`
});

// Question approval status
await emailService.sendQuestionApproval({
  to: instructor.email,
  instructor_name: instructor.full_name,
  question_text: question.question_text.substring(0, 100),
  status: 'approved',  // or 'rejected'
  reason: rejectionReason
});
```

### Activity Logging

**Log Important Actions:**
```javascript
// Question created
await ActivityLog.create({
  user_id: req.user.id,
  action: 'question_create',
  entity_type: 'question',
  entity_id: question.id,
  metadata: {
    question_type: question.question_type,
    category: question.category_id,
    difficulty: question.difficulty
  },
  ip_address: req.ip
});

// Test published
await ActivityLog.create({
  user_id: req.user.id,
  action: 'test_publish',
  entity_type: 'test',
  entity_id: test.id,
  metadata: {
    test_name: test.test_name,
    questions_count: test.total_questions,
    assigned_to: assignmentCount
  }
});

// Student completed test
await ActivityLog.create({
  user_id: student.id,
  action: 'test_complete',
  entity_type: 'test_attempt',
  entity_id: attempt.id,
  metadata: {
    test_id: test.id,
    score: attempt.score,
    percentage: attempt.percentage,
    passed: attempt.percentage >= test.passing_score
  }
});
```

### Analytics Integration

**Track Metrics:**
```javascript
// Update question analytics after each use
await QuestionBank.update({
  times_used: Sequelize.literal('times_used + 1'),
  times_correct: isCorrect
    ? Sequelize.literal('times_correct + 1')
    : Sequelize.literal('times_correct'),
  times_incorrect: !isCorrect
    ? Sequelize.literal('times_incorrect + 1')
    : Sequelize.literal('times_incorrect'),
  average_time_seconds: Sequelize.literal(
    `(average_time_seconds * times_used + ${timeSpent}) / (times_used + 1)`
  )
}, {
  where: { id: question.id }
});

// Calculate accuracy rate
const accuracyRate = (question.times_correct / question.times_used) * 100;

// Identify weak questions (low accuracy)
const weakQuestions = await QuestionBank.findAll({
  where: {
    times_used: { [Op.gte]: 10 },  // Min 10 uses
    Sequelize.literal(
      '(times_correct / times_used * 100) < 40'  // < 40% accuracy
    )
  }
});
```

### Certificate Generation

**Auto-Issue Certificate:**
```javascript
// When student passes assigned test
if (attempt.percentage >= test.passing_score) {
  const certificate = await Certificate.create({
    student_id: student.id,
    course_id: test.course_id,
    test_id: test.id,
    student_name: student.full_name,
    course_title: course.title,
    score: attempt.percentage,
    issue_date: new Date(),
    certificate_id: generateCertificateId()
  });

  // Send email with certificate
  await emailService.sendCertificate({
    to: student.email,
    student_name: student.full_name,
    course_title: course.title,
    certificate_url: certificate.certificate_url
  });
}
```

---

## 📅 Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Day 1-2: Question Bank Management**
- [ ] Create `/admin/questions` page
- [ ] Implement question list with filters
- [ ] Add pagination and search
- [ ] Create Add/Edit Question modal
- [ ] Implement question approval workflow
- [ ] Add bulk import interface

**Day 3-4: Test Management**
- [ ] Create `/admin/tests` page (My Tests list)
- [ ] Create Test Builder page (Step 1-2)
- [ ] Implement question selection (manual + auto)
- [ ] Add test preview functionality

**Day 5-7: Test Creation Complete**
- [ ] Complete Test Builder (Step 3-4)
- [ ] Implement test settings configuration
- [ ] Add student assignment interface
- [ ] Create test publish workflow
- [ ] Add draft/published status management

### Phase 2: Results & Analytics (Week 2)

**Day 1-3: Results Dashboard**
- [ ] Create test results dashboard page
- [ ] Implement overview statistics
- [ ] Add score distribution chart
- [ ] Create student results table
- [ ] Add CSV export functionality

**Day 4-5: Individual Results**
- [ ] Create individual result detail page
- [ ] Implement question-by-question review
- [ ] Add print/PDF export
- [ ] Create email result feature

**Day 6-7: Analytics**
- [ ] Add question effectiveness analytics
- [ ] Create weak question identification
- [ ] Implement student performance trends
- [ ] Add category-wise analysis

### Phase 3: Student Interface (Week 3)

**Day 1-2: Practice Test Builder**
- [ ] Create visual practice test generator
- [ ] Add category selection UI
- [ ] Implement difficulty slider
- [ ] Add question count and time config

**Day 3-4: Test Taking Interface**
- [ ] Create test taking page
- [ ] Implement timer and navigation
- [ ] Add flag for review feature
- [ ] Create auto-save functionality

**Day 5-7: Results & History**
- [ ] Enhance results page with analytics
- [ ] Create test history dashboard
- [ ] Add performance trends
- [ ] Implement review wrong answers feature

### Phase 4: Polish & Optimization (Week 4)

**Day 1-2: UX Improvements**
- [ ] Add loading states everywhere
- [ ] Implement optimistic UI updates
- [ ] Add keyboard shortcuts
- [ ] Improve mobile responsiveness

**Day 3-4: Performance**
- [ ] Optimize database queries
- [ ] Add caching layer
- [ ] Implement lazy loading
- [ ] Add pagination everywhere

**Day 5-7: Testing & Documentation**
- [ ] Write comprehensive tests
- [ ] Create user documentation
- [ ] Record video tutorials
- [ ] Conduct user testing
- [ ] Fix bugs and polish

---

## ✅ Acceptance Criteria

### Admin Panel

**Question Bank:**
- [ ] Can create individual questions
- [ ] Can bulk import from CSV
- [ ] Can search and filter questions
- [ ] Can approve/reject instructor questions
- [ ] Can edit and delete questions
- [ ] Can view question analytics
- [ ] Can export questions to CSV

**Test Management:**
- [ ] Can create tests with wizard
- [ ] Can select questions manually
- [ ] Can auto-select questions by criteria
- [ ] Can configure all test settings
- [ ] Can assign to students (individual or bulk)
- [ ] Can view test status (draft/published)
- [ ] Can clone existing tests
- [ ] Can archive tests

**Results:**
- [ ] Can view all student results
- [ ] Can see score distribution
- [ ] Can export results to CSV
- [ ] Can view individual student answers
- [ ] Can print results
- [ ] Can email results to students

### Instructor Panel

**Question Management:**
- [ ] Can create questions (pending approval)
- [ ] Can view own questions
- [ ] Can edit own questions
- [ ] Cannot approve own questions

**Test Management:**
- [ ] Can create tests for own courses
- [ ] Can assign to own students
- [ ] Can view own test results
- [ ] Cannot access other instructors' tests

### Student Panel

**Practice Tests:**
- [ ] Can generate practice tests
- [ ] Can configure test parameters
- [ ] Can take unlimited practice tests
- [ ] Can review results with explanations
- [ ] Can retake tests

**Assigned Tests:**
- [ ] Can view assigned tests
- [ ] Can see test details and due dates
- [ ] Can take test within time limit
- [ ] Can view results (if allowed)
- [ ] Can retake (if allowed)

---

## 🎯 Success Metrics

**Feature Adoption:**
- 80%+ instructors create at least 1 test
- 90%+ students take at least 1 practice test
- Average 5+ questions per instructor per month

**Engagement:**
- 60%+ practice test completion rate
- 85%+ assigned test completion rate
- 50%+ students retake practice tests

**Quality:**
- Question approval rate > 85%
- Average question accuracy rate 60-75% (ideal range)
- Student satisfaction > 4.0/5.0

**Performance:**
- Question search < 500ms
- Test generation < 2 seconds
- Auto-grading < 1 second per question
- Results page load < 1 second

---

## 📝 Final Notes

### Critical Reminders

1. **Backend is 100% Ready**: All APIs, models, routes exist and are tested
2. **Only Frontend Missing**: UI components need to be built
3. **Follow Design System**: Use existing TekyPro components and patterns
4. **Security First**: Implement proper authorization on all endpoints
5. **Performance Matters**: Use pagination, debouncing, lazy loading
6. **Mobile Responsive**: Ensure works on all devices
7. **Test Thoroughly**: Write tests before marking complete
8. **Document Everything**: User guides and technical docs

### Don't Forget

- Add navigation items to sidebar
- Update dashboard with quick stats
- Send email notifications
- Log important actions
- Update analytics
- Handle edge cases
- Show appropriate loading states
- Display helpful error messages
- Add keyboard shortcuts
- Support dark mode

---

## 🚀 Ready to Build!

This architecture document provides everything needed to implement the Question Bank & Exam Management System. The backend is complete and production-ready. The frontend is the only missing piece.

**Estimated Effort:**
- Admin Panel: 2-3 weeks
- Instructor Panel: 1 week
- Student Panel: 1 week
- Testing & Polish: 1 week

**Total: 5-6 weeks for complete implementation**

With this document, development can proceed systematically without losing track of any features or requirements.

---

**Document Version:** 1.0
**Last Updated:** December 25, 2025
**Status:** Ready for Implementation
**Next Action:** Begin Phase 1 - Foundation (Question Bank Management UI)
