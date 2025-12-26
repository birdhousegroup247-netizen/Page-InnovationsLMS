import axios from 'axios';

// Base API URL - will use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Attempt to refresh access token
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

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
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (data) => api.put('/api/auth/profile', data),
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
  getAll: () => api.get('/api/categories'),
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

// Practice Tests API (Student)
export const practiceTestsAPI = {
  generate: (data) => api.post('/api/practice-tests/generate', data),
  getHistory: (params) => api.get('/api/practice-tests/history', { params }),
  getAttempt: (attemptId) => api.get(`/api/practice-tests/${attemptId}`),
  submit: (attemptId, data) => api.post(`/api/practice-tests/${attemptId}/submit`, data),
  getResults: (attemptId) => api.get(`/api/practice-tests/${attemptId}/results`),
};

// Assigned Tests API (Student)
export const assignedTestsAPI = {
  getMyTests: (params) => api.get('/api/assigned-tests/student/my-tests', { params }),
  getTest: (testId) => api.get(`/api/assigned-tests/student/${testId}`),
  startAttempt: (testId) => api.post(`/api/assigned-tests/student/${testId}/start`),
  submitAttempt: (attemptId, data) => api.post(`/api/assigned-tests/student/attempts/${attemptId}/submit`, data),
  getAttempt: (attemptId) => api.get(`/api/assigned-tests/student/attempts/${attemptId}`),
  getResults: (attemptId) => api.get(`/api/assigned-tests/student/attempts/${attemptId}/results`),
};

// Questions API (for practice test generation)
export const questionsAPI = {
  getApproved: (params) => api.get('/api/questions/approved', { params }),
  getByCategory: (categoryId, params) => api.get(`/api/questions/category/${categoryId}`, { params }),
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

export default api;
