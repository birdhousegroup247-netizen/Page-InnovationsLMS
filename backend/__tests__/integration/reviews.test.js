/**
 * Integration Tests for Course Reviews API
 */

const request = require('supertest');
const app = require('../../server');
const { User, Course, Category, Enrollment, CourseReview } = require('../../models');

describe('Course Reviews API', () => {
  let studentToken, instructorToken;
  let studentId, instructorId;
  let testCourseId, testReviewId;

  beforeAll(async () => {
    // Create instructor
    const instructorRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Instructor Reviews',
        email: `instructor_reviews_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'instructor',
      });
    instructorToken = instructorRes.body.data.accessToken;
    instructorId = instructorRes.body.data.user.id;

    // Create student
    const studentRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Student Reviews',
        email: `student_reviews_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'student',
      });
    studentToken = studentRes.body.data.accessToken;
    studentId = studentRes.body.data.user.id;

    // Create category
    const category = await Category.create({
      name: `Test Review Category ${Date.now()}`,
      slug: `test-review-cat-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    });

    // Create course
    const course = await Course.create({
      title: 'Test Review Course',
      slug: `test-review-course-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      description: 'Course for review testing',
      instructor_id: instructorId,
      category_id: category.id,
      difficulty: 'beginner',
      status: 'published',
    });
    testCourseId = course.id;

    // Enroll student
    await Enrollment.create({
      student_id: studentId,
      course_id: testCourseId,
      enrollment_date: new Date(),
      status: 'active',
    });
  });

  describe('POST /api/courses/:courseId/reviews', () => {
    it('should create a review for enrolled student', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourseId}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          rating: 5,
          review_text: 'Excellent course! Very informative.',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.review.rating).toBe(5);
      expect(response.body.data.review.review_text).toBe('Excellent course! Very informative.');
      testReviewId = response.body.data.review.id;
    });

    it('should reject review from unenrolled student', async () => {
      // Create another student
      const newStudentRes = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Unenrolled Student',
          email: `unenrolled_review_${Date.now()}@example.com`,
          password: 'TestPassword123!',
          role: 'student',
        });
      const newStudentToken = newStudentRes.body.data.accessToken;

      const response = await request(app)
        .post(`/api/courses/${testCourseId}/reviews`)
        .set('Authorization', `Bearer ${newStudentToken}`)
        .send({
          rating: 4,
          review_text: 'Good course',
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should validate rating range', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourseId}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          rating: 6, // Invalid rating > 5
          review_text: 'Test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should prevent duplicate reviews', async () => {
      const response = await request(app)
        .post(`/api/courses/${testCourseId}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          rating: 4,
          review_text: 'Second review attempt',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toContain('already reviewed');
    });
  });

  describe('GET /api/courses/:courseId/reviews', () => {
    it('should get all reviews for a course', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourseId}/reviews`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data.reviews)).toBe(true);
      expect(response.body.data.reviews.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourseId}/reviews?page=1&limit=5`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.itemsPerPage).toBe(5);
    });
  });

  describe('GET /api/courses/:courseId/reviews/stats', () => {
    it('should get review statistics', async () => {
      const response = await request(app)
        .get(`/api/courses/${testCourseId}/reviews/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('average_rating');
      expect(response.body.data).toHaveProperty('total_reviews');
      expect(response.body.data.total_reviews).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/courses/:courseId/reviews/:reviewId', () => {
    it('should update own review', async () => {
      const response = await request(app)
        .put(`/api/courses/${testCourseId}/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          rating: 4,
          review_text: 'Updated review - still great!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.review.rating).toBe(4);
      expect(response.body.data.review.review_text).toBe('Updated review - still great!');
    });

    it('should reject update of another user review', async () => {
      // Create another student
      const anotherStudentRes = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Another Student',
          email: `another_review_${Date.now()}@example.com`,
          password: 'TestPassword123!',
          role: 'student',
        });
      const anotherStudentToken = anotherStudentRes.body.data.accessToken;

      const response = await request(app)
        .put(`/api/courses/${testCourseId}/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${anotherStudentToken}`)
        .send({
          rating: 1,
          review_text: 'Hacked review',
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/courses/:courseId/reviews/:reviewId', () => {
    it('should delete own review', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourseId}/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted');
    });

    it('should return 404 for already deleted review', async () => {
      const response = await request(app)
        .delete(`/api/courses/${testCourseId}/reviews/${testReviewId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  // Cleanup
  afterAll(async () => {
    try {
      await CourseReview.destroy({ where: { course_id: testCourseId } });
      await Enrollment.destroy({ where: { student_id: studentId } });
      await Course.destroy({ where: { id: testCourseId } });
      await User.destroy({ where: { id: [studentId, instructorId] } });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });
});
