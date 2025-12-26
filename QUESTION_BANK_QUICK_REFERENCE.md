# 🚀 Question Bank - Quick Reference Guide

**One-Page Overview for Quick Reference**

---

## 📊 Current Status

```
Backend:  ██████████████████████ 100% ✅ COMPLETE
Frontend: ░░░░░░░░░░░░░░░░░░░░░░   0% ❌ TO BUILD

Overall:  ███████████░░░░░░░░░░░  50% ⚠️ IN PROGRESS
```

---

## 🗄️ Database (Already Created)

```sql
question_bank              -- 1,000+ questions repository
├── practice_test_attempts    -- Student self-tests
├── practice_test_questions   -- Questions in practice tests
├── practice_test_answers     -- Student answers (practice)
├── assigned_tests            -- Instructor/admin tests
├── assigned_test_questions   -- Questions in assigned tests
├── test_assignments          -- Test → Student assignments
├── assigned_test_attempts    -- Student test attempts
└── assigned_test_answers     -- Student answers (assigned)
```

---

## 🔌 API Endpoints (All Working)

### Questions
```
GET    /api/questions              📋 List all
GET    /api/questions/:id          🔍 Get one
POST   /api/questions              ➕ Create
POST   /api/questions/bulk         📥 Import CSV
PUT    /api/questions/:id          ✏️  Edit
DELETE /api/questions/:id          🗑️  Delete
PATCH  /api/questions/:id/approve  ✅ Approve
```

### Tests
```
POST   /api/assigned-tests                    ➕ Create test
GET    /api/assigned-tests/my-tests           📋 List tests
POST   /api/assigned-tests/:id/questions      ➕ Add questions
POST   /api/assigned-tests/:id/assign         👥 Assign students
GET    /api/assigned-tests/:id/results        📊 View results
```

### Practice
```
POST   /api/practice-tests/generate  🎲 Generate random test
POST   /api/practice-tests/:id/submit ✅ Submit & auto-grade
GET    /api/practice-tests/:id/results 📊 View results
```

---

## 📁 Files to Create

### Priority 1: Admin Pages
```
frontend-admin/src/pages/admin/
├── QuestionBank.jsx     ⭐ START HERE
├── QuestionModal.jsx
├── Tests.jsx
├── TestBuilder.jsx
└── TestResults.jsx
```

### Priority 2: Components
```
frontend-admin/src/components/
├── questions/
│   ├── QuestionCard.jsx
│   ├── QuestionFilters.jsx
│   └── BulkImport.jsx
└── tests/
    ├── QuestionSelector.jsx
    └── ResultsTable.jsx
```

### Priority 3: API Integration
```
frontend-admin/src/lib/api.js
└── Add: adminQuestionsAPI, adminTestsAPI
```

### Priority 4: Navigation
```
frontend-admin/src/utils/navigationItems.jsx
└── Add: Question Bank, Tests menu items
```

---

## 🎯 3 Quick Wins to Start

### Win #1: Navigation (15 min)
```jsx
// frontend-admin/src/utils/navigationItems.jsx
import { HelpCircle, FileText } from 'lucide-react';

{
  label: 'Question Bank',
  path: '/questions',
  icon: <HelpCircle className="w-5 h-5" />,
},
{
  label: 'Tests',
  path: '/tests',
  icon: <FileText className="w-5 h-5" />,
}
```

### Win #2: API Setup (30 min)
```javascript
// frontend-admin/src/lib/api.js
export const adminQuestionsAPI = {
  getAll: (params) => api.get('/api/questions', { params }),
  create: (data) => api.post('/api/questions', data),
  update: (id, data) => api.put(`/api/questions/${id}`, data),
  delete: (id) => api.delete(`/api/questions/${id}`),
  approve: (id) => api.patch(`/api/questions/${id}/approve`),
  bulkImport: (data) => api.post('/api/questions/bulk', data),
};

export const adminTestsAPI = {
  getAll: (params) => api.get('/api/assigned-tests/my-tests', { params }),
  create: (data) => api.post('/api/assigned-tests', data),
  addQuestions: (id, qIds) => api.post(`/api/assigned-tests/${id}/questions`, { question_ids: qIds }),
  assignStudents: (id, students) => api.post(`/api/assigned-tests/${id}/assign`, { student_ids: students }),
};
```

