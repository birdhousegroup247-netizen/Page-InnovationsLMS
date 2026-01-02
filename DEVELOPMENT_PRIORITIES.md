# 🚀 TekyPro LMS - Development Priorities & Action Plan

**Date:** December 30, 2025
**Status:** Security Upgrade Complete, Student Frontend 85% Complete
**Next Sprint Focus:** Bug Fixes + Missing Features

---

## 📊 PROJECT STATUS OVERVIEW

### Overall Completion: **77%**

| Component | Status | Completion |
|-----------|--------|----------|
| **Backend API** | ✅ Production-Ready | 95% |
| **Database Schema** | ✅ Complete | 100% |
| **Admin Frontend** | ✅ Functional | 70% |
| **Student Frontend** | ⚠️ Mostly Complete | 85% |
| **Security** | ✅ Production-Ready | 95% |
| **Testing** | ❌ Insufficient | 20% |
| **DevOps** | ❌ Missing | 10% |

---

## 🔐 JUST COMPLETED: Security Upgrade

### ✅ What We Fixed (2-3 days of work):

1. **XSS Protection** - Migrated from localStorage to httpOnly cookies
2. **Token Blacklist** - Redis-based logout enforcement
3. **CSRF Protection** - Double-submit cookie pattern
4. **Backward Compatibility** - Authorization header fallback maintained

### Files Changed:
- Backend: 5 files (tokenBlacklist.js, csrf.js, authController.js, authMiddleware.js, .env.example)
- Frontend Admin: 2 files (api.js, AuthContext.jsx)

### Testing Required:
```bash
# Start Redis
redis-server

# Run test script
./test-cookie-auth.sh

# Or manual testing via browser (see SECURITY_UPGRADE_HTTPONLY_COOKIES.md)
```

---

## 🎯 IMMEDIATE PRIORITIES (This Week)

### Priority 1: Critical Bug Fixes (2-4 hours)

#### 1.1 Fix Dashboard Stats (Frontend)
**Location:** `/frontend/src/pages/Dashboard.jsx` (lines 8-41)

**Current Problem:**
```javascript
// WRONG - Hardcoded placeholder data
const stats = [
  { title: 'Enrolled Courses', value: '12', change: '+2', ... },
  { title: 'Completed Courses', value: '8', change: '+3', ... },
  // ... more fake data
];
```

**Fix:**
```javascript
// RIGHT - Fetch from API
const [stats, setStats] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchStats = async () => {
    try {
      const response = await profileAPI.getStats();
      const data = response.data.data;

      setStats([
        {
          title: 'Enrolled Courses',
          value: data.total_enrollments || 0,
          change: `+${data.enrollments_this_week || 0} this week`,
          // ... map real data
        },
        // ... etc
      ]);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchStats();
}, []);
```

**Effort:** 30 minutes
**Impact:** HIGH - Users see accurate data

---

#### 1.2 Fix Profile Password Change Bug (Frontend)
**Location:** `/frontend/src/pages/ProfileSettings.jsx` (line 641)

**Current Problem:**
```javascript
// Line 641 - WRONG variable name
setProfileForm({ ...profileForm, new_password: e.target.value });
```

**Fix:**
```javascript
// Should be passwordForm, not profileForm
setPasswordForm({ ...passwordForm, new_password: e.target.value });
```

**Effort:** 2 minutes
**Impact:** HIGH - Password change currently broken

---

#### 1.3 Enable Redis in Backend (Config)

**Action Required:**
```bash
# 1. Install Redis (if not already)
# Ubuntu/Debian:
sudo apt-get install redis-server
sudo systemctl start redis

# macOS:
brew install redis
brew services start redis

# 2. Update backend/.env
cp backend/.env.example backend/.env

# Edit backend/.env:
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 3. Restart backend
cd backend
npm run dev
```

**Effort:** 10 minutes (if Redis already installed)
**Impact:** CRITICAL - Required for new cookie auth

---

### Priority 2: Update Student Frontend for Cookie Auth (1-2 hours)

**Files to Update:**
1. `/frontend/src/lib/api.js` - Add `withCredentials: true`
2. `/frontend/src/contexts/AuthContext.jsx` - Remove localStorage usage

**Same changes as admin frontend** (see SECURITY_UPGRADE_HTTPONLY_COOKIES.md)

**Effort:** 1-2 hours
**Impact:** CRITICAL - Security vulnerability

---

## 📋 HIGH PRIORITY FEATURES (Next 2 Weeks)

### Feature 1: Lesson Questions/Discussions (3-5 days)

**What's Missing:** Students cannot ask questions on lessons

**Implementation Plan:**

