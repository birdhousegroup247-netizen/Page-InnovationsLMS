import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

// Base API URL - will use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: true, // Send cookies with requests
});

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  (config) => {
    // Per-tab Bearer token (sessionStorage > localStorage). See
    // tokenStorage.js — this is what lets student and instructor tabs
    // run with different sessions in the same browser.
    const accessToken = tokenStorage.get('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Get CSRF token from cookie and add to header (if still using cookies for CSRF)
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf-token='))
      ?.split('=')[1];

    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - attempt to refresh token
    // Skip refresh if we're on a public page (login, register, etc.) or if the request was for login
    const isPublicPage =
      window.location.pathname.startsWith('/login') ||
      window.location.pathname.startsWith('/signup') ||
      window.location.pathname.startsWith('/register') ||
      window.location.pathname.startsWith('/forgot-password') ||
      window.location.pathname.startsWith('/reset-password') ||
      window.location.pathname === '/';

    const isLoginRequest = originalRequest.url.includes('/api/auth/login');

    if (error.response?.status === 401 && !originalRequest._retry && !isPublicPage && !isLoginRequest) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenStorage.get('refreshToken');
        if (!refreshToken) {
          tokenStorage.clearAll();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );

        // Preserve the original persistence choice. If the user ticked
        // "Remember me" we'd have seeded localStorage with the token, so
        // check that as the indicator for whether to persist the rotated
        // token too — otherwise the next browser restart would lose the
        // session it should have kept.
        const wasPersisted = !!localStorage.getItem('refreshToken');
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
        tokenStorage.set('accessToken', newAccessToken, { persist: wasPersisted });
        tokenStorage.set('refreshToken', newRefreshToken, { persist: wasPersisted });

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        tokenStorage.clearAll();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // If we're on a public page, just reject the error without refresh attempt
    return Promise.reject(error);
  }
);

// API endpoints organized by feature
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  logout: () => api.post('/api/auth/logout'),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.get('/api/auth/verify-email', { params: { token } }),
  verifyEmailCode: (email, code) => api.post('/api/auth/verify-email-code', { email, code }),
  resendVerification: (email) => api.post('/api/auth/resend-verification', { email }),
  instructorApply: (data) => api.post('/api/auth/instructor-apply', data),
  applyToTeach: (data) => api.post('/api/auth/apply-to-teach', data),
  refreshToken: (refreshToken) => api.post('/api/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/api/auth/me'),
  updateProfile: (data) => api.put('/api/profile', data),
};

export const coursesAPI = {
  getAll: (params) => api.get('/api/courses', { params }),
  getById: (id) => api.get(`/api/courses/${id}`),
  create: (data) => api.post('/api/courses', data),
  update: (id, data) => api.put(`/api/courses/${id}`, data),
  delete: (id) => api.delete(`/api/courses/${id}`),
  enroll: (id) => api.post(`/api/courses/${id}/enroll`),
  getProgress: (id) => api.get(`/api/courses/${id}/progress`),
  getReviews: (id, params) => api.get(`/api/courses/${id}/reviews`, { params }),
  getReviewStats: (id) => api.get(`/api/courses/${id}/reviews/stats`),
  addReview: (id, data) => api.post(`/api/courses/${id}/reviews`, data),
  updateReview: (courseId, reviewId, data) => api.put(`/api/courses/${courseId}/reviews/${reviewId}`, data),
  deleteReview: (courseId, reviewId) => api.delete(`/api/courses/${courseId}/reviews/${reviewId}`),
  markReviewHelpful: (courseId, reviewId) => api.post(`/api/courses/${courseId}/reviews/${reviewId}/helpful`),
  getInstructorCourses: () => api.get('/api/courses/my/teaching'),
  getInstructorStudents: (params) => api.get('/api/courses/my/students', { params }),
};

