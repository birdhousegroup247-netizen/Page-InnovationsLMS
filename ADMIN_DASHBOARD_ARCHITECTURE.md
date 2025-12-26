# 🎯 TekyPro Admin Dashboard - Architectural Overview

**For:** Client/Stakeholder Review
**Date:** December 26, 2025
**Purpose:** Complete explanation of the Admin Dashboard structure and capabilities

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Dashboard Tab](#1-dashboard-tab)
3. [Users Tab](#2-users-tab)
4. [Courses Tab](#3-courses-tab)
5. [Categories Tab](#4-categories-tab)
6. [Question Bank Tab](#5-question-bank-tab)
7. [Tests Tab](#6-tests-tab)
8. [Instructor Applications Tab](#7-instructor-applications-tab)
9. [Activity Tab](#8-activity-tab)
10. [System Architecture](#system-architecture)
11. [User Flow Diagrams](#user-flow-diagrams)

---

## OVERVIEW

### What is the Admin Dashboard?

The **Admin Dashboard** is the central control panel for managing the entire TekyPro Learning Management System. It's a separate web application accessible only to administrators and super administrators who oversee the platform.

### Who Uses It?

- **Super Administrators** - Full system access, can manage everything
- **Administrators** - Platform management, limited access to critical settings

### Access URL

- **Admin Portal:** `http://localhost:5174` (or your production domain)
- **Student/Instructor Portal:** `http://localhost:5173` (separate application)

### Key Principle: Centralized Management

All platform management happens here - from creating courses to managing users, from building tests to reviewing instructor applications. Think of it as the "mission control" for your learning platform.

---

## 1. DASHBOARD TAB

### 🎯 Purpose
The **Dashboard** is your command center - it provides a real-time overview of everything happening on the platform at a glance.

### What You See

#### Key Metrics (Top Cards)
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  Total Users    │  Active Courses │ Total Questions │ Pending Reviews │
│      1,247      │       23        │      856        │       12        │
│  +15 this week  │   +2 new        │  +45 new        │   4 urgent      │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**What It Tells You:**
- **Total Users:** How many students, instructors, and admins are registered
- **Active Courses:** Currently available courses students can enroll in
- **Total Questions:** Questions available in the question bank for tests
- **Pending Reviews:** Instructor applications and questions awaiting approval

#### Charts & Graphs
1. **User Growth Over Time**
   - Line chart showing registration trends
   - Helps identify growth patterns

2. **Course Enrollment Distribution**
   - Bar chart showing which courses are most popular
   - Helps identify content demand

3. **Test Performance Analytics**
   - Average scores across all tests
   - Pass/fail rates
   - Helps measure content effectiveness

4. **Recent Activity Feed**
   - Latest user registrations
   - New course enrollments
   - Test completions
   - Instructor applications

### Who Uses This Tab?
- **Daily:** Admins checking system health
- **Weekly:** Management reviewing growth metrics
- **Monthly:** Planning based on trends

### Key Actions
- Monitor platform health
- Identify trends and patterns
- Spot issues (e.g., drop in enrollments)
- Quick access to pending tasks

---

## 2. USERS TAB

### 🎯 Purpose
Manage all users on the platform - students, instructors, and administrators.

### What You Can Do

#### User Management Dashboard
```
┌──────────────────────────────────────────────────────────────┐
│  Search: [                    ]  Role: [All ▼]  Status: [Active ▼]
├──────────────────────────────────────────────────────────────┤
│ Name              | Email              | Role       | Status  │
│ John Doe          | john@email.com    | Student    | Active  │
│ Jane Smith        | jane@email.com    | Instructor | Active  │
│ Admin User        | admin@tekypro.com | Admin      | Active  │
└──────────────────────────────────────────────────────────────┘
```

#### 1. **View All Users**
- Complete list of everyone on the platform
- Searchable by name or email
- Filter by role (Student/Instructor/Admin)
- Filter by status (Active/Suspended)

#### 2. **Create New Users**
**Students:**
- Manual registration (if email verification is bypassed)
- Bulk import via CSV (future feature)

**Instructors:**
- Manually approve and create instructor accounts
- Set instructor permissions

**Administrators:**
- Create new admin accounts (Super Admin only)
- Assign admin roles and permissions

#### 3. **Manage User Details**
For each user, you can:
- **View Profile:** See complete user information
- **Edit Information:** Update name, email, phone, etc.
- **Change Role:** Promote student to instructor, etc.
- **Suspend Account:** Temporarily disable access
- **Delete Account:** Permanently remove user (with data cleanup)
- **Reset Password:** Help users who forgot passwords
- **View Activity:** See login history, course enrollments, test attempts

#### 4. **User Statistics**
- Total students, instructors, admins
- Active vs inactive users
- Recent registrations
- User growth trends

### Real-World Use Cases

**Scenario 1: New Student Registration**
```
Student registers → Email verification →
Admin reviews (if needed) → Account activated
```

**Scenario 2: Promote Student to Instructor**
```
Student applies → Admin reviews →
Admin promotes to Instructor → New permissions granted
```

**Scenario 3: Suspend Problematic User**
```
Violation detected → Admin investigates →
Admin suspends account → User cannot login
```

### Who Uses This Tab?
- **Daily:** Admins managing support tickets
- **Weekly:** Reviewing new registrations
- **As Needed:** Handling user issues, role changes

---

## 3. COURSES TAB

### 🎯 Purpose
Create, manage, and organize all courses on the platform. This is where your educational content is structured.

### What You Can Do

#### Course Management Dashboard
```
┌──────────────────────────────────────────────────────────────────┐
│  [+ Create Course]  Search: [          ]  Category: [All ▼]      │
├──────────────────────────────────────────────────────────────────┤
│ Course Name         | Category    | Questions | Status | Actions │
│ MySQL Fundamentals  | Database    | 45 (40✓ 5⏳) | Active | [Edit] │
│ PostgreSQL Advanced | Database    | 32 (30✓ 2⏳) | Active | [Edit] │
│ JavaScript ES6      | Programming | 28 (28✓)    | Active | [Edit] │
└──────────────────────────────────────────────────────────────────┘
```

#### 1. **View All Courses**
Each course displays:
- **Course Name:** E.g., "MySQL Fundamentals"
- **Category:** E.g., "Database", "Programming"
- **Thumbnail:** Course image/icon
- **Question Count:** How many questions belong to this course
  - **40✓** = 40 approved questions
  - **5⏳** = 5 pending approval
- **Status:** Published/Draft
- **Enrollment Count:** How many students enrolled

#### 2. **Create New Course**
When creating a course, you provide:
- **Basic Information:**
  - Course Title (e.g., "MySQL Fundamentals")
  - Description (what students will learn)
  - Category (Database, Programming, etc.)
  - Difficulty Level (Beginner/Intermediate/Advanced)

- **Visual Assets:**
  - Thumbnail/Cover Image
  - Course Icon

- **Pricing (if applicable):**
  - Free or Paid
  - Price amount

- **Course Content:**
  - Course outline/syllabus
  - Learning objectives
  - Prerequisites

#### 3. **Edit Existing Courses**
- Update course information
- Change category
- Modify description
- Update thumbnail
- Add/remove course materials

#### 4. **Course-Question Integration** ✨ NEW
**This is the new feature we just built!**

Each course shows exactly how many questions it has:
- **Total Questions:** 45
- **Approved:** 40 ✓ (ready for tests)
- **Pending:** 5 ⏳ (awaiting admin approval)

**Why This Matters:**
- Know which courses have enough questions for tests
- Identify courses that need more questions
- See question approval status at a glance

#### 5. **Publish/Unpublish Courses**
- **Published:** Visible to students, can enroll
- **Draft:** Hidden from students, admin-only view
- **Archived:** No longer offered, but preserved

### Course Lifecycle

```
CREATE COURSE
    ↓
Add Course Details
    ↓
Create Questions for Course ← (Question Bank Tab)
    ↓
Build Tests from Course Questions ← (Tests Tab)
    ↓
Publish Course
    ↓
Students Enroll ← (Student Portal)
    ↓
Students Take Tests
    ↓
Track Performance ← (Dashboard)
```

### Real-World Use Cases

**Scenario 1: Launch New MySQL Course**
```
1. Create course: "MySQL Advanced Joins"
2. Add description and thumbnail
3. Assign to "Database" category
4. Create 50 questions (Question Bank)
5. Build 5 practice tests
6. Publish course
7. Students can now enroll and practice
```

**Scenario 2: Update Existing Course**
```
1. Student feedback: "Need more JOIN examples"
2. Admin edits course
3. Add 10 more questions about JOINs
4. Update course description
5. Save changes
6. Students see updated content
```

### Who Uses This Tab?
- **Weekly:** Adding new courses
- **Monthly:** Reviewing course performance
- **As Needed:** Updating based on feedback

---

## 4. CATEGORIES TAB

### 🎯 Purpose
Organize courses into logical groups (e.g., Database, Programming, Web Development). Think of categories as "folders" for your courses.

### What You Can Do

#### Category Management
```
┌──────────────────────────────────────────────────────┐
│  [+ Create Category]  Search: [          ]          │
├──────────────────────────────────────────────────────┤
│ Category Name   | Description        | Courses Count │
│ Database        | SQL & NoSQL topics | 15 courses    │
│ Programming     | General coding     | 23 courses    │
│ Web Development | Frontend & Backend | 18 courses    │
│ Cloud Computing | AWS, Azure, GCP    | 8 courses     │
└──────────────────────────────────────────────────────┘
```

#### 1. **Create Categories**
- **Category Name:** E.g., "Database Technologies"
- **Description:** What courses belong here
- **Icon/Color:** Visual identification
- **Slug:** URL-friendly name (e.g., "database-technologies")

#### 2. **Manage Categories**
- Edit category details
- Merge categories
- Delete empty categories
- Reorder categories

#### 3. **View Category Statistics**
- How many courses in each category
- Most popular categories
- Categories needing more content

### Why Categories Matter

**For Students:**
- Easier course discovery
- Browse by topic of interest
- Clear content organization

**For Admins:**
- Organize content logically
- Identify content gaps
- Plan course development

**For Instructors:**
- Know where to contribute questions
- Understand content structure

### Category Examples

```
Database
├── MySQL Fundamentals
├── PostgreSQL Advanced
├── MongoDB Basics
└── Database Design

Programming
├── JavaScript ES6
├── Python for Beginners
├── Java OOP
└── C++ Advanced

Web Development
├── HTML & CSS Basics
├── React Fundamentals
├── Node.js Backend
└── Full Stack Projects
```

### Real-World Use Cases

**Scenario: Organizing New Content**
```
You want to add cloud computing courses:
1. Create "Cloud Computing" category
2. Add description: "AWS, Azure, GCP, DevOps"
3. Create courses under this category
4. Students can now filter by "Cloud Computing"
```

---

## 5. QUESTION BANK TAB

### 🎯 Purpose
The **Question Bank** is your repository of all test questions. Think of it as a library of questions that can be used to build tests.

### What You Can Do

#### Question Bank Dashboard
```
┌────────────────────────────────────────────────────────────────────┐
│  [+ Add Question]  Search: [        ]  Course: [All ▼]  Status: [All ▼]
├────────────────────────────────────────────────────────────────────┤
│ Question Text                    | Course      | Diff | Type | Status│
│ What is a PRIMARY KEY in SQL?    | MySQL       | Easy | MC   | ✓     │
│ Explain INNER JOIN vs LEFT JOIN  | PostgreSQL  | Med  | MC   | ⏳    │
│ JavaScript uses strict mode by.. | JavaScript  | Hard | T/F  | ✓     │
└────────────────────────────────────────────────────────────────────┘
```

#### 1. **Create Questions**

**Question Types Supported:**
- **Multiple Choice:** 4 options, 1 correct answer
- **True/False:** Binary choice
- **Fill in the Blank:** Type the answer

**For Each Question, You Provide:**
- **Question Text:** The actual question
- **Course:** Which course this question belongs to ✨ NEW
- **Category:** Optional sub-categorization
- **Difficulty:** Easy, Medium, Hard
- **Correct Answer:** The right answer
- **Options:** Multiple choice options (if applicable)
- **Explanation:** Why the answer is correct (shown after test)
- **Marks:** Point value (1-10 points)
- **Time Limit:** Seconds allowed per question

**Example Question:**
```
Question: What does SQL stand for?
Course: MySQL Fundamentals ← REQUIRED
Category: SQL Basics
Difficulty: Easy
Type: Multiple Choice

Options:
A) Structured Query Language ✓ CORRECT
B) Simple Question Language
C) System Query Language
D) Standard Question Language

Explanation: SQL stands for Structured Query Language,
used to manage and manipulate relational databases.

Marks: 1
Time Limit: 30 seconds
```

#### 2. **Filter & Search Questions**
- **By Course:** Show only MySQL questions ✨ NEW
- **By Category:** Database, Programming, etc.
- **By Difficulty:** Easy, Medium, Hard
- **By Type:** Multiple Choice, T/F, Fill-in-Blank
- **By Status:** Approved, Pending Review
- **Search:** Find specific questions by keyword

#### 3. **Review & Approve Questions**

**Question Sources:**
- **Admin-Created:** Questions created by admins (auto-approved)
- **Instructor-Contributed:** Questions submitted by instructors (pending approval)

**Approval Workflow:**
```
Instructor Creates Question
    ↓
Question Status: Pending Review ⏳
    ↓
Admin Reviews Question
    ↓
    ├── Approve ✓ → Available for tests
    └── Reject ✗ → Instructor notified
```

**Review Checklist:**
- Is the question clear and grammatically correct?
- Is the answer accurate?
- Are the options (for MC) plausible and distinct?
- Does it match the course topic?
- Is the difficulty level appropriate?

#### 4. **Edit/Delete Questions**
- Update question text
- Fix typos or errors
- Change difficulty
- Update explanations
- Delete outdated questions

#### 5. **Question Statistics** ✨ NEW
View on **Courses Tab:**
- MySQL Fundamentals: **45 questions (40✓ 5⏳)**
  - 40 approved, ready for tests
  - 5 pending review

**Why This Matters:**
- Know if you have enough questions for a course
- See which courses need more questions
- Track instructor contributions

### Question Organization: Before vs After

**BEFORE (Old System):**
```
Question Bank
├── Database Category
│   ├── MySQL question
│   ├── PostgreSQL question
│   └── MongoDB question
└── Programming Category
    ├── JavaScript question
    └── Python question

Problem: Can't distinguish MySQL from PostgreSQL!
```

**AFTER (New System):** ✨
```
Question Bank
├── MySQL Fundamentals Course
│   ├── What is PRIMARY KEY? (Easy)
│   ├── Explain INNER JOIN (Medium)
│   └── Optimize this query (Hard)
│
├── PostgreSQL Advanced Course
│   ├── What is JSONB? (Medium)
│   └── Explain VACUUM (Hard)
│
└── JavaScript ES6 Course
    ├── What is arrow function? (Easy)
    └── Explain async/await (Medium)

Solution: Questions clearly belong to specific courses!
```

### Real-World Use Cases

**Scenario 1: Building Question Library for New Course**
```
1. Create "MySQL Fundamentals" course
2. Add 50 questions:
   - 20 Easy (basics: SELECT, WHERE)
   - 20 Medium (JOINs, GROUP BY)
   - 10 Hard (subqueries, optimization)
3. All questions assigned to "MySQL Fundamentals"
4. Now ready to build tests!
```

**Scenario 2: Instructor Contributes Questions**
```
1. Instructor creates 10 PostgreSQL questions
2. Questions status: Pending Review ⏳
3. Admin reviews:
   - 8 approved ✓ → Available for tests
   - 2 rejected ✗ → Too easy/unclear
4. Instructor notified, can revise rejected questions
```

**Scenario 3: Creating Mixed-Topic Test**
```
Admin wants test covering multiple databases:
1. Select 10 questions from MySQL
2. Select 10 questions from PostgreSQL
3. Select 5 questions from MongoDB
4. Create test with all 25 questions
5. Students practice multiple technologies!
```

### Who Uses This Tab?
- **Daily:** Reviewing instructor-submitted questions
- **Weekly:** Adding questions for new courses
- **Monthly:** Quality review and cleanup

---

## 6. TESTS TAB

### 🎯 Purpose
Create and manage tests/exams that students take. Tests can be practice tests (student-generated) or assigned tests (admin/instructor-created).

### What You Can Do

#### Test Management Dashboard
```
┌──────────────────────────────────────────────────────────────────┐
│  [+ Create Test]  Search: [        ]  Type: [All ▼]  Status: [All ▼]
├──────────────────────────────────────────────────────────────────┤
│ Test Name           | Course     | Questions | Students | Status │
│ MySQL Midterm Exam  | MySQL      | 50        | 45       | Active │
│ JS ES6 Quiz #1      | JavaScript | 20        | 32       | Active │
│ Database Final      | Mixed      | 75        | 38       | Draft  │
└──────────────────────────────────────────────────────────────────┘
```

#### 1. **Create Tests** (Test Builder Wizard)

**Step 1: Basic Information**
- Test Title: "MySQL Fundamentals Quiz #1"
- Description: What the test covers
- Course: Select primary course
- Due Date: When students must complete by
- Time Limit: 60 minutes
- Passing Score: 70%
- Max Attempts: 3 tries

**Step 2: Select Questions** ✨ NEW FEATURES

**Option A: Auto-Generate**
```
Select Courses:
☑ MySQL Fundamentals
☑ PostgreSQL Advanced
☐ JavaScript ES6

✓ Mixing 2 courses: MySQL + PostgreSQL

Difficulty Distribution:
  Easy: 10 questions
  Medium: 15 questions
  Hard: 5 questions

Total: 30 questions

[Generate Questions] → Automatically picks 30 random questions
                        from selected courses
```

**Option B: Manual Selection**
```
Filter by Course: [MySQL Fundamentals ▼]
Search: [JOIN]

Select specific questions:
☑ What is INNER JOIN?
☑ Explain LEFT JOIN
☐ What is CROSS JOIN?

Selected: 2/30 questions
```

**Step 3: Test Settings**
- **Passing Score:** 70% (students need 21/30 correct)
- **Shuffle Questions:** Randomize question order per student
- **Shuffle Options:** Randomize MC options
- **Show Results Immediately:** Yes/No
- **Show Correct Answers:** After submission/Never
- **Show Explanations:** Yes/No
- **Max Attempts:** 1, 2, 3, Unlimited

**Step 4: Assign Students**
```
Select Students:
☑ John Doe
☑ Jane Smith
☑ All Students (select all)

Selected: 45 students
```

**Step 5: Review & Publish**
```
Test Summary:
- Title: MySQL Fundamentals Quiz #1
- Questions: 30 (10 Easy, 15 Medium, 5 Hard)
- Students: 45 assigned
- Due: January 15, 2025
- Time Limit: 60 minutes
- Passing: 70%

[Save as Draft] [Publish Test]
```

#### 2. **Test Types**

**Assigned Tests** (Admin/Instructor Created)
- Created by admins or instructors
- Assigned to specific students
- Due dates enforced
- Counts toward grades

**Practice Tests** (Student Generated)
- Students create their own practice tests
- Select courses and difficulty
- No due dates
- For self-study only

#### 3. **Manage Existing Tests**
- **View Test Details:** See all settings and questions
- **Edit Test:** Update questions, settings, due dates
- **Duplicate Test:** Copy and modify for new class
- **Delete Test:** Remove permanently
- **View Results:** See how students performed
- **Export Results:** Download grade reports

#### 4. **Test Results & Analytics**

**Overall Statistics:**
- Average Score: 78%
- Pass Rate: 85% (38/45 passed)
- Completion Rate: 93% (42/45 completed)
- Average Time: 45 minutes

**Per-Student Results:**
```
Student Name  | Score | Time Used | Attempts | Status
John Doe      | 85%   | 42 min    | 1/3      | Passed
Jane Smith    | 92%   | 38 min    | 1/3      | Passed
Mike Johnson  | 65%   | 58 min    | 2/3      | Failed
```

**Question Analysis:**
```
Question                          | Correct | Incorrect | % Correct
What is PRIMARY KEY?              | 42      | 3         | 93%
Explain INNER JOIN                | 35      | 10        | 78%
Optimize this query               | 15      | 30        | 33% ← Needs review!
```

#### 5. **Test Settings Impact**

**Setting: Show Results Immediately = YES**
- Student finishes test → sees score instantly
- Good for practice tests

**Setting: Show Results Immediately = NO**
- Student finishes → "Submitted successfully"
- Admin releases results later
- Good for formal exams

**Setting: Show Correct Answers = YES**
- Student sees: "Your Answer: B, Correct Answer: A"
- Good for learning

**Setting: Show Correct Answers = NO**
- Student only sees: "Incorrect"
- Good for preventing answer sharing

**Setting: Max Attempts = 3**
- Student can retake up to 3 times
- Best score counts

### Real-World Use Cases

**Scenario 1: Weekly Practice Quiz**
```
1. Create test: "MySQL Week 1 Practice"
2. Auto-generate: 20 questions from MySQL course
   - 10 Easy, 7 Medium, 3 Hard
3. Settings:
   - Show results immediately: YES
   - Show correct answers: YES
   - Max attempts: Unlimited
4. Assign to all students
5. Students practice and learn
```

**Scenario 2: Final Exam**
```
1. Create test: "Database Final Exam"
2. Mix courses:
   - 25 questions from MySQL
   - 25 questions from PostgreSQL
   - 25 questions from MongoDB
3. Settings:
   - Show results immediately: NO
   - Show correct answers: NO
   - Max attempts: 1
4. Assign to enrolled students
5. Admin releases results after deadline
```

**Scenario 3: Student Self-Study**
```
Student wants to practice:
1. Goes to "Generate Practice Test"
2. Selects courses:
   ☑ MySQL Fundamentals
   ☑ JavaScript ES6
3. Configures difficulty:
   - Easy: 5, Medium: 10, Hard: 5
4. Generates test
5. Takes test, sees results immediately
6. Reviews explanations for wrong answers
```

### Who Uses This Tab?
- **Weekly:** Creating quizzes for students
- **Monthly:** Creating major exams
- **As Needed:** Reviewing test results, adjusting difficulty

---

## 7. INSTRUCTOR APPLICATIONS TAB

### 🎯 Purpose
Review and approve applications from users who want to become instructors on the platform.

### What You Can Do

#### Applications Dashboard
```
┌──────────────────────────────────────────────────────────────────┐
│  Filter: [Pending ▼]  Search: [          ]                       │
├──────────────────────────────────────────────────────────────────┤
│ Applicant        | Expertise    | Experience | Date     | Status │
│ John Smith       | MySQL, SQL   | 5 years    | Dec 20   | Pending│
│ Sarah Johnson    | JavaScript   | 3 years    | Dec 22   | Pending│
│ Mike Davis       | PostgreSQL   | 7 years    | Dec 25   | Approved│
└──────────────────────────────────────────────────────────────────┘
```

#### 1. **View Applications**

Each application shows:
- **Applicant Information:**
  - Full Name
  - Email
  - Phone Number

- **Expertise & Qualifications:**
  - Areas of expertise (MySQL, JavaScript, etc.)
  - Years of experience
  - Educational background
  - Certifications

- **Application Details:**
  - Cover letter / Motivation
  - Resume/CV (downloadable)
  - Portfolio links
  - References

- **Application Date:** When they applied

#### 2. **Review Process**

**Step 1: Read Application**
```
Applicant: John Smith
Email: john.smith@email.com

Expertise: MySQL, PostgreSQL, Database Design
Experience: 5 years as Database Administrator at TechCorp
Education: BS in Computer Science, MySQL Certified Professional

Cover Letter:
"I have been working with MySQL for over 5 years and have trained
junior developers in my company. I am passionate about teaching
database fundamentals and would love to contribute to TekyPro..."

[Resume.pdf] [View Portfolio]
```

**Step 2: Evaluate**
- Check qualifications
- Verify expertise matches platform needs
- Review writing quality (will they explain well?)
- Check if platform needs instructors in that area

**Step 3: Make Decision**

**Option A: Approve**
```
[Approve Application]
    ↓
User promoted to Instructor role
    ↓
Email sent: "Congratulations! You're now an instructor..."
    ↓
Instructor can now:
  - Create tests
  - Contribute questions (pending admin approval)
  - View assigned students
```

**Option B: Reject**
```
[Reject Application]
    ↓
Provide reason (optional):
"Thank you for applying. Unfortunately, we currently have
sufficient MySQL instructors. Please consider applying for
JavaScript positions..."
    ↓
Email sent: "Thank you for your application..."
    ↓
User remains as Student
Can reapply in future
```

**Option C: Request More Information**
```
[Request Info]
    ↓
Send message to applicant:
"Could you please provide more details about your teaching
experience?"
    ↓
Applicant responds
    ↓
Review again
```

#### 3. **Application Statistics**
- Total Applications: 47
- Pending Review: 5
- Approved: 38
- Rejected: 4
- Average Response Time: 2 days

#### 4. **Approved Instructors Capabilities**

Once approved, instructors can:
- **Contribute Questions:**
  - Create questions for their expertise areas
  - Questions pending admin approval before use

- **Create Tests:** (if enabled)
  - Build tests for students
  - Assign to their classes

- **View Performance:**
  - See how students perform on their tests
  - Identify difficult questions

### Real-World Use Cases

**Scenario 1: Qualified Applicant**
```
Application Received: MySQL Expert, 8 years experience
Admin Reviews: Strong qualifications, good references
Decision: APPROVE
Result: New instructor can contribute MySQL questions
Impact: Question bank grows, better content for students
```

**Scenario 2: Unqualified Applicant**
```
Application Received: "I want to teach JavaScript"
Details: No professional experience, self-taught 3 months
Admin Reviews: Insufficient expertise
Decision: REJECT (politely)
Suggestion: "Gain more experience, reapply in future"
```

**Scenario 3: High Demand Subject**
```
Platform needs: More JavaScript instructors
Application: JavaScript Developer, 4 years experience
Admin Reviews: Good fit for platform needs
Decision: APPROVE (fast-tracked)
Result: Fills content gap
```

### Who Uses This Tab?
- **Daily:** Checking new applications
- **Weekly:** Batch reviewing applications
- **As Needed:** When platform needs specific expertise

---

## 8. ACTIVITY TAB

### 🎯 Purpose
Monitor all system activity - user actions, content changes, security events. Think of it as the platform's audit log.

### What You Can Do

#### Activity Log Dashboard
```
┌──────────────────────────────────────────────────────────────────────┐
│  Filter: [All Activities ▼]  User: [All ▼]  Date: [Last 7 Days ▼]   │
├──────────────────────────────────────────────────────────────────────┤
│ Time       | User        | Action             | Details              │
│ 2m ago     | John Doe    | Test Completed     | MySQL Quiz #1: 85%   │
│ 15m ago    | Admin       | Question Approved  | Q#456: What is JOIN? │
│ 1h ago     | Jane Smith  | Course Enrolled    | PostgreSQL Advanced  │
│ 2h ago     | Admin       | User Created       | New student: Mike J. │
│ 3h ago     | Instructor  | Question Submitted | Q#457: Arrow functions│
└──────────────────────────────────────────────────────────────────────┘
```

#### 1. **Activity Types Tracked**

**User Activities:**
- User Registration
- Login/Logout
- Password Changes
- Profile Updates
- Role Changes (Student → Instructor)

**Course Activities:**
- Course Created
- Course Published
- Course Updated
- Course Deleted
- Student Enrolled
- Student Unenrolled

**Question Bank Activities:**
- Question Created
- Question Approved
- Question Rejected
- Question Edited
- Question Deleted

**Test Activities:**
- Test Created
- Test Published
- Test Assigned
- Test Started (by student)
- Test Completed
- Test Graded
- Results Released

**Instructor Application Activities:**
- Application Submitted
- Application Reviewed
- Application Approved
- Application Rejected

**Security Events:**
- Failed Login Attempts
- Password Reset Requests
- Suspicious Activity
- Account Suspended
- Permissions Changed

#### 2. **Filter & Search Activities**

**By Activity Type:**
- User Management
- Course Management
- Question Bank
- Tests
- Security Events
- All

**By User:**
- Specific user's actions
- Admin actions only
- Student actions only
- Instructor actions only

**By Date Range:**
- Today
- Last 7 days
- Last 30 days
- Custom date range

**By Action:**
- Created
- Updated
- Deleted
- Approved
- Rejected

#### 3. **Activity Details**

Click on any activity to see full details:

**Example: Test Completed**
```
Activity: Test Completed
User: John Doe (student#123)
Test: MySQL Fundamentals Quiz #1
Date: December 26, 2025 at 2:45 PM

Details:
- Score: 85% (17/20 correct)
- Time Used: 42 minutes (of 60 allowed)
- Attempt: 1 of 3
- Status: Passed (passing: 70%)

IP Address: 192.168.1.100
Device: Chrome on Windows 10
```

**Example: Question Approved**
```
Activity: Question Approved
Admin: Admin User
Question ID: #456
Question: "What is an INNER JOIN in SQL?"

Details:
- Original Creator: Instructor Jane Smith
- Submitted: December 25, 2025
- Approved: December 26, 2025
- Course: MySQL Fundamentals
- Difficulty: Medium

Changes Made: None (approved as submitted)
```

#### 4. **Activity Analytics**

**Most Active Users:**
```
User              | Actions This Week
Admin User        | 247 actions
Jane Smith        | 89 actions
John Doe          | 56 actions
```

**Most Common Activities:**
```
Activity          | Count This Week
Test Completed    | 342
Login             | 189
Question Created  | 67
Course Enrolled   | 45
```

**Peak Activity Times:**
```
Hour  | Activities
9 AM  | ████████████ 245
12 PM | ████████ 180
3 PM  | ██████████ 210
6 PM  | ████████████████ 312 ← Peak
```

#### 5. **Security Monitoring**

**Failed Login Attempts:**
```
User: john@email.com
Attempts: 5 failed logins in 10 minutes
Last Attempt: 2 minutes ago
IP: 192.168.1.50
Action: Account temporarily locked
```

**Suspicious Activity:**
```
User: student123
Activity: Attempted to access admin panel
Date: December 26, 2025
IP: 10.0.0.100
Result: Access denied (logged)
```

### Real-World Use Cases

**Scenario 1: Investigate User Issue**
```
Student: "I didn't get credit for my test!"
Admin Actions:
1. Search activity for student name
2. Filter by "Test Completed"
3. Find: Test completed yesterday, 88% score
4. Verify: Grade recorded correctly
5. Response: "Your score is recorded, see your dashboard"
```

**Scenario 2: Track Content Changes**
```
Question: "Who modified this question?"
Admin Actions:
1. Search activity for question ID
2. Find: Question edited 3 times
   - Dec 20: Created by Instructor A
   - Dec 22: Edited by Admin (fixed typo)
   - Dec 25: Difficulty changed Easy → Medium
3. Full audit trail available
```

**Scenario 3: Security Audit**
```
Monthly Review:
1. Filter: Security Events, Last 30 days
2. Review failed logins (normal: ~50/month)
3. This month: 200 failed logins (unusual!)
4. Investigate: All from same IP
5. Action: Block IP, notify users to update passwords
```

**Scenario 4: Usage Analytics**
```
Question: "Are students using the platform?"
Admin Actions:
1. View activity for last 7 days
2. See: 342 tests completed
3. See: 45 new course enrollments
4. Conclusion: Active engagement!
```

### Who Uses This Tab?
- **Daily:** Monitoring platform activity
- **Weekly:** Reviewing security events
- **Monthly:** Analytics and reporting
- **As Needed:** Investigating issues, auditing changes

---

## SYSTEM ARCHITECTURE

### Application Structure

```
TekyPro Learning Management System
│
├── Admin Dashboard (Port 5174)
│   │
│   ├── Dashboard Tab ─────────→ Overview & Analytics
│   ├── Users Tab ─────────────→ User Management
│   ├── Courses Tab ───────────→ Course Management
│   ├── Categories Tab ────────→ Category Organization
│   ├── Question Bank Tab ─────→ Question Repository
│   ├── Tests Tab ─────────────→ Test Creation & Management
│   ├── Instructor Apps Tab ───→ Application Review
│   └── Activity Tab ──────────→ Audit Logs
│
├── Student/Instructor Portal (Port 5173)
│   │
│   ├── Student Features
│   │   ├── Browse Courses
│   │   ├── Enroll in Courses
│   │   ├── Take Assigned Tests
│   │   ├── Generate Practice Tests
│   │   ├── View Results
│   │   └── Track Progress
│   │
│   └── Instructor Features
│       ├── Contribute Questions
│       ├── Create Tests (if enabled)
│       ├── View Student Performance
│       └── Manage Assigned Students
│
└── Backend API (Port 5000)
    │
    ├── Authentication & Authorization
    ├── User Management APIs
    ├── Course Management APIs
    ├── Question Bank APIs
    ├── Test Management APIs
    ├── Results & Analytics APIs
    └── Activity Logging APIs
```

### Data Flow Example

**Creating and Taking a Test:**

```
1. ADMIN creates course
   Admin Dashboard → Courses Tab → Create "MySQL Fundamentals"
   ↓
   Backend API saves course

2. ADMIN adds questions
   Admin Dashboard → Question Bank → Add 50 MySQL questions
   ↓
   Backend API saves questions (linked to course)

3. ADMIN creates test
   Admin Dashboard → Tests Tab → Test Builder
   ↓
   Select courses: MySQL Fundamentals
   ↓
   Auto-generate: 20 questions (10 Easy, 7 Med, 3 Hard)
   ↓
   Assign to students
   ↓
   Backend API creates test & assignments

4. STUDENT receives notification
   Student Portal → Dashboard → "New test assigned!"

5. STUDENT takes test
   Student Portal → Take Test → Answer questions
   ↓
   Backend API records answers
   ↓
   Backend API calculates score

6. STUDENT sees results (if enabled)
   Student Portal → Test Results → 85% Pass!

7. ADMIN views analytics
   Admin Dashboard → Tests Tab → View Results
   ↓
   See: Average 78%, Pass rate 85%

8. ACTIVITY LOGGED
   Admin Dashboard → Activity Tab
   ↓
   See: All actions recorded
```

### Technology Stack

**Admin Dashboard:**
- React 19
- Vite
- React Router v7
- Tailwind CSS
- Axios

**Backend:**
- Node.js
- Express
- MySQL
- Sequelize ORM
- JWT Authentication

**Student/Instructor Portal:**
- React 19
- Vite
- React Router v7
- Tailwind CSS

---

## USER FLOW DIAGRAMS

### Admin Workflow: Creating a Complete Course

```
START
  ↓
[Create Category]
  Categories Tab → "Database Technologies"
  ↓
[Create Course]
  Courses Tab → "MySQL Fundamentals"
  Assign to "Database Technologies" category
  Add description, thumbnail
  ↓
[Add Questions]
  Question Bank Tab → Create 50 questions
  Assign all to "MySQL Fundamentals" course
  Mix difficulty: 20 Easy, 20 Medium, 10 Hard
  ↓
[Create Practice Tests]
  Tests Tab → Create 5 practice quizzes
  Auto-generate from MySQL questions
  ↓
[Create Final Exam]
  Tests Tab → Create comprehensive final
  Manual selection: 75 best questions
  Settings: 1 attempt, no immediate results
  ↓
[Publish Course]
  Courses Tab → Change status to "Published"
  ↓
[Monitor Activity]
  Activity Tab → Track student enrollments
  Dashboard → View enrollment statistics
  ↓
END
Course is live and students can enroll!
```

### Student Workflow: Taking a Course

```
START (Student logs into Student Portal)
  ↓
[Browse Courses]
  Sees: "MySQL Fundamentals" (Published)
  ↓
[Enroll in Course]
  Click "Enroll" → Enrollment confirmed
  (Activity logged in Admin Dashboard)
  ↓
[Practice Tests]
  Generate practice test:
  - Select MySQL course
  - Choose difficulty: 10 Easy, 5 Medium
  - Take test → See results immediately
  - Review explanations for wrong answers
  ↓
[Assigned Quiz]
  Notification: "MySQL Quiz #1 due Friday"
  Take test → Submit
  Results shown (or pending admin release)
  ↓
[Final Exam]
  Notification: "MySQL Final Exam due Dec 31"
  One attempt, 2 hours
  Take exam → Submit
  Wait for results (admin releases later)
  ↓
[View Progress]
  Dashboard → See all scores
  Practice: 85%, 92%, 88%
  Quizzes: 78%, 85%
  Final: Pending
  ↓
END
Course progress tracked
```

### Instructor Workflow: Contributing Content

```
START (User applies to be instructor)
  ↓
[Apply]
  Student Portal → "Become an Instructor"
  Fill application: Expertise, experience
  Submit
  (Application appears in Admin Dashboard)
  ↓
[Admin Reviews]
  Admin Dashboard → Instructor Applications
  Review application
  Approve → User becomes Instructor
  ↓
[Contribute Questions]
  Instructor Portal → Contribute Questions
  Create question:
  - Course: MySQL Fundamentals
  - Question text
  - Correct answer
  - Explanation
  Submit (status: Pending Review)
  ↓
[Admin Reviews Question]
  Admin Dashboard → Question Bank
  See: Pending question from instructor
  Review → Approve ✓
  ↓
[Question Available]
  Question now available for tests
  Instructor sees: Status changed to "Approved"
  ↓
END
Instructor contributes more questions
Quality maintained through approval
```

---

## KEY INSIGHTS FOR CLIENTS

### 1. **Centralized Control**
Everything is managed from one admin dashboard - no need to juggle multiple tools or platforms.

### 2. **Scalability**
- Add unlimited courses
- Create unlimited questions
- Support unlimited students
- Review applications at your pace

### 3. **Quality Control**
- Instructor questions require approval
- Admin can review and edit content
- Activity tracking ensures accountability

### 4. **Flexibility**
- Mix questions from multiple courses
- Configure test settings per assignment
- Custom difficulty distributions
- Reusable question bank

### 5. **Analytics-Driven**
- Real-time dashboards
- Performance tracking
- Question difficulty analysis
- User activity monitoring

### 6. **User Experience**
- Students get immediate feedback (if enabled)
- Instructors can contribute expertise
- Admins have complete visibility
- Everyone has appropriate access levels

---

## SUMMARY TABLE

| Tab | Primary Purpose | Key Actions | Used By |
|-----|----------------|-------------|---------|
| **Dashboard** | Overview & Analytics | Monitor metrics, view trends | Daily |
| **Users** | Manage all users | Create, edit, suspend users | Daily |
| **Courses** | Manage courses | Create courses, view stats | Weekly |
| **Categories** | Organize courses | Create categories | As needed |
| **Question Bank** | Question repository | Create/approve questions | Daily |
| **Tests** | Create exams | Build tests, assign students | Weekly |
| **Instructor Apps** | Review applications | Approve/reject instructors | Daily |
| **Activity** | Audit logs | Monitor activity, security | Daily |

---

## CONCLUSION

The **TekyPro Admin Dashboard** is a comprehensive, centralized management system that gives you complete control over your learning platform. From creating courses to managing users, from building tests to tracking activity - everything is accessible, organized, and analytics-driven.

**Each tab serves a specific purpose in the content creation and delivery lifecycle:**
1. Organize content (Categories, Courses)
2. Build question library (Question Bank)
3. Create assessments (Tests)
4. Manage people (Users, Instructor Applications)
5. Monitor everything (Dashboard, Activity)

The new **Questions by Course** feature we just built enhances this by ensuring questions are clearly organized by specific courses (MySQL vs PostgreSQL), allowing you to mix courses in tests, and providing visibility into question inventory per course.

---

**Need clarification on any tab or feature? Let me know!**
