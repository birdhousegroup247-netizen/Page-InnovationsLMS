# 🧪 Question Bank System - Testing Checklist

**Servers Running:**
- ✅ Backend API: http://localhost:5000
- ✅ Admin Frontend: http://localhost:5174

---

## 📋 Testing Steps

### ✅ Phase 1: Admin - Question Bank Management

#### 1.1 Access Question Bank
- [ ] Navigate to http://localhost:5174/questions
- [ ] Verify page loads without errors
- [ ] Check that navigation item "Question Bank" is visible

#### 1.2 Create a Question (Manual)
- [ ] Click "+ Add Question" button
- [ ] Select "Multiple Choice"
- [ ] Fill in:
  - Question text: "What is React?"
  - Options: "A library", "A framework", "A database", "A language"
  - Correct answer: "A library"
  - Difficulty: "Easy"
  - Marks: 1
  - Time limit: 60 seconds
- [ ] Click "Create Question"
- [ ] Verify success toast appears
- [ ] Verify question appears in the list

#### 1.3 Create More Question Types
- [ ] Create a True/False question
- [ ] Create a Fill in the Blank question
- [ ] Verify all 3 types appear in the list

#### 1.4 Edit a Question
- [ ] Click "Edit" on a question
- [ ] Modify the question text
- [ ] Click "Update Question"
- [ ] Verify changes are saved

#### 1.5 Filter Questions
- [ ] Use search box to search for keywords
- [ ] Filter by difficulty (Easy, Medium, Hard)
- [ ] Filter by question type
- [ ] Filter by approval status
- [ ] Click "Clear Filters"

#### 1.6 Bulk Import Questions
- [ ] Click "Import Questions"
- [ ] Click "Download CSV Template"
- [ ] Open template and add 5 sample questions
- [ ] Upload the CSV file
- [ ] Verify preview shows all questions
- [ ] Click "Import X Questions"
- [ ] Verify success message
- [ ] Check that questions appear in the list

#### 1.7 Bulk Operations
- [ ] Select multiple questions using checkboxes
- [ ] Click "Approve Selected"
- [ ] Verify questions are approved
- [ ] Select questions again
- [ ] Click "Delete Selected"
- [ ] Verify questions are deleted

#### 1.8 Stats Dashboard
- [ ] Check that stats cards show correct numbers:
  - Total questions
  - Approved questions
  - Pending questions
  - Multiple choice count
  - True/false count
  - Fill in blank count

---

### ✅ Phase 2: Admin - Test Management

#### 2.1 Access Tests Page
- [ ] Navigate to http://localhost:5174/tests
- [ ] Verify page loads
- [ ] Check navigation item "Tests" is visible

#### 2.2 Create a Test (4-Step Wizard)

**Step 1: Basic Info**
- [ ] Click "Create Test"
- [ ] Fill in:
  - Title: "Week 1 Quiz - JavaScript Basics"
  - Description: "Test covering variables, functions, and arrays"
  - Select a course
  - Set due date (tomorrow)
  - Time limit: 30 minutes
  - Max attempts: 2
- [ ] Click "Next"

**Step 2: Questions**
- [ ] Choose "Manual Selection"
- [ ] Select 5-10 questions from the list
- [ ] Verify selected questions appear
- [ ] Click "Next"

**Alternative: Auto-Generate**
- [ ] Go back to Step 2
- [ ] Choose "Auto-Generate"
- [ ] Set difficulty distribution:
  - Easy: 3
  - Medium: 5
  - Hard: 2
- [ ] Click "Generate Questions"
- [ ] Verify 10 questions are selected
- [ ] Click "Next"

**Step 3: Settings**
- [ ] Set passing score: 70%
- [ ] Enable "Shuffle Questions"
- [ ] Enable "Shuffle Options"
- [ ] Enable "Show Results Immediately"
- [ ] Enable "Show Correct Answers"
- [ ] Enable "Show Explanations"
- [ ] Click "Next"

**Step 4: Assign Students**
- [ ] Select 2-3 students from the list
- [ ] Or click "Select All"
- [ ] Verify student count updates
- [ ] Click "Publish Test"
- [ ] Verify success message

#### 2.3 View Tests List
- [ ] Verify test appears in the list
- [ ] Check that it shows "Published" status
- [ ] Verify question count is correct
- [ ] Verify assigned students count is correct

#### 2.4 Filter Tests
- [ ] Filter by status (Draft, Published, Archived)
- [ ] Filter by course
- [ ] Search for test by name

#### 2.5 Edit a Test
- [ ] Click "Edit" on a test
- [ ] Modify the title
- [ ] Add/remove questions
- [ ] Change settings
- [ ] Update assigned students
- [ ] Save changes

#### 2.6 Publish/Archive Tests
- [ ] Create a test and save as "Draft"
- [ ] Click "Publish" on the draft test
- [ ] Verify status changes to "Published"
- [ ] Click "Archive" on a published test
- [ ] Verify status changes to "Archived"

#### 2.7 Delete a Test
- [ ] Click "Delete" on a test
- [ ] Verify confirmation modal appears
- [ ] Confirm deletion
- [ ] Verify test is removed from list

---

### ✅ Phase 3: Admin - Test Results

#### 3.1 View Test Results (After Students Take Tests)
- [ ] Navigate to a test
- [ ] Click "View Results"
- [ ] Verify results page loads

#### 3.2 Check Statistics
- [ ] Verify stats cards show:
  - Total attempts
  - Average score
  - Pass rate
  - Highest score
- [ ] Check completion status breakdown
- [ ] Check score range display
- [ ] Check pass/fail ratio

#### 3.3 Filter Results
- [ ] Filter by status (Completed, In Progress)
- [ ] Sort by score (Highest/Lowest)
- [ ] Sort by date (Recent/Oldest)

#### 3.4 View Individual Results
- [ ] Click "View" on a student's attempt
- [ ] Verify detailed modal opens
- [ ] Check summary shows:
  - Score
  - Correct answers
  - Incorrect answers
  - Time taken
- [ ] Review question-by-question breakdown
- [ ] Verify correct/incorrect indicators
- [ ] Check explanations are shown

#### 3.5 Export Results
- [ ] Click "Export Results"
- [ ] Verify CSV file downloads
- [ ] Open CSV and verify data is correct

---

## 🚨 Common Issues & Solutions

### Issue: "Failed to fetch questions"
**Solution:** Check backend is running and database connection is active

### Issue: "Cannot create question"
**Solution:** Ensure all required fields are filled (question text, correct answer, difficulty)

### Issue: CSV import fails
**Solution:** Check CSV format matches the template exactly

### Issue: Test Builder wizard stuck
**Solution:** Make sure each step is validated before clicking "Next"

### Issue: Students not receiving test assignments
**Solution:** Verify students are selected in Step 4 and test is published

---

## ✅ Success Criteria

All features should work:
- ✅ Create, edit, delete questions
- ✅ Bulk import via CSV
- ✅ Filter and search questions
- ✅ Create tests with 4-step wizard
- ✅ Auto-generate questions by difficulty
- ✅ Assign tests to students
- ✅ View comprehensive test results
- ✅ Export results to CSV
- ✅ No console errors
- ✅ All toast notifications work
- ✅ Dark mode works throughout

---

## 📝 Notes

- Make sure you have at least 10-15 questions in the bank before creating tests
- Create both draft and published tests to test all workflows
- Have students take at least one test to see results dashboard
- Test with different roles (admin only for now)

---

**Testing Time Estimate:** 45-60 minutes for complete testing

**Next:** Once testing is complete, we'll build Student & Instructor features!