// Instructor-specific APIs
export const instructorAPI = {
  // Dashboard
  getDashboard: () => api.get('/api/instructor/dashboard'),
  getStats: () => api.get('/api/instructor/stats'),

  // Student Management
  getCourseStudents: (courseId, params) => api.get(`/api/instructor/courses/${courseId}/students`, { params }),
  getStudentProgress: (studentId, courseId) => api.get(`/api/instructor/students/${studentId}/progress/${courseId}`),
  getStudentTestResults: (studentId, params) => api.get(`/api/instructor/students/${studentId}/test-results`, { params }),
  getCourseEnrollments: (courseId, params) => api.get(`/api/instructor/courses/${courseId}/enrollments`, { params }),

  // Test Analytics
  getTestAnalytics: (testId) => api.get(`/api/instructor/tests/${testId}/analytics`),
  getTestResults: (testId, params) => api.get(`/api/instructor/tests/${testId}/results`, { params }),
  getAttemptDetails: (attemptId) => api.get(`/api/instructor/attempts/${attemptId}/details`),

  // Question Status
  getMyQuestions: (params) => api.get('/api/instructor/questions/my', { params }),
  getQuestionStatus: (questionId) => api.get(`/api/instructor/questions/${questionId}/status`),
  getQuestionStats: () => api.get('/api/instructor/questions/stats'),

  // Course Analytics
  getCourseAnalytics: (courseId, params) => api.get(`/api/instructor/courses/${courseId}/analytics`, { params }),
  getEnrollmentTrends: (courseId, params) => api.get(`/api/instructor/courses/${courseId}/enrollment-trends`, { params }),
  getProgressDistribution: (courseId) => api.get(`/api/instructor/courses/${courseId}/progress-distribution`),
};

export const categoriesAPI = {
  getAll: () => api.get('/api/courses/categories'),
  getById: (id) => api.get(`/api/categories/${id}`),
  create: (data) => api.post('/api/categories', data),
  update: (id, data) => api.put(`/api/categories/${id}`, data),
  delete: (id) => api.delete(`/api/categories/${id}`),
};

export const enrollmentsAPI = {
  getMyCourses: () => api.get('/api/courses/my/enrollments'),
  getEnrollment: (courseId) => api.get(`/api/enrollments/${courseId}`),
  unenroll: (courseId) => api.delete(`/api/enrollments/${courseId}`),
};

export const progressAPI = {
  markComplete: (contentId) => api.post(`/api/courses/contents/${contentId}/complete`),
  updateProgress: (contentId, data) => api.post(`/api/courses/contents/${contentId}/progress`, data),
  getProgress: (courseId) => api.get(`/api/courses/${courseId}/progress`),
};

export const examsAPI = {
  getPracticeTests: (params) => api.get('/api/exams/practice-tests', { params }),
  getPracticeTestById: (id) => api.get(`/api/exams/practice-tests/${id}`),
  submitPracticeTest: (id, data) => api.post(`/api/exams/practice-tests/${id}/submit`, data),
  getAssignedTests: () => api.get('/api/exams/assigned-tests'),
  getTestAttempt: (attemptId) => api.get(`/api/exams/attempts/${attemptId}`),
};

// Practice Tests API (Student)
export const practiceTestsAPI = {
  generate: (data) => api.post('/api/practice-tests/generate', data),
  getHistory: (params) => api.get('/api/practice-tests/history', { params }),
  getAttempt: (attemptId) => api.get(`/api/practice-tests/${attemptId}`),
  submit: (attemptId, data) => api.post(`/api/practice-tests/${attemptId}/submit`, data),
  getResults: (attemptId) => api.get(`/api/practice-tests/${attemptId}/results`),
};

// Assigned Tests API (Student & Instructor)
export const assignedTestsAPI = {
  // Student endpoints
  getMyTests: (params) => api.get('/api/assigned-tests/student/my-tests', { params }),
  getTest: (testId) => api.get(`/api/assigned-tests/student/${testId}`),
  startAttempt: (testId) => api.post(`/api/assigned-tests/student/${testId}/start`),
  submitAttempt: (attemptId, data) => api.post(`/api/assigned-tests/student/attempts/${attemptId}/submit`, data),
  getAttempt: (attemptId) => api.get(`/api/assigned-tests/student/attempts/${attemptId}`),
  getResults: (attemptId) => api.get(`/api/assigned-tests/student/attempts/${attemptId}/results`),

  // Instructor endpoints
  getInstructorTests: (params) => api.get('/api/assigned-tests/my-tests', { params }),
  createTest: (data) => api.post('/api/assigned-tests/', data),
  updateTest: (testId, data) => api.put(`/api/assigned-tests/${testId}`, data),
  deleteTest: (testId) => api.delete(`/api/assigned-tests/${testId}`),
  getTestById: (testId) => api.get(`/api/assigned-tests/${testId}`),
  addQuestionsToTest: (testId, data) => api.post(`/api/assigned-tests/${testId}/questions`, data),
  assignTestToStudents: (testId, data) => api.post(`/api/assigned-tests/${testId}/assign`, data),
  getTestResults: (testId, params) => api.get(`/api/assigned-tests/${testId}/results`, { params }),
  getTestAttempts: (testId, params) => api.get(`/api/assigned-tests/${testId}/attempts`, { params }),
};

