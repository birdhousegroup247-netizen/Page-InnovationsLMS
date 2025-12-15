# TekyPro LMS - Database Structure Diagram

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TEKYPRO LMS DATABASE                            │
│                              30 Tables                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                      1. AUTHENTICATION & USERS                            │
└───────────────────────────────────────────────────────────────────────────┘

    ┌────────────────┐
    │     users      │
    ├────────────────┤
    │ • id (PK)      │
    │ • email        │
    │ • password_hash│
    │ • google_id    │
    │ • role         │ ◄────┐
    │ • full_name    │      │
    │ • is_active    │      │
    └────────┬───────┘      │
             │              │
             │ 1:N          │
             ▼              │
    ┌────────────────┐      │
    │ password_resets│      │
    ├────────────────┤      │
    │ • id (PK)      │      │
    │ • user_id (FK) │──────┘
    │ • reset_token  │
    │ • expires_at   │
    └────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                    2. COURSE STRUCTURE & CONTENT                          │
└───────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   categories     │
    ├──────────────────┤
    │ • id (PK)        │◄────┐
    │ • name           │     │ Self-referencing
    │ • parent_cat_id  │─────┘ (for sub-categories)
    │ • icon           │
    │ • color          │
    └────────┬─────────┘
             │ 1:N
             ▼
    ┌──────────────────┐         ┌──────────────────────┐
    │     courses      │         │ course_prerequisites │
    ├──────────────────┤    ┌───►├──────────────────────┤
    │ • id (PK)        │◄───┤    │ • id (PK)            │
    │ • title          │    │    │ • course_id (FK)     │
    │ • slug           │    │    │ • prereq_course_id   │
    │ • description    │    │    └──────────────────────┘
    │ • category_id(FK)│────┘
    │ • instructor_id  │◄───────[users.id]
    │ • difficulty     │
    │ • status         │
    │ • avg_rating     │
    └────────┬─────────┘
             │ 1:N
             ▼
    ┌──────────────────┐
    │ course_modules   │
    ├──────────────────┤
    │ • id (PK)        │
    │ • course_id (FK) │
    │ • title          │
    │ • order_index    │
    └────────┬─────────┘
             │ 1:N
             ▼
    ┌──────────────────┐
    │ module_contents  │
    ├──────────────────┤
    │ • id (PK)        │
    │ • module_id (FK) │
    │ • content_type   │ (video/document/article)
    │ • title          │
    │ • youtube_id     │
    │ • document_url   │
    │ • article_content│
    │ • order_index    │
    └──────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                    3. ENROLLMENTS & PROGRESS                              │
└───────────────────────────────────────────────────────────────────────────┘

    [users] ────┐
                │ N:M (through enrollments)
                ▼
    ┌──────────────────┐
    │   enrollments    │
    ├──────────────────┤
    │ • id (PK)        │
    │ • student_id(FK) │◄────[users.id]
    │ • course_id (FK) │◄────[courses.id]
    │ • progress_%     │
    │ • completed_at   │
    └──────────────────┘

    [users] ────┐
                │ N:M (through content_progress)
                ▼
    ┌──────────────────┐
    │ content_progress │
    ├──────────────────┤
    │ • id (PK)        │
    │ • student_id(FK) │◄────[users.id]
    │ • content_id(FK) │◄────[module_contents.id]
    │ • completed      │
    │ • watch_time     │
    │ • last_position  │
    └──────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                    4. QUESTION BANK & TESTING                             │
└───────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  question_bank   │
    ├──────────────────┤
    │ • id (PK)        │◄────┐
    │ • question_text  │     │
    │ • question_type  │     │
    │ • options (JSON) │     │
    │ • correct_answer │     │
    │ • category_id(FK)│     │
    │ • difficulty     │     │
    │ • tags (JSON)    │     │
    │ • created_by(FK) │     │
    └────────┬─────────┘     │
             │                │
             │                │
    ┌────────┴───────────────────────────────────────┐
    │                                                 │
    │ PRACTICE TESTS                 ASSIGNED TESTS  │
    ▼                                                 ▼

