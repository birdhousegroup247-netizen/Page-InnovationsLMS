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

// Request interceptor — attach a Bearer token (so CSRF auto-exempts the request
// on the backend) and the CSRF cookie value as a fallback for cookie-auth callers.
//
// Why this matters: the admin app is on a different *.up.railway.app subdomain
// from the API. Cross-site cookies (even with sameSite=none) get stripped by
// modern browsers in many situations (incognito, strict tracking prevention,
// Safari, etc.). When that happens the csrf-token cookie isn't even readable —
// hence "Invalid or missing CSRF token" on every write. Sending a Bearer token
// sidesteps the issue entirely, because the backend CSRF check skips any
// request that has an Authorization header.
api.interceptors.request.use(
  (config) => {
    const accessToken = tokenStorage.get('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrf-token='))
      ?.split('=')[1];
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
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
      window.location.pathname.startsWith('/register') ||
      window.location.pathname.startsWith('/forgot-password') ||
      window.location.pathname.startsWith('/reset-password') ||
      window.location.pathname === '/';

    const isLoginRequest = originalRequest.url.includes('/api/auth/login');

    if (error.response?.status === 401 && !originalRequest._retry && !isPublicPage && !isLoginRequest) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenStorage.get('refreshToken');
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          refreshToken ? { refreshToken } : {},
          { withCredentials: true }
        );

        // Preserve persistence — if the original login was Remember me
        // (=> localStorage has the refresh token), persist the rotated
        // tokens too. Otherwise keep them tab-only.
        const wasPersisted = !!localStorage.getItem('refreshToken');
        const { accessToken: newAccess, refreshToken: newRefresh } = response.data?.data || {};
        if (newAccess) tokenStorage.set('accessToken', newAccess, { persist: wasPersisted });
        if (newRefresh) tokenStorage.set('refreshToken', newRefresh, { persist: wasPersisted });

        if (newAccess) originalRequest.headers.Authorization = `Bearer ${newAccess}`;
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
  verifyEmail: (token) => api.get(`/api/auth/verify-email/${token}`),
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

export const categoriesAPI = {
  getAll: () => api.get('/api/courses/categories'),
  getById: (id) => api.get(`/api/categories/${id}`),
  create: (data) => api.post('/api/categories', data),
  update: (id, data) => api.put(`/api/categories/${id}`, data),
  delete: (id) => api.delete(`/api/categories/${id}`),
};

export const enrollmentsAPI = {
  getMyCourses: () => api.get('/api/enrollments/my-courses'),
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
  sendPasswordReset: (userId) => api.post(`/api/admin/users/${userId}/send-password-reset`),
  sendVerificationEmail: (userId) => api.post(`/api/admin/users/${userId}/send-verification-email`),
  // Override user access (unlock suspended, clear preview, etc.)
  setRegistrationStatus: (userId, data) => api.patch(`/api/admin/users/${userId}/registration-status`, data),
  // Courses this user teaches
  getTeachingCourses: (userId) => api.get(`/api/admin/users/${userId}/teaching-courses`),
  // Per-student assignment performance — totals + recent submissions
  getAssignmentPerformance: (userId) => api.get(`/api/admin/users/${userId}/assignment-performance`),
};