// Questions API (for practice test generation & instructor contributions)
export const questionsAPI = {
  // /api/questions/approved does not exist as a route — it was being
  // swallowed by /api/questions/:id (id="approved") and silently
  // returning nothing. Use the real endpoint with the is_approved filter.
  getApproved: (params) => api.get('/api/questions', { params: { ...params, is_approved: true } }),
  getByCategory: (categoryId, params) => api.get(`/api/questions/category/${categoryId}`, { params }),
  getAll: (params) => api.get('/api/questions', { params }),
  getById: (id) => api.get(`/api/questions/${id}`),
  create: (payload) => api.post('/api/questions/', payload),
  update: (id, payload) => api.put(`/api/questions/${id}`, payload),
  delete: (id) => api.delete(`/api/questions/${id}`),
  getMyContributions: (params) => api.get('/api/instructor/questions/my', { params }),
  updateStatus: (id, status) => api.put(`/api/questions/${id}/status`, { status }),
  bulkImport: (data) => api.post('/api/questions/bulk-import', data),
};

export const notificationsAPI = {
  getAll: (params) => api.get('/api/notifications', { params }),
  getUnreadCount: () => api.get('/api/notifications/unread/count'),
  markAsRead: (id) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/mark-all-read'),
  delete: (id) => api.delete(`/api/notifications/${id}`),
};

export const bookmarksAPI = {
  getLessonBookmarks: (params) => api.get('/api/bookmarks/lessons', { params }),
  createLessonBookmark: (data) => api.post('/api/bookmarks/lessons', data),
  updateLessonBookmark: (id, data) => api.put(`/api/bookmarks/lessons/${id}`, data),
  deleteLessonBookmark: (id) => api.delete(`/api/bookmarks/lessons/${id}`),
  getArticleBookmarks: (params) => api.get('/api/bookmarks/articles', { params }),
  createArticleBookmark: (data) => api.post('/api/bookmarks/articles', data),
  updateArticleBookmark: (id, data) => api.put(`/api/bookmarks/articles/${id}`, data),
  deleteArticleBookmark: (id) => api.delete(`/api/bookmarks/articles/${id}`),
};

// Modules API
export const modulesAPI = {
  getCourseModules: (courseId) => api.get(`/api/courses/${courseId}/modules`),
  create: (courseId, data) => api.post(`/api/courses/${courseId}/modules`, data),
  update: (moduleId, data) => api.put(`/api/courses/modules/${moduleId}`, data),
  delete: (moduleId) => api.delete(`/api/courses/modules/${moduleId}`),
};

// Contents (Lessons) API
export const contentsAPI = {
  getModuleContents: (moduleId) => api.get(`/api/courses/modules/${moduleId}/contents`),
  getById: (contentId) => api.get(`/api/courses/contents/${contentId}`),
  create: (moduleId, data) => api.post(`/api/courses/modules/${moduleId}/contents`, data),
  update: (contentId, data) => api.put(`/api/courses/contents/${contentId}`, data),
  delete: (contentId) => api.delete(`/api/courses/contents/${contentId}`),
};

// Profile API
export const profileAPI = {
  getProfile: () => api.get('/api/profile'),
  updateProfile: (data) => api.put('/api/profile', data),
  updateAvatar: (avatar_url) => api.put('/api/profile/avatar', { profile_picture: avatar_url }),
  changePassword: (data) => api.put('/api/profile/password', data),
  getStats: () => api.get('/api/profile/stats'),
  getActivity: (params) => api.get('/api/profile/activity', { params }),
};

// Admin: User Management
export const adminUsersAPI = {
  getAll: (params) => api.get('/api/admin/users', { params }),
  getById: (id) => api.get(`/api/admin/users/${id}`),
  create: (data) => api.post('/api/admin/users', data),
  update: (id, data) => api.put(`/api/admin/users/${id}`, data),
  delete: (id) => api.delete(`/api/admin/users/${id}`),
  activate: (id) => api.patch(`/api/admin/users/${id}/activate`),
  getRolesStats: () => api.get('/api/admin/users/stats/roles'),
};