┌──────────────────┐                    ┌──────────────────┐
│practice_test     │                    │ assigned_tests   │
│_attempts         │                    ├──────────────────┤
├──────────────────┤                    │ • id (PK)        │
│ • id (PK)        │                    │ • test_name      │
│ • student_id(FK) │◄────[users]        │ • test_code      │
│ • question_count │                    │ • instructor_id  │◄────[users]
│ • difficulty     │                    │ • course_id      │◄────[courses]
│ • categories(JSON)│                   │ • total_marks    │
│ • score          │                    │ • time_limit     │
│ • percentage     │                    │ • passing_score  │
│ • status         │                    │ • settings...    │
└────────┬─────────┘                    └────────┬─────────┘
         │                                       │
         │ 1:N                                   │ 1:N
         ▼                                       ▼
┌──────────────────┐                    ┌──────────────────┐
│practice_test     │                    │assigned_test     │
│_questions        │                    │_questions        │
├──────────────────┤                    ├──────────────────┤
│ • attempt_id(FK) │                    │ • test_id (FK)   │
│ • question_id(FK)│──────┐             │ • question_id(FK)│──────┐
└──────────────────┘      │             └──────────────────┘      │
                          │                     │                 │
         ┌────────────────┘                     │ 1:N             │
         │                                      ▼                 │
         │                           ┌──────────────────┐         │
         │                           │ test_assignments │         │
         │                           ├──────────────────┤         │
         │                           │ • id (PK)        │         │
         │                           │ • test_id (FK)   │         │
         │                           │ • student_id(FK) │◄────[users]
         │                           │ • due_date       │         │
         │                           │ • status         │         │
         │                           └────────┬─────────┘         │
         │                                    │ 1:N               │
         │                                    ▼                   │
┌────────▼─────────┐              ┌──────────────────┐           │
│practice_test     │              │assigned_test     │           │
│_answers          │              │_attempts         │           │
├──────────────────┤              ├──────────────────┤           │
│ • attempt_id(FK) │              │ • id (PK)        │           │
│ • question_id(FK)│              │ • assignment_id  │           │
│ • student_answer │              │ • attempt_number │           │
│ • is_correct     │              │ • score          │           │
│ • marks_awarded  │              │ • percentage     │           │
└──────────────────┘              └────────┬─────────┘           │
                                           │ 1:N                 │
                                           ▼                     │
                                  ┌──────────────────┐           │
                                  │assigned_test     │           │
                                  │_answers          │           │
                                  ├──────────────────┤           │
                                  │ • attempt_id(FK) │           │
                                  │ • question_id(FK)│───────────┘
                                  │ • student_answer │
                                  │ • is_correct     │
                                  └──────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                    5. KNOWLEDGE CENTER                                    │
└───────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ knowledge        │
    │ _articles        │
    ├──────────────────┤
    │ • id (PK)        │
    │ • title          │
    │ • slug           │
    │ • content        │
    │ • category_id(FK)│◄────[categories]
    │ • author_id (FK) │◄────[users]
    │ • tags (JSON)    │
    │ • views          │
    │ • status         │
    └────────┬─────────┘
             │ N:M
             ▼
    ┌──────────────────┐
    │  article         │
    │  _bookmarks      │
    ├──────────────────┤
    │ • id (PK)        │
    │ • student_id(FK) │◄────[users]
    │ • article_id(FK) │
    │ • note           │
    └──────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                    6. STUDENT ENGAGEMENT                                  │
└───────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ lesson           │
    │ _bookmarks       │
    ├──────────────────┤
    │ • id (PK)        │
    │ • student_id(FK) │◄────[users]
    │ • content_id(FK) │◄────[module_contents]
    │ • note           │
    │ • timestamp      │
    └──────────────────┘

    ┌──────────────────┐
    │ lesson           │
    │ _questions       │
    ├──────────────────┤
    │ • id (PK)        │
    │ • content_id(FK) │◄────[module_contents]
    │ • student_id(FK) │◄────[users]
    │ • question_text  │
    │ • is_answered    │
    └────────┬─────────┘
             │ 1:N
             ▼
    ┌──────────────────┐
    │ question         │
    │ _replies         │
    ├──────────────────┤
    │ • id (PK)        │
    │ • question_id(FK)│
    │ • user_id (FK)   │◄────[users]
    │ • reply_text     │
    │ • is_instructor  │
    └──────────────────┘

    ┌──────────────────┐
    │ course_reviews   │
    ├──────────────────┤
    │ • id (PK)        │
    │ • course_id (FK) │◄────[courses]
    │ • student_id(FK) │◄────[users]
    │ • rating (1-5)   │
    │ • review_text    │
    └──────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                    7. CERTIFICATES                                        │