### Win #3: Basic Question Page (2-3 hours)
```jsx
// frontend-admin/src/pages/admin/QuestionBank.jsx
import { useState, useEffect } from 'react';
import { adminQuestionsAPI } from '../../lib/api';
import { Button, Table, Spinner } from '../../components/ui';

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await adminQuestionsAPI.getAll();
      setQuestions(response.data.data.questions);
    } catch (error) {
      console.error('Failed to fetch questions', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Question Bank</h1>
        <Button>+ Add Question</Button>
      </div>

      <Table>
        {questions.map(q => (
          <tr key={q.id}>
            <td>{q.question_text}</td>
            <td>{q.difficulty}</td>
            <td>{q.question_type}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
```

---

## 🏗️ Component Structure

### QuestionBank.jsx Layout
```
┌─────────────────────────────────────────┐
│ 📚 Question Bank        [+ Add Question]│
├─────────────────────────────────────────┤
│ 🔍 Search  📁 Category ▼  📊 Difficulty ▼│
├─────────────────────────────────────────┤
│ ┌─────┬─────┬─────┬─────┬─────┐        │
│ │Total│Appvd│Pndng│ MCQ │T/F  │        │
│ │ 247 │ 230 │ 17  │ 180 │ 67  │        │
│ └─────┴─────┴─────┴─────┴─────┘        │
├─────────────────────────────────────────┤
│ ☐ What is React?          [View][Edit] │
│   Type: MCQ | Diff: Easy | Used: 45x   │
├─────────────────────────────────────────┤
│ ☐ Explain closures        [View][Edit] │
│   Type: Fill | Diff: Hard | Used: 23x  │
├─────────────────────────────────────────┤
│           [← Prev] 1/12 [Next →]        │
└─────────────────────────────────────────┘
```

### TestBuilder.jsx Layout
```
┌─────────────────────────────────────────┐
│ 📝 Create Test                [Step 1/4]│
├─────────────────────────────────────────┤
│ Test Name: [___________________]        │
│ Course: [Select Course ▼]              │
│ Description: [___________________]      │
├─────────────────────────────────────────┤
│ Question Selection Method:              │
│ ○ Manual  ● Auto-Select                │
├─────────────────────────────────────────┤
│ Difficulty Distribution:                │
│ Easy: [10] Medium: [15] Hard: [5]      │
│ Categories: ☑JS ☑HTML ☐CSS            │
│                    [🎲 Generate]        │
├─────────────────────────────────────────┤
│ Selected Questions (30):                │
│ 1. What is a variable? (Easy)   [✕]   │
│ 2. Explain hoisting (Hard)      [✕]   │
│ ...                                     │
├─────────────────────────────────────────┤
│        [← Back]        [Next: Settings →]│
└─────────────────────────────────────────┘
```

---

## 💡 Pro Tips

### Copy Existing Patterns
```bash
# Use Categories.jsx as template
cp frontend-admin/src/pages/admin/Categories.jsx \
   frontend-admin/src/pages/admin/QuestionBank.jsx

# Use CourseBuilder.jsx for TestBuilder
cp frontend-admin/src/pages/admin/CourseBuilder.jsx \
   frontend-admin/src/pages/admin/TestBuilder.jsx
```

### Reuse Components
```jsx
import { Button, Input, Modal, Table, Badge } from '../../components/ui';
import { StatsCard } from '../../components/ui/StatsCard';
import { Pagination } from '../../components/ui/Pagination';
```

### Follow Existing Styles
```jsx
// Gradient Header (like other admin pages)
<div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
  <h1 className="text-3xl font-bold">Question Bank</h1>
</div>

// Stats Cards
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <StatsCard title="Total" value="247" icon={HelpCircle} />
</div>

// Table
<Table>
  <thead>
    <tr>
      <th>Question</th>
      <th>Type</th>
      <th>Difficulty</th>
    </tr>
  </thead>
</Table>
```

