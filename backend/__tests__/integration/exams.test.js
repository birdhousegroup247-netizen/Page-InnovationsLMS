/**
 * Integration Tests for Exam System (Practice & Assigned Tests)
 */

const request = require('supertest');
const app = require('../../server');
const bcrypt = require('bcrypt');
const { User, Course, Category, QuestionBank, PracticeTestAttempt, AssignedTest } = require('../../models');

describe('Exam System API', () => {
  let studentToken, instructorToken;
  let studentId, instructorId;
  let testCourseId, testCategoryId, testQuestionIds = [];

  beforeAll(async () => {
    // Create student
    const studentRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Student Exam',
        email: `student_exam_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'student',
      });
    studentToken = studentRes.body.data.accessToken;
    studentId = studentRes.body.data.user.id;

    // Create instructor directly (instructor registration requires admin approval)
    const instructorEmail = `instructor_exam_${Date.now()}@example.com`;
    const instructorPassword = 'TestPassword123!';
    const instructorUser = await User.create({
      full_name: 'Test Instructor Exam',
      email: instructorEmail,
      password_hash: await bcrypt.hash(instructorPassword, 10),
      role: 'instructor',
      instructor_status: 'approved',
    });
    instructorId = instructorUser.id;
    const instructorLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: instructorEmail, password: instructorPassword });
    instructorToken = instructorLoginRes.body.data.accessToken;

    // Create test category and course with unique slug
    const uniqueSlug = `test-exam-cat-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const category = await Category.create({
      name: `Test Exam Category ${Date.now()}`,
      slug: uniqueSlug,
    });
    testCategoryId = category.id;

    const course = await Course.create({
      title: 'Test Exam Course',
      slug: `test-exam-course-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      description: 'Course for exam testing',
      instructor_id: instructorId,
      category_id: category.id,
      difficulty: 'intermediate',
      status: 'published',
    });
    testCourseId = course.id;

    // Create test questions (QuestionBank requires category_id, not course_id)
    const questions = [
      {
        category_id: testCategoryId,
        question_text: 'What is SQL?',
        question_type: 'multiple_choice',
        options: JSON.stringify(['Structured Query Language', 'Simple Query Language', 'System Query Language', 'None']),
        correct_answer: 'Structured Query Language',
        marks: 10,
        difficulty: 'easy',
        created_by: instructorId,
        is_approved: true,
        approval_status: 'approved',
      },
      {
        category_id: testCategoryId,
        question_text: 'Explain normalization',
        question_type: 'fill_blank',
        correct_answer: 'Process of organizing database to reduce redundancy',
        marks: 15,
        difficulty: 'medium',
        created_by: instructorId,
        is_approved: true,
        approval_status: 'approved',
      },
      {
        category_id: testCategoryId,
        question_text: 'SQL stands for Structured Query Language',
        question_type: 'true_false',
        correct_answer: 'true',
        marks: 5,
        difficulty: 'easy',
        created_by: instructorId,
        is_approved: true,
        approval_status: 'approved',
      },
    ];

    for (const q of questions) {
      const question = await QuestionBank.create(q);
      testQuestionIds.push(question.id);
    }

    // Enroll student in course
    await request(app)
      .post(`/api/courses/${testCourseId}/enroll`)
      .set('Authorization', `Bearer ${studentToken}`);
  });

  // =========================================================================
  // PRACTICE TESTS
  // =========================================================================
  describe('Practice Tests', () => {
    let practiceAttemptId;

    describe('POST /api/practice-tests/generate', () => {
      it('should generate a practice test for enrolled student', async () => {
        const response = await request(app)
          .post('/api/practice-tests/generate')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            categories: [testCategoryId],
            difficulty: 'easy',
            question_count: 2,
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.attempt).toHaveProperty('id');
        practiceAttemptId = response.body.data.attempt.id;
      });

      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .post('/api/practice-tests/generate')
          .send({
            categories: [testCategoryId],
            difficulty: 'easy',
            question_count: 2,
          })
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/practice-tests/generate')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            // Missing categories
            question_count: 5,
          })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/practice-tests/history', () => {
      it('should get practice test history for student', async () => {
        const response = await request(app)
          .get('/api/practice-tests/history')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data.attempts)).toBe(true);
        expect(response.body.data.attempts.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/practice-tests/:attemptId', () => {
      it('should get ongoing practice test', async () => {
        const response = await request(app)
          .get(`/api/practice-tests/${practiceAttemptId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.attempt.id).toBe(practiceAttemptId);
        expect(response.body.data.attempt.status).toBe('in_progress');
      });
    });

    describe('POST /api/practice-tests/:attemptId/submit', () => {
      it('should submit practice test with answers', async () => {
        const response = await request(app)
          .post(`/api/practice-tests/${practiceAttemptId}/submit`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            answers: [
              { question_id: testQuestionIds[0], student_answer: 'Structured Query Language' },
              { question_id: testQuestionIds[2], student_answer: 'true' },
            ],
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.result).toHaveProperty('total_score');
        expect(response.body.data.result).toHaveProperty('percentage');
      });

      it('should not allow resubmission', async () => {
        const response = await request(app)
          .post(`/api/practice-tests/${practiceAttemptId}/submit`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            answers: [
              { question_id: testQuestionIds[0], student_answer: 'Wrong Answer' },
            ],
          })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('already completed');
      });
    });

    describe('GET /api/practice-tests/:attemptId/results', () => {
      it('should get practice test results', async () => {
        const response = await request(app)
          .get(`/api/practice-tests/${practiceAttemptId}/results`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.attempt.status).toBe('completed');
        expect(response.body.data).toHaveProperty('answers');
      });
    });
  });

  // =========================================================================
  // ASSIGNED TESTS
  // =========================================================================
  describe('Assigned Tests', () => {
    let assignedTestId;
    const testCode = `EXAM_${Date.now()}`;

    describe('POST /api/assigned-tests', () => {
      it('should create assigned test (instructor)', async () => {
        const response = await request(app)
          .post('/api/assigned-tests')
          .set('Authorization', `Bearer ${instructorToken}`)
          .send({
            test_name: 'Midterm Exam',
            test_code: testCode,
            description: 'SQL Basics Midterm',
            course_id: testCourseId,
            total_questions: 0,
            time_limit_minutes: 60,
            passing_score: 70,
            start_date: new Date(Date.now() + 3600000).toISOString(),
            end_date: new Date(Date.now() + 7200000).toISOString(),
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.test.test_name).toBe('Midterm Exam');
        expect(response.body.data.test.time_limit_minutes).toBe(60);
        assignedTestId = response.body.data.test.id;
      });

      it('should reject test creation by students', async () => {
        const response = await request(app)
          .post('/api/assigned-tests')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            test_name: 'Unauthorized Test',
            test_code: `UNAUTH_${Date.now()}`,
            total_questions: 0,
          })
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
      });

      it('should reject duplicate test code', async () => {
        const response = await request(app)
          .post('/api/assigned-tests')
          .set('Authorization', `Bearer ${instructorToken}`)
          .send({
            test_name: 'Duplicate Code Test',
            test_code: testCode, // Same code as above
            total_questions: 0,
          })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('POST /api/assigned-tests/:testId/questions', () => {
      it('should add questions to assigned test', async () => {
        const response = await request(app)
          .post(`/api/assigned-tests/${assignedTestId}/questions`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .send({ question_ids: testQuestionIds })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });

    describe('GET /api/assigned-tests/my-tests', () => {
      it('should get instructor created tests', async () => {
        const response = await request(app)
          .get('/api/assigned-tests/my-tests')
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data.tests)).toBe(true);
        expect(response.body.data.tests.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/assigned-tests/:testId', () => {
      it('should get assigned test details', async () => {
        const response = await request(app)
          .get(`/api/assigned-tests/${assignedTestId}`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.test.id).toBe(assignedTestId);
        expect(response.body.data.test.test_name).toBe('Midterm Exam');
      });
    });

    describe('PUT /api/assigned-tests/:testId', () => {
      it('should update assigned test (instructor owner)', async () => {
        const response = await request(app)
          .put(`/api/assigned-tests/${assignedTestId}`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .send({
            test_name: 'Updated Midterm Exam',
            time_limit_minutes: 90,
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.test.test_name).toBe('Updated Midterm Exam');
      });

      it('should reject update by students', async () => {
        const response = await request(app)
          .put(`/api/assigned-tests/${assignedTestId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ test_name: 'Unauthorized Update' })
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('POST /api/assigned-tests/:testId/assign', () => {
      it('should assign test to students (instructor)', async () => {
        const response = await request(app)
          .post(`/api/assigned-tests/${assignedTestId}/assign`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .send({ user_ids: [studentId] })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });

      it('should reject assignment by students', async () => {
        const response = await request(app)
          .post(`/api/assigned-tests/${assignedTestId}/assign`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ user_ids: [studentId] })
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('DELETE /api/assigned-tests/:testId', () => {
      it('should reject deletion by students', async () => {
        const response = await request(app)
          .delete(`/api/assigned-tests/${assignedTestId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
      });

      it('should delete assigned test (instructor owner)', async () => {
        const response = await request(app)
          .delete(`/api/assigned-tests/${assignedTestId}`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  // =========================================================================
  // QUESTION BANK
  // =========================================================================
  describe('Question Bank', () => {
    describe('GET /api/questions', () => {
      it('should get all questions (instructor)', async () => {
        const response = await request(app)
          .get('/api/questions')
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data.questions)).toBe(true);
      });

      it('should filter questions by category', async () => {
        const response = await request(app)
          .get(`/api/questions?category=${testCategoryId}`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.questions.every(q => q.category_id === testCategoryId)).toBe(true);
      });

      it('should reject access by students', async () => {
        const response = await request(app)
          .get('/api/questions')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('POST /api/questions', () => {
      it('should create a new question (instructor)', async () => {
        const response = await request(app)
          .post('/api/questions')
          .set('Authorization', `Bearer ${instructorToken}`)
          .send({
            category_id: testCategoryId,
            question_text: 'What is a primary key?',
            question_type: 'multiple_choice',
            options: JSON.stringify(['Unique identifier', 'Foreign key', 'Index', 'None']),
            correct_answer: 'Unique identifier',
            marks: 10,
            difficulty: 'easy',
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.question.question_text).toBe('What is a primary key?');
      });

      it('should reject question creation by students', async () => {
        const response = await request(app)
          .post('/api/questions')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            category_id: testCategoryId,
            question_text: 'Unauthorized Question',
            question_type: 'true_false',
            correct_answer: 'true',
            marks: 5,
          })
          .expect(403);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('POST /api/questions/bulk', () => {
      it('should bulk import questions (instructor)', async () => {
        const response = await request(app)
          .post('/api/questions/bulk')
          .set('Authorization', `Bearer ${instructorToken}`)
          .send({
            category_id: testCategoryId,
            questions: [
              {
                question_text: 'Bulk Question 1',
                question_type: 'fill_blank',
                correct_answer: 'Answer 1',
                marks: 10,
                difficulty: 'medium',
              },
              {
                question_text: 'Bulk Question 2',
                question_type: 'true_false',
                correct_answer: 'false',
                marks: 5,
                difficulty: 'easy',
              },
            ],
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.created_count).toBe(2);
      });
    });
  });

  // Cleanup
  afterAll(async () => {
    try {
      await PracticeTestAttempt.destroy({ where: { student_id: studentId } });
      await AssignedTest.destroy({ where: { course_id: testCourseId } });
      await QuestionBank.destroy({ where: { category_id: testCategoryId } });
      await Course.destroy({ where: { id: testCourseId } });
      await Category.destroy({ where: { id: testCategoryId } });
      await User.destroy({ where: { id: [studentId, instructorId] } });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });
});