// Admin: Course Management
export const adminCoursesAPI = {
  getAll: (params) => api.get('/api/admin/courses', { params }),
  getById: (id) => api.get(`/api/admin/courses/${id}`),
  create: (data) => api.post('/api/courses', data), // Use regular courses endpoint
  update: (id, data) => api.put(`/api/courses/${id}`, data), // Use regular courses endpoint
  delete: (id) => api.delete(`/api/courses/${id}`), // Use regular courses endpoint
  updateStatus: (id, status) => api.patch(`/api/admin/courses/${id}/status`, { status }),
  getStats: () => api.get('/api/admin/courses/stats'),
  approve: (id) => api.patch(`/api/admin/courses/${id}/status`, { status: 'published' }),
  reject: (id) => api.patch(`/api/admin/courses/${id}/status`, { status: 'draft' }),
  archive: (id) => api.patch(`/api/admin/courses/${id}/status`, { status: 'archived' }),
  // Bulk operations
  bulkUpdateStatus: (courseIds, status) => api.post('/api/admin/courses/bulk/status', { courseIds, status }),
  bulkDelete: (courseIds) => api.post('/api/admin/courses/bulk/delete', { courseIds }),
  bulkUpdateField: (courseIds, field, value) => api.post('/api/admin/courses/bulk/update-field', { courseIds, field, value }),
  // Instructor assignment
  assignInstructor: (courseId, instructor_id) => api.patch(`/api/admin/courses/${courseId}/instructor`, { instructor_id }),
  // Multi-instructor roster
  listInstructors: (courseId) => api.get(`/api/admin/courses/${courseId}/instructors`),
  addInstructor: (courseId, user_id, role = 'co') => api.post(`/api/admin/courses/${courseId}/instructors`, { user_id, role }),
  removeInstructor: (courseId, userId) => api.delete(`/api/admin/courses/${courseId}/instructors/${userId}`),
};

// Admin: Instructor Application Management
export const adminInstructorAPI = {
  getPendingApplications: () => api.get('/api/admin/instructor-applications/pending'),
  getAllApplications: (status) => api.get('/api/admin/instructor-applications', { params: { status } }),
  getStats: () => api.get('/api/admin/instructor-applications/stats'),
  approveApplication: (userId) => api.put(`/api/admin/instructor-applications/${userId}/approve`),
  rejectApplication: (userId, reason) => api.put(`/api/admin/instructor-applications/${userId}/reject`, { reason }),
  seedDemo: () => api.post('/api/admin/instructor-applications/seed-demo'),
  revokeInstructor: (userId, reason) => api.put(`/api/admin/instructor-applications/${userId}/revoke`, { reason }),
};

// Admin: Statistics & Analytics
export const adminStatsAPI = {
  getOverview: () => api.get('/api/admin/stats/overview'),
  getEnrollmentTrends: (days = 30) => api.get('/api/admin/stats/enrollments/trends', { params: { days } }),
  getPopularCourses: (limit = 10) => api.get('/api/admin/stats/courses/popular', { params: { limit } }),
  getRecentActivities: (limit = 20) => api.get('/api/admin/stats/activities/recent', { params: { limit } }),
  getSystemHealth: () => api.get('/api/admin/stats/system/health'),
};

// Admin: Analytics (Detailed)
export const adminAnalyticsAPI = {
  getStudentPerformance: () => api.get('/api/admin/analytics/students/performance'),
  getCourseAnalytics: () => api.get('/api/admin/analytics/courses'),
  getQuestionAnalytics: () => api.get('/api/admin/analytics/questions'),
  getInstructorAnalytics: () => api.get('/api/admin/analytics/instructors'),
  getEnrollmentAnalytics: (days = 30) => api.get('/api/admin/analytics/enrollments', { params: { days } }),
};

// Admin: Activity Logs
export const adminActivityAPI = {
  getAllLogs: (params) => api.get('/api/activity/admin/activity-logs', { params }),
  getUserLogs: (userId, params) => api.get(`/api/activity/admin/activity-logs/user/${userId}`, { params }),
  getStats: (params) => api.get('/api/activity/admin/activity-logs/stats', { params }),
};

// Admin: Category Management
export const adminCategoriesAPI = {
  getAll: (params) => api.get('/api/admin/categories', { params }),
  getById: (id) => api.get(`/api/admin/categories/${id}`),
  create: (data) => api.post('/api/admin/categories', data),
  update: (id, data) => api.put(`/api/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/api/admin/categories/${id}`),
  getStats: () => api.get('/api/admin/categories/stats'),
};