---

## 🎨 Design Tokens

```javascript
// Colors (from existing admin panel)
const colors = {
  primary: '#3b82f6',    // Blue
  success: '#10b981',    // Green
  warning: '#f59e0b',    // Yellow
  danger: '#ef4444',     // Red
};

// Badges
<Badge color="green">Approved</Badge>
<Badge color="yellow">Pending</Badge>
<Badge color="blue">Easy</Badge>
<Badge color="orange">Medium</Badge>
<Badge color="red">Hard</Badge>

// Icons (lucide-react)
import {
  HelpCircle,      // Question
  FileText,        // Test
  CheckCircle,     // Approved
  Clock,           // Pending
  BarChart3,       // Stats
} from 'lucide-react';
```

---

## 🧪 Testing URLs

```bash
# Backend API (test with curl)
curl http://localhost:5000/api/questions
curl http://localhost:5000/api/assigned-tests/my-tests

# Frontend Pages
http://localhost:5174/questions       # Question Bank
http://localhost:5174/tests           # Tests List
http://localhost:5174/test-builder    # Create Test
http://localhost:5174/test-results/1  # Test Results
```

---

## 📚 Key Workflows

### Admin Creates Question
```
1. Click "Question Bank" → "+ Add Question"
2. Fill form (type, text, options, answer, etc.)
3. Click "Save & Approve"
4. Question added to bank ✅
```

### Instructor Creates Test
```
1. Click "Tests" → "+ Create Test"
2. Step 1: Name, course, description
3. Step 2: Select/generate questions
4. Step 3: Configure (time, passing score, etc.)
5. Step 4: Assign to students
6. Click "Publish Test" ✅
```

### Student Takes Practice Test
```
1. Click "Practice Tests" → "Generate Test"
2. Configure (categories, difficulty, count)
3. Click "Start Test"
4. Answer questions
5. Submit → See results with explanations ✅
```

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Add navigation items | 15 min |
| Set up API endpoints | 30 min |
| Basic Question Bank page | 3 hours |
| Question Modal (Add/Edit) | 4 hours |
| Bulk Import | 3 hours |
| Test Builder (basic) | 6 hours |
| Test Builder (complete) | 10 hours |
| Test Results page | 5 hours |
| Polish & testing | 3 hours |
| **TOTAL** | **~35 hours** |

---

## 🎯 Minimal Viable Product (MVP)

**Week 1 Focus (Must Have):**
- ✅ Question Bank page (view, search, filter)
- ✅ Add/Edit Question modal
- ✅ Approve/Reject workflow
- ✅ Test Builder (basic)
- ✅ Assign test to students

**Week 2 (Nice to Have):**
- Bulk import questions
- Advanced test builder features
- Test results analytics
- Student UI enhancements

---

## 🚀 Next Steps

1. **Add Navigation** (15 min)
   - Edit `navigationItems.jsx`
   - Add Question Bank & Tests items
   - Test navigation

2. **Set Up APIs** (30 min)
   - Edit `api.js`
   - Add adminQuestionsAPI
   - Add adminTestsAPI
   - Test with console.log

3. **Build Question Bank Page** (Day 1)
   - Create QuestionBank.jsx
   - Add to App.jsx routes
   - Fetch and display questions
   - Add basic filters

4. **Build Question Modal** (Day 2)
   - Create QuestionModal.jsx
   - Form with all fields
   - Validation
   - Create/Update API calls

5. **Build Test Builder** (Day 3-4)
   - Create TestBuilder.jsx
   - Multi-step wizard
   - Question selection
   - Publish test

---

## 💪 You've Got This!

**Remember:**
- ✅ Backend is 100% done - just build the UI!
- ✅ All APIs tested and working
- ✅ Copy existing admin page patterns
- ✅ Reuse all existing components
- ✅ Focus on one task at a time
- ✅ Test as you build

**Estimated MVP:** 1-2 weeks
**Full Implementation:** 2-3 weeks

---

**Quick Reference Version 1.0**
**Last Updated:** December 25, 2025