1. **Create QuestionDiscussion Component** (`/frontend/src/components/course/QuestionDiscussion.jsx`)
   - Question list display
   - Add question form
   - Reply functionality
   - Instructor badge for instructor replies
   - Upvote/helpful marking

2. **Add to CoursePlayer Page** (`/frontend/src/pages/CoursePlayer.jsx`)
   - Add tab: "Overview", "Resources", "Q&A"
   - Integrate QuestionDiscussion component

3. **Backend Already Exists:**
   - Routes: `/backend/routes/api/lessons.js`
   - Controller: `/backend/controllers/lessons/lessonQuestionsController.js`
   - Models: `LessonQuestion`, `QuestionReply`

**Mockup:**
```
┌─────────────────────────────────────────┐
│ Lesson: Introduction to SQL JOINs      │
├─────────────────────────────────────────┤
│ [Overview] [Resources] [Q&A]            │
├─────────────────────────────────────────┤
│ 💬 Ask a Question                        │
│ [Text Area................................] │
│ [Submit Question]                        │
├─────────────────────────────────────────┤
│ 📌 Recent Questions (12)                 │
│                                          │
│ ❓ What's the difference between INNER   │
│    and LEFT JOIN?                        │
│    - John Doe, 2 hours ago               │
│    💬 3 replies                           │
│                                          │
│    ✓ INNER JOIN only returns matching   │
│      rows... [Instructor Badge]          │
│      - Jane Smith (Instructor)           │
│    ...                                   │
└─────────────────────────────────────────┘
```

**Effort:** 3-5 days
**Impact:** VERY HIGH - Major student engagement feature

---

### Feature 2: Student Activity Timeline (1-2 days)

**What's Missing:** No page to view student activity history

**Implementation Plan:**

1. **Create Activity Page** (`/frontend/src/pages/Activity.jsx`)
   - Fetch from `profileAPI.getActivity()`
   - Timeline display (similar to admin Activity page)
   - Filter by action type
   - Date range filter

2. **Add Route:**
```javascript
// In App.jsx
<Route path="/activity" element={<Activity />} />
```

3. **Update Navigation** (`/frontend/src/utils/navigationItems.jsx`)
   - Add "My Activity" link to sidebar

**Design:**
```
┌─────────────────────────────────────────┐
│ 📊 My Learning Activity                  │
├─────────────────────────────────────────┤
│ Filter: [All ▼] [Last 30 Days ▼]        │
├─────────────────────────────────────────┤
│ Today                                    │
│ ✓ Completed: SQL Joins Lesson            │
│   2 hours ago                             │
│                                          │
│ 📝 Submitted: MySQL Practice Test        │
│   Score: 85%                              │
│   5 hours ago                             │
│                                          │
│ Yesterday                                │
│ 📺 Watched: Database Normalization       │
│   Progress: 45% → 100%                    │
│   Dec 29, 2025                            │
│                                          │
│ ⭐ Reviewed: MySQL Fundamentals Course    │
│   Rating: 5 stars                         │
│   Dec 29, 2025                            │
└─────────────────────────────────────────┘
```

**Effort:** 1-2 days
**Impact:** MEDIUM-HIGH - Good for student engagement

---

### Feature 3: Enhanced Video Progress Tracking (2-3 days)

**What's Missing:** Video position tracking (resume playback)

**Current Behavior:**
- Student marks entire lesson as complete
- No tracking of video watch time or position

**Desired Behavior:**
- Save video position every 5 seconds
- Resume from last position on return
- Track actual watch time
- Calculate completion % based on video progress

**Implementation Plan:**

1. **Update CoursePlayer Component**
```javascript
// Add to CoursePlayer.jsx
const [videoProgress, setVideoProgress] = useState(0);
const videoRef = useRef(null);

// Track video time
const handleTimeUpdate = async () => {
  if (!videoRef.current) return;

  const currentTime = videoRef.current.currentTime;
  const duration = videoRef.current.duration;
  const progress = (currentTime / duration) * 100;

  setVideoProgress(progress);

  // Save to backend every 5 seconds
  if (Math.floor(currentTime) % 5 === 0) {
    await progressAPI.updateProgress(content.id, {
      watch_time: currentTime,
      last_position: currentTime,
      completed: progress >= 90 // 90% = completed
    });
  }
};

// Resume from last position
useEffect(() => {
  const loadProgress = async () => {
    const progress = await progressAPI.getProgress(courseId);
    if (progress.last_position && videoRef.current) {
      videoRef.current.currentTime = progress.last_position;
    }
  };
  loadProgress();
}, [content.id]);

// Add event listener
<video ref={videoRef} onTimeUpdate={handleTimeUpdate} ...>
```