// Admin: Question Bank Management
export const adminQuestionsAPI = {
  getAll: (params) => api.get('/api/questions', { params }),
  getById: (id) => api.get(`/api/questions/${id}`),
  create: (data) => api.post('/api/questions', data),
  update: (id, data) => api.put(`/api/questions/${id}`, data),
  delete: (id) => api.delete(`/api/questions/${id}`),
  approve: (id) => api.patch(`/api/questions/${id}/approve`),
  bulkImport: (data) => api.post('/api/questions/bulk', data),
  bulkApprove: (questionIds) => api.post('/api/questions/bulk/approve', { question_ids: questionIds }),
  bulkDelete: (questionIds) => api.post('/api/questions/bulk/delete', { question_ids: questionIds }),
  getStats: () => api.get('/api/questions/stats'),
  getCourseStats: () => api.get('/api/questions/stats/by-course'),
  getCategoryBreakdown: () => api.get('/api/questions/stats/by-category'),
};

// Admin: Test Management
export const adminTestsAPI = {
  getAll: (params) => api.get('/api/assigned-tests/my-tests', { params }),
  getById: (id) => api.get(`/api/assigned-tests/${id}`),
  create: (data) => api.post('/api/assigned-tests', data),
  update: (id, data) => api.put(`/api/assigned-tests/${id}`, data),
  delete: (id) => api.delete(`/api/assigned-tests/${id}`),
  addQuestions: (testId, data) => api.post(`/api/assigned-tests/${testId}/questions`, data),
  assignStudents: (testId, data) => api.post(`/api/assigned-tests/${testId}/assign`, data),
  getResults: (testId, params) => api.get(`/api/assigned-tests/${testId}/results`, { params }),
  getStudentResult: (attemptId) => api.get(`/api/assigned-tests/attempts/${attemptId}`),
  publish: (testId, data) => api.patch(`/api/assigned-tests/${testId}/publish`, data),
  archive: (testId) => api.patch(`/api/assigned-tests/${testId}/archive`),
};

// Practice Test Management (Student-facing)
export const practiceTestsAPI = {
  generate: (data) => api.post('/api/practice-tests/generate', data),
  getHistory: (params) => api.get('/api/practice-tests/history', { params }),
  getAttempt: (attemptId) => api.get(`/api/practice-tests/${attemptId}`),
  submit: (attemptId, data) => api.post(`/api/practice-tests/${attemptId}/submit`, data),
  getResults: (attemptId) => api.get(`/api/practice-tests/${attemptId}/results`),
};

// Admin: Coupon Manager
export const adminCouponsAPI = {
  getAll: (params) => api.get('/api/admin/coupons', { params }),
  getStats: () => api.get('/api/admin/coupons/stats'),
  getById: (id) => api.get(`/api/admin/coupons/${id}`),
  create: (data) => api.post('/api/admin/coupons', data),
  update: (id, data) => api.put(`/api/admin/coupons/${id}`, data),
  delete: (id) => api.delete(`/api/admin/coupons/${id}`),
};

// Admin: Leads Dashboard
export const adminLeadsAPI = {
  getAll: (params) => api.get('/api/admin/leads', { params }),
  getStats: () => api.get('/api/admin/leads/stats'),
  getById: (id) => api.get(`/api/admin/leads/${id}`),
  markConverted: (id) => api.patch(`/api/admin/leads/${id}/convert`),
  delete: (id) => api.delete(`/api/admin/leads/${id}`),
};