// Admin: Course Management
export const adminCoursesAPI = {
  getAll: (params) => api.get('/api/admin/courses', { params }),
  getById: (id) => api.get(`/api/admin/courses/${id}`),
  updateStatus: (id, status) => api.patch(`/api/admin/courses/${id}/status`, { status }),
  getStats: () => api.get('/api/admin/courses/stats'),
};

// Admin: Instructor Application Management
export const adminInstructorAPI = {
  getPendingApplications: () => api.get('/api/admin/instructor-applications/pending'),
  getAllApplications: (status) => api.get('/api/admin/instructor-applications', { params: { status } }),
  getStats: () => api.get('/api/admin/instructor-applications/stats'),
  approveApplication: (userId) => api.put(`/api/admin/instructor-applications/${userId}/approve`),
  rejectApplication: (userId, reason) => api.put(`/api/admin/instructor-applications/${userId}/reject`, { reason }),
  revokeInstructor: (userId, reason) => api.put(`/api/admin/instructor-applications/${userId}/revoke`, { reason }),
};

// Lesson Questions & Replies API
export const lessonQuestionsAPI = {
  // Questions
  getLessonQuestions: (contentId, params) => api.get(`/api/lessons/${contentId}/questions`, { params }),
  askQuestion: (contentId, data) => api.post(`/api/lessons/${contentId}/questions`, data),
  getQuestionById: (questionId) => api.get(`/api/questions/${questionId}`),
  updateQuestion: (questionId, data) => api.put(`/api/questions/${questionId}`, data),
  deleteQuestion: (questionId) => api.delete(`/api/questions/${questionId}`),
  upvoteQuestion: (questionId) => api.post(`/api/questions/${questionId}/upvote`),

  // Replies
  replyToQuestion: (questionId, data) => api.post(`/api/questions/${questionId}/replies`, data),
  updateReply: (replyId, data) => api.put(`/api/replies/${replyId}`, data),
  deleteReply: (replyId) => api.delete(`/api/replies/${replyId}`),
  upvoteReply: (replyId) => api.post(`/api/replies/${replyId}/upvote`),
};

// Announcements API
export const announcementsAPI = {
  // Backend mounts the announcements router at /api (not /api/announcements),
  // so the per-course paths are /api/courses/:id/announcements and the
  // by-id paths are /api/announcements/:id. The earlier "double-prefixed"
  // URLs (/api/announcements/courses/.../announcements) all 404'd.
  getMyAnnouncements: () => api.get('/api/announcements/my'),
  getCourseAnnouncements: (courseId, params) => api.get(`/api/courses/${courseId}/announcements`, { params }),
  createAnnouncement: (courseId, data) => api.post(`/api/courses/${courseId}/announcements`, data),
  getById: (announcementId) => api.get(`/api/announcements/${announcementId}`),
  update: (announcementId, data) => api.put(`/api/announcements/${announcementId}`, data),
  delete: (announcementId) => api.delete(`/api/announcements/${announcementId}`),
};

