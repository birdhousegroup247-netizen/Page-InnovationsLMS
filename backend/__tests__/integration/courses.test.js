/**
 * Integration Tests for Courses API
 */

const request = require('supertest');
const app = require('../../server');
const { User, Course, Category, Enrollment } = require('../../models');

describe('Courses API', () => {
  let studentToken, instructorToken, adminToken;
  let studentId, instructorId, adminId;
  let testCategoryId, testCourseId;

  // Setup: Create test users and get tokens
  beforeAll(async () => {
    // Create student
    const studentRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Student',
        email: `student_courses_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'student',
      });
    studentToken = studentRes.body.data.accessToken;
    studentId = studentRes.body.data.user.id;

    // Create instructor
    const instructorRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Instructor',
        email: `instructor_courses_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'instructor',
      });
    instructorToken = instructorRes.body.data.accessToken;
    instructorId = instructorRes.body.data.user.id;

    // Create admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Admin',
        email: `admin_courses_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'admin',
      });
    adminToken = adminRes.body.data.accessToken;
    adminId = adminRes.body.data.user.id;

    // Create test category
    const category = await Category.create({
      name: 'Test Category',
      slug: `test-category-${Date.now()}`,
      description: 'Test category description',
    });
    testCategoryId = category.id;
  });

  describe('POST /api/courses', () => {
    it('should create a new course (instructor)', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Advanced SQL Mastery',
          description: 'Master advanced SQL techniques',
          category_id: testCategoryId,
          difficulty: 'advanced',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.course.title).toBe('Advanced SQL Mastery');
      expect(response.body.data.course.instructor_id).toBe(instructorId);
      testCourseId = response.body.data.course.id;
    });

    it('should reject course creation by students', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Unauthorized Course',
          description: 'This should fail',
          category_id: testCategoryId,
          difficulty: 'beginner',
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Missing Fields Course',
          // Missing description and category_id
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/courses', () => {
    it('should get all published courses', async () => {
      const response = await request(app)
        .get('/api/courses')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('courses');
      expect(Array.isArray(response.body.data.courses)).toBe(true);
    });

    it('should filter courses by level', async () => {
      const response = await request(app)
        .get('/api/courses?level=advanced')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.courses.every(course => course.level === 'advanced')).toBe(true);
    });

    it('should filter courses by category', async () => {
      const response = await request(app)
        .get(`/api/courses?category=${testCategoryId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.courses.every(course => course.category_id === testCategoryId)).toBe(true);
    });

    it('should search courses by title', async () => {
      const response = await request(app)
        .get('/api/courses?search=SQL')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.courses.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/courses/:id', () => {
    it('should get course details by ID', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourseId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.course.id).toBe(testCourseId);
      expect(response.body.data.course.title).toBe('Advanced SQL Mastery');
    });

    it('should return 404 for non-existent course', async () => {
      const response = await request(app)
        .get('/api/courses/99999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/courses/:id', () => {
    it('should update course (instructor owner)', async () => {
      const response = await request(app)
        .put(`/api/courses/${testCourseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Updated SQL Mastery',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.course.title).toBe('Updated SQL Mastery');
    });

    it('should reject update by non-owner instructor', async () => {
      // Create another instructor
      const anotherInstructorRes = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Another Instructor',
          email: `instructor2_courses_${Date.now()}@example.com`,
          password: 'TestPassword123!',
          role: 'instructor',
        });
      const anotherInstructorToken = anotherInstructorRes.body.data.accessToken;

      const response = await request(app)
        .put(`/api/courses/${testCourseId}`)
        .set('Authorization', `Bearer ${anotherInstructorToken}`)
        .send({
          title: 'Unauthorized Update',
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should allow admin to update any course', async () => {
      const response = await request(app)
        .put(`/api/courses/${testCourseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Updated Course',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.course.title).toBe('Admin Updated Course');
    });
  });

  describe('POST /api/courses/:id/enroll', () => {
    it('should enroll student in course', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourseId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.enrollment.course_id).toBe(testCourseId);
      expect(response.body.data.enrollment.user_id).toBe(studentId);
    });

    it('should prevent duplicate enrollment', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourseId}/enroll`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already enrolled');
    });

    it('should reject enrollment without authentication', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourseId}/enroll`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/courses/:id/progress', () => {
    it('should get student progress in course', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourseId}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('progress');
      expect(response.body.data.progress).toHaveProperty('completion_percentage');
    });

    it('should return 403 if not enrolled', async () => {
      // Create new student who hasn't enrolled
      const newStudentRes = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Unenrolled Student',
          email: `unenrolled_${Date.now()}@example.com`,
          password: 'TestPassword123!',
          role: 'student',
        });
      const newStudentToken = newStudentRes.body.data.accessToken;

      const response = await request(app)
        .get(`/api/courses/${testCourseId}/progress`)
        .set('Authorization', `Bearer ${newStudentToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/courses/:id', () => {
    it('should delete course (instructor owner)', async () => {
      // Create a course to delete
      const createRes = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Course to Delete',
          description: 'This will be deleted',
          category_id: testCategoryId,
          difficulty: 'beginner',
        });
      const courseToDeleteId = createRes.body.data.course.id;

      const response = await request(app)
        .delete(`/api/courses/${courseToDeleteId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted');

      // Verify course is deleted
      const getResponse = await request(app)
        .get(`/api/courses/${courseToDeleteId}`)
        .expect(404);
    });

    it('should reject deletion by student', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourseId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Cleanup: Delete test data
  afterAll(async () => {
    try {
      // Delete enrollments
      await Enrollment.destroy({ where: { user_id: studentId } });

      // Delete courses
      await Course.destroy({ where: { instructor_id: instructorId } });
      await Course.destroy({ where: { id: testCourseId } });

      // Delete category
      await Category.destroy({ where: { id: testCategoryId } });

      // Delete users
      await User.destroy({ where: { id: [studentId, instructorId, adminId] } });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });
});