// Admin: Chat Moderation + Support Inbox
export const chatAPI = {
  // Room moderation
  adminGetRooms: (params) => api.get('/api/chat/admin/rooms', { params }),
  adminGetRoomMessages: (roomId) => api.get(`/api/chat/admin/rooms/${roomId}/messages`),
  // Pending moderation reports (every muted ChatRoomMember).
  adminGetReports: () => api.get('/api/chat/admin/reports'),
  // Admin resolves a report by unmuting the user.
  adminResolveReport: (roomId, userId) =>
    api.patch(`/api/chat/rooms/${roomId}/members/${userId}/mute`, { unmute: true }),
  // Or escalates by removing the user from the room entirely.
  adminRemoveMember: (roomId, userId) =>
    api.delete(`/api/chat/rooms/${roomId}/members/${userId}`),
  // Room state controls.
  adminGetRoomMembers: (roomId) => api.get(`/api/chat/rooms/${roomId}/members`),
  adminToggleLockRoom: (roomId) => api.patch(`/api/chat/rooms/${roomId}/lock`),
  adminToggleRoom: (roomId) => api.patch(`/api/chat/rooms/${roomId}/toggle`),
  adminMuteMember: (roomId, userId, reason) =>
    api.patch(`/api/chat/rooms/${roomId}/members/${userId}/mute`, { reason }),
  adminUnmuteMember: (roomId, userId) =>
    api.patch(`/api/chat/rooms/${roomId}/members/${userId}/mute`, { unmute: true }),
  // Admin can post in any room (sendRoomMessage already bypasses
  // membership checks for admins server-side).
  adminSendRoomMessage: (roomId, body) =>
    api.post(`/api/chat/rooms/${roomId}/messages`, { body }),
  // Platform-wide chat suspension.
  adminGetSuspendedUsers: () => api.get('/api/chat/admin/suspended-users'),
  adminSuspendChat: (userId, reason) =>
    api.post(`/api/chat/admin/users/${userId}/suspend-chat`, { reason }),
  adminUnsuspendChat: (userId) =>
    api.post(`/api/chat/admin/users/${userId}/suspend-chat`, { unsuspend: true }),
  toggleRoom: (roomId) => api.patch(`/api/chat/rooms/${roomId}/toggle`),
  deleteMessage: (msgId) => api.delete(`/api/chat/messages/${msgId}`),
  // Support DMs
  searchUsers: (q) => api.get('/api/chat/users/search', { params: { q } }),
  getOrCreateConversation: (recipientId) => api.post('/api/chat/conversations', { recipientId }),
  getConversations: () => api.get('/api/chat/conversations'),
  getConversationMessages: (convId) => api.get(`/api/chat/conversations/${convId}/messages`),
  sendMessage: (convId, body) => api.post(`/api/chat/conversations/${convId}/messages`, { body }),
};

// Admin: Enrollment Management
export const adminEnrollmentsAPI = {
  getAll: (params) => api.get('/api/admin/enrollments', { params }),
  getStats: () => api.get('/api/admin/enrollments/stats'),
  create: (data) => api.post('/api/admin/enrollments', data),
  remove: (id) => api.delete(`/api/admin/enrollments/${id}`),
  updateProgress: (id, progress_percentage) => api.patch(`/api/admin/enrollments/${id}/progress`, { progress_percentage }),
};

// Admin: Payments Dashboard
export const adminPaymentsAPI = {
  getAll: (params) => api.get('/api/admin/payments', { params }),
  getStats: () => api.get('/api/admin/payments/stats'),
  issueRefund: (id, reason) => api.post(`/api/admin/payments/${id}/refund`, { reason }),
};

// Admin: Global Announcements
export const adminAnnouncementsAPI = {
  getAll: (params) => api.get('/api/admin/announcements', { params }),
  getRecipientCount: (target, course_id) => api.get('/api/admin/announcements/recipient-count', { params: { target, course_id } }),
  send: (data) => api.post('/api/admin/announcements', data),
  uploadAttachment: (file, onUploadProgress) => {
    const fd = new FormData();
    fd.append('file', file);
    // NOTE: do NOT set Content-Type here — axios needs to set it itself so
    // it can append the multipart boundary. A manual "multipart/form-data"
    // strips the boundary and multer rejects the body. Lesson re-learned.
    return api.post('/api/upload/announcement-attachment', fd, { onUploadProgress });
  },
};

export const adminBundlesAPI = {
  getAll: () => api.get('/api/admin/bundles'),
  create: (data) => api.post('/api/admin/bundles', data),
  update: (id, data) => api.put(`/api/admin/bundles/${id}`, data),
  delete: (id) => api.delete(`/api/admin/bundles/${id}`),
};

// Admin: Referrals
export const adminReferralsAPI = {
  getAll: () => api.get('/api/admin/referrals'),
};

// Admin: Badges
export const adminBadgesAPI = {
  getAll: () => api.get('/api/badges'),
  create: (data) => api.post('/api/badges', data),
  update: (id, data) => api.put(`/api/badges/${id}`, data),
  delete: (id) => api.delete(`/api/badges/${id}`),
};

export default api;