2. **Backend Already Supports This:**
   - Model: `ContentProgress` has `watch_time` and `last_position` fields
   - API: `progressAPI.updateProgress(contentId, data)` exists

**Effort:** 2-3 days
**Impact:** HIGH - Better learning experience

---

## 🔧 MEDIUM PRIORITY (Weeks 3-4)

### 1. Knowledge Base/Articles (3-4 days)

**Implementation:**
- Articles page (browse)
- Article detail page (read)
- Article bookmarks (already partially implemented)

**Backend:** Already exists at `/backend/routes/api/knowledge.js`

---

### 2. Certificate Auto-Generation (1-2 days)

**Task:** Verify certificates are auto-generated on course completion

**Test Flow:**
1. Complete all lessons in a course
2. Check if certificate is automatically created
3. If not, add trigger in course completion logic

**Backend:** `/backend/services/certificate/certificateService.js` exists

---

### 3. Testing Suite (5-7 days)

**Components:**
- Unit tests for controllers (Jest)
- Integration tests for API endpoints (Supertest)
- Frontend component tests (React Testing Library)
- E2E tests (Playwright or Cypress)

**Target:** 60% code coverage minimum

---

### 4. DevOps Setup (3-5 days)

**Tasks:**
- Create Dockerfile for backend
- Create docker-compose.yml for local dev
- Setup CI/CD pipeline (GitHub Actions)
- Configure PM2 for production
- Add health check endpoints

---

## 🎁 LOW PRIORITY / FUTURE ENHANCEMENTS

- Gamification (badges, achievements, streaks)
- Social features (study groups, peer messaging)
- Advanced analytics (learning patterns, recommendations)
- Mobile app (React Native)
- Offline mode (PWA)
- Internationalization (i18n)
- Accessibility improvements (WCAG 2.1 AA)

---

## 📅 RECOMMENDED TIMELINE

### **Week 1: Critical Fixes + Security**
- Day 1-2: Fix bugs (Dashboard stats, password change)
- Day 2-3: Enable Redis, test cookie auth
- Day 3-4: Update student frontend for cookie auth
- Day 5: Testing and documentation

### **Week 2: High-Priority Features**
- Day 1-3: Implement Lesson Questions/Discussions
- Day 4: Student Activity Timeline
- Day 5: Testing and bug fixes

### **Week 3-4: Medium-Priority Features**
- Week 3: Enhanced video progress tracking
- Week 3: Knowledge base implementation
- Week 4: Certificate verification
- Week 4: Begin testing suite

### **Week 5-6: Polish + Production Prep**
- DevOps setup (Docker, CI/CD)
- Performance optimization
- Security audit
- Load testing
- Documentation updates

### **Week 7-8: Production Launch**
- Staging deployment
- Final testing
- Production deployment
- Monitoring setup
- User onboarding

---

## ✅ DEFINITION OF DONE

### For Each Feature:
- [ ] Code implemented and working
- [ ] Unit tests written (if applicable)
- [ ] Integration tested with other features
- [ ] Responsive design verified
- [ ] Dark mode works correctly
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Accessibility checked
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Tested in production-like environment

### For Production Launch:
- [ ] All critical bugs fixed
- [ ] Security audit complete
- [ ] Performance tested (load testing)
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Error tracking setup (Sentry)
- [ ] CI/CD pipeline working
- [ ] Documentation complete
- [ ] User training materials ready
- [ ] Support team briefed

---

## 🚨 BLOCKERS & RISKS

### Current Blockers:
1. **Redis Requirement** - Must be installed for new auth to work
2. **Environment Variables** - Must be configured correctly
3. **CORS Configuration** - Must allow credentials for cookies

### Potential Risks:
1. **Breaking Changes** - Cookie auth might break existing sessions
   - **Mitigation:** Backward compatibility maintained (Authorization header fallback)

2. **Redis Downtime** - If Redis fails, logout won't work
   - **Mitigation:** Graceful degradation (fail open on blacklist check)

3. **Cookie Issues** - HTTPS required in production for secure cookies
   - **Mitigation:** Ensure SSL certificates configured before production

4. **CORS Issues** - Cross-origin cookies can be tricky
   - **Mitigation:** Proper domain configuration, `SameSite=lax`

---

## 📞 SUPPORT & QUESTIONS

For technical questions:
- Review documentation: SECURITY_UPGRADE_HTTPONLY_COOKIES.md
- Check backend API docs: http://localhost:5000/api-docs (Swagger)
- Review codebase analysis in project root

---

**Next Action:** Choose Priority 1 tasks and start implementation!