// Chat API (course rooms + direct messages)
export const chatAPI = {
  // Admin
  adminGetRooms: (params) => api.get('/api/chat/admin/rooms', { params }),
  adminGetRoomMessages: (roomId, params) => api.get(`/api/chat/admin/rooms/${roomId}/messages`, { params }),
  // Mute
  toggleMute: (payload) => api.post('/api/chat/mute', payload),
  getMuteStatus: (params) => api.get('/api/chat/mute', { params }),
  // Course chat rooms
  getMyRooms: () => api.get('/api/chat/rooms'),
  searchCoursemates: (q) => api.get('/api/chat/users/search', { params: { q } }),
  getRoomByCourse: (courseId) => api.get(`/api/chat/rooms/course/${courseId}`),
  getRoomMembers: (roomId) => api.get(`/api/chat/rooms/${roomId}/members`),
  getRoomMessages: (roomId, params) => api.get(`/api/chat/rooms/${roomId}/messages`, { params }),
  sendRoomMessage: (roomId, formData) =>
    api.post(`/api/chat/rooms/${roomId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getPendingRequests: (roomId) => api.get(`/api/chat/rooms/${roomId}/requests`),
  handleJoinRequest: (roomId, userId, action) => api.patch(`/api/chat/rooms/${roomId}/requests/${userId}`, { action }),
  removeMember: (roomId, userId) => api.delete(`/api/chat/rooms/${roomId}/members/${userId}`),
  // Instructor moderation: report = mute now, admin reviews.
  muteMember: (roomId, userId, reason) => api.patch(`/api/chat/rooms/${roomId}/members/${userId}/mute`, { reason }),
  unmuteMember: (roomId, userId) => api.patch(`/api/chat/rooms/${roomId}/members/${userId}/mute`, { unmute: true }),
  toggleLockRoom: (roomId) => api.patch(`/api/chat/rooms/${roomId}/lock`),
  toggleRoom: (roomId) => api.patch(`/api/chat/rooms/${roomId}/toggle`),
  // Messages
  deleteMessage: (messageId) => api.delete(`/api/chat/messages/${messageId}`),
  toggleReaction: (messageId, emoji) => api.post(`/api/chat/messages/${messageId}/reactions`, { emoji }),
  pinMessage: (messageId) => api.patch(`/api/chat/messages/${messageId}/pin`),
  // Direct messages
  getConversations: () => api.get('/api/chat/conversations'),
  getOrCreateConversation: (recipientId) => api.post('/api/chat/conversations', { recipientId }),
  getConversationMessages: (conversationId, params) => api.get(`/api/chat/conversations/${conversationId}/messages`, { params }),
  sendDirectMessage: (conversationId, formData) =>
    api.post(`/api/chat/conversations/${conversationId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  markConversationRead: (conversationId) => api.patch(`/api/chat/conversations/${conversationId}/read`),
};

// Notes API
export const notesAPI = {
  getNotes: (contentId) => api.get(`/api/notes/${contentId}`),
  createNote: (contentId, data) => api.post(`/api/notes/${contentId}`, data),
  updateNote: (noteId, data) => api.put(`/api/notes/entry/${noteId}`, data),
  deleteNote: (noteId) => api.delete(`/api/notes/entry/${noteId}`),
  getAllMyNotes: () => api.get('/api/notes'),
};

// Badges API
export const badgesAPI = {
  getAll: () => api.get('/api/badges'),
  getMyBadges: () => api.get('/api/badges/my'),
  getUserBadges: (userId) => api.get(`/api/badges/user/${userId}`),
};

// Leaderboard API
export const leaderboardAPI = {
  get: (params) => api.get('/api/leaderboard', { params }),
  getMyRank: () => api.get('/api/leaderboard/my-rank'),
};

// Assignments API
export const assignmentsAPI = {
  // Instructor
  getCourseAssignments: (courseId) => api.get(`/api/instructor/courses/${courseId}/assignments`),
  createAssignment: (courseId, data) => api.post(`/api/instructor/courses/${courseId}/assignments`, data),
  updateAssignment: (id, data) => api.put(`/api/instructor/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/api/instructor/assignments/${id}`),
  getSubmissions: (id) => api.get(`/api/instructor/assignments/${id}/submissions`),
  gradeSubmission: (submissionId, data) => api.post(`/api/instructor/submissions/${submissionId}/grade`, data),
  // Student
  getAllStudentAssignments: () => api.get('/api/student/assignments'),
  getStudentAssignments: (courseId) => api.get(`/api/courses/${courseId}/assignments`),
  submitAssignment: (id, data) => api.post(`/api/assignments/${id}/submit`, data),
  updateSubmission: (id, data) => api.put(`/api/assignments/${id}/submit`, data),
};

// 2FA API
export const twoFactorAPI = {
  getStatus: () => api.get('/api/auth/2fa/status'),
  setup: () => api.post('/api/auth/2fa/setup'),
  verify: (token) => api.post('/api/auth/2fa/verify', { token }),
  disable: (token) => api.post('/api/auth/2fa/disable', { token }),
  authenticate: (userId, token) => api.post('/api/auth/2fa/authenticate', { userId, token }),
};

// Bulk Enrollment API
export const activityAPI = {
  getStreak: () => api.get('/api/activity/streak'),
};

export const bulkEnrollAPI = {
  bulkEnroll: (courseId, emails) => api.post(`/api/instructor/courses/${courseId}/bulk-enroll`, { emails }),
};

export const searchAPI = {
  search: (query, type = 'all', limit = 5) => api.get('/api/search', { params: { q: query, type, limit } }),
};

export const liveSessionsAPI = {
  getByCourse: (courseId) => api.get(`/api/courses/${courseId}/sessions`),
  create: (courseId, data) => api.post(`/api/courses/${courseId}/sessions`, data),
  update: (id, data) => api.put(`/api/sessions/${id}`, data),
  delete: (id) => api.delete(`/api/sessions/${id}`),
  updateStatus: (id, status) => api.patch(`/api/sessions/${id}/status`, { status }),
};

export const forumAPI = {
  getPosts: (courseId, params) => api.get(`/api/courses/${courseId}/forum`, { params }),
  createPost: (courseId, data) => api.post(`/api/courses/${courseId}/forum`, data),
  getPost: (postId) => api.get(`/api/forum/${postId}`),
  updatePost: (postId, data) => api.put(`/api/forum/${postId}`, data),
  deletePost: (postId) => api.delete(`/api/forum/${postId}`),
  addReply: (postId, data) => api.post(`/api/forum/${postId}/replies`, data),
  updateReply: (replyId, data) => api.put(`/api/forum/replies/${replyId}`, data),
  deleteReply: (replyId) => api.delete(`/api/forum/replies/${replyId}`),
  pinPost: (postId) => api.post(`/api/forum/${postId}/pin`),
  upvotePost: (postId) => api.post(`/api/forum/${postId}/upvote`),
};

export const instructorReviewsAPI = {
  getReviews: (instructorId) => api.get(`/api/instructors/${instructorId}/reviews`),
  getStats: (instructorId) => api.get(`/api/instructors/${instructorId}/reviews/stats`),
  create: (instructorId, data) => api.post(`/api/instructors/${instructorId}/reviews`, data),
  update: (instructorId, reviewId, data) => api.put(`/api/instructors/${instructorId}/reviews/${reviewId}`, data),
  delete: (instructorId, reviewId) => api.delete(`/api/instructors/${instructorId}/reviews/${reviewId}`),
};

export const paymentsAPI = {
  createCheckoutSession: (data) => api.post('/api/payments/checkout-session', data),
  createInstallmentSession: () => api.post('/api/payments/installment-session'),
  verifyPayment: (sessionId) => api.get('/api/payments/verify', { params: { session_id: sessionId } }),
  initializePaystackCheckout: (data) => api.post('/api/payments/paystack/initialize', data),
  initializePaystackInstallment: () => api.post('/api/payments/paystack/installment'),
  verifyPaystackPayment: (reference) => api.get('/api/payments/paystack/verify', { params: { reference } }),
  initializePayPalCheckout: (data) => api.post('/api/payments/paypal/initialize', data),
  initializePayPalInstallment: () => api.post('/api/payments/paypal/installment'),
  capturePayPalOrder: (orderId) => api.post('/api/payments/paypal/capture', { order_id: orderId }),
  verifyPayPalPayment: (orderId) => api.get('/api/payments/paypal/verify', { params: { order_id: orderId } }),
  getMyPayments: () => api.get('/api/payments/my'),
};

export const couponsAPI = {
  validate: (data) => api.post('/api/coupons/validate', data),
};

export const referralsAPI = {
  getMyStats: () => api.get('/api/referrals/my-stats'),
};

export const wishlistAPI = {
  getMyWishlist: () => api.get('/api/wishlist'),
  add: (courseId) => api.post(`/api/wishlist/${courseId}`),
  remove: (courseId) => api.delete(`/api/wishlist/${courseId}`),
  check: (courseId) => api.get(`/api/wishlist/${courseId}/check`),
};

export const discordAPI = {
  getStatus: () => api.get('/api/discord/status'),
  connect: () => { window.location.href = `${api.defaults.baseURL}/api/discord/auth`; },
  disconnect: () => api.delete('/api/discord/disconnect'),
  getCourseInvite: (courseId) => api.get(`/api/discord/course/${courseId}/invite`),
};

export const knowledgeAPI = {
  getAll: (params) => api.get('/api/knowledge', { params }),
  getPopular: () => api.get('/api/knowledge/popular'),
  getBySlug: (slug) => api.get(`/api/knowledge/${slug}`),
};

export default api;