└───────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │  certificates    │
    ├──────────────────┤
    │ • id (PK)        │
    │ • certificate_id │ (e.g., TEKYPRO-2025-001234)
    │ • student_id(FK) │◄────[users]
    │ • course_id (FK) │◄────[courses]
    │ • student_name   │
    │ • course_title   │
    │ • issue_date     │
    │ • certificate_url│
    └──────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                    8. COMMUNICATION                                       │
└───────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ course           │
    │ _announcements   │
    ├──────────────────┤
    │ • id (PK)        │
    │ • course_id (FK) │◄────[courses]
    │ • instructor_id  │◄────[users]
    │ • title          │
    │ • message        │
    └──────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                    9. SYSTEM & ANALYTICS                                  │
└───────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │ activity_logs    │
    ├──────────────────┤
    │ • id (PK)        │
    │ • user_id (FK)   │◄────[users]
    │ • action         │ (login, course_complete, etc)
    │ • entity_type    │
    │ • entity_id      │
    │ • metadata(JSON) │
    └──────────────────┘

    ┌──────────────────┐
    │ notifications    │
    ├──────────────────┤
    │ • id (PK)        │
    │ • user_id (FK)   │◄────[users]
    │ • type           │
    │ • title          │
    │ • message        │
    │ • link           │
    │ • is_read        │
    └──────────────────┘
```

## Key Relationships Summary

### One-to-Many (1:N)
- `users` → `password_resets`
- `categories` → `categories` (self-referencing)
- `categories` → `courses`
- `courses` → `course_modules`
- `course_modules` → `module_contents`
- `users` (instructor) → `courses`
- `users` (instructor) → `assigned_tests`
- `assigned_tests` → `test_assignments`
- `test_assignments` → `assigned_test_attempts`

### Many-to-Many (N:M)
- `users` ↔ `courses` (through `enrollments`)
- `users` ↔ `module_contents` (through `content_progress`)
- `users` ↔ `knowledge_articles` (through `article_bookmarks`)
- `assigned_tests` ↔ `question_bank` (through `assigned_test_questions`)
- `practice_test_attempts` ↔ `question_bank` (through `practice_test_questions`)

### Self-Referencing
- `categories.parent_category_id` → `categories.id` (for sub-categories)
- `courses` → `course_prerequisites` → `courses` (for course dependencies)

## Data Flow Examples

### 1. Student Takes a Course
```
User (Student)
  → Enrolls in Course (enrollments)
  → Views Module Content (module_contents)
  → Tracks Progress (content_progress)
  → Completes Course (enrollment.completed_at)
  → Receives Certificate (certificates)
```

### 2. Student Takes a Test
```
Instructor Creates Test (assigned_tests)
  → Adds Questions (assigned_test_questions from question_bank)
  → Assigns to Students (test_assignments)
  → Student Starts Test (assigned_test_attempts)
  → Student Submits Answers (assigned_test_answers)
  → System Auto-grades (updates attempt.score)
  → Student Views Results
```

### 3. Practice Test Flow
```
Student Generates Practice Test (practice_test_attempts)
  → System Selects Random Questions (practice_test_questions)
  → Student Answers Questions (practice_test_answers)
  → System Calculates Score
  → Student Reviews Answers
```

## Index Strategy

### Primary Indexes (Auto-created)
- All `id` columns are PRIMARY KEYs with AUTO_INCREMENT

### Foreign Key Indexes
- All `*_id` columns referencing other tables

### Search Indexes (FULLTEXT)
- `courses`: title, description
- `knowledge_articles`: title, content
- `question_bank`: question_text

### Performance Indexes
- `users.email` (UNIQUE)
- `courses.slug` (UNIQUE)
- `categories.parent_category_id`
- `enrollments(student_id, course_id)` (UNIQUE composite)
- `content_progress(student_id, content_id)` (UNIQUE composite)

---

**Total Storage Estimate** (with 10,000 students, 100 courses):
- Users & Auth: ~5 MB
- Courses & Content: ~50 MB
- Progress Tracking: ~200 MB
- Question Bank: ~100 MB
- Test Attempts: ~500 MB
- Knowledge Center: ~50 MB
- Certificates & Logs: ~100 MB

**Estimated Total**: ~1 GB (easily fits in free tier limits)
