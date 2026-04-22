/**
 * Integration Tests for Bookmarks API
 */

const request = require('supertest');
const app = require('../../server');
const { User, Course, Category, CourseModule, ModuleContent, Enrollment, LessonBookmark, KnowledgeArticle, ArticleBookmark } = require('../../models');

describe('Bookmarks API', () => {
  let studentToken;
  let studentId;
  let testCourseId, testContentId, testArticleId;
  let lessonBookmarkId, articleBookmarkId;

  beforeAll(async () => {
    // Create student
    const studentRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Student Bookmarks',
        email: `student_bookmarks_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'student',
      });
    studentToken = studentRes.body.data.accessToken;
    studentId = studentRes.body.data.user.id;

    // Create category
    const category = await Category.create({
      name: `Test Bookmark Category ${Date.now()}`,
      slug: `test-bookmark-cat-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    });

    // Create course
    const course = await Course.create({
      title: 'Test Bookmark Course',
      slug: `test-bookmark-course-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      description: 'Course for bookmark testing',
      instructor_id: studentId,
      category_id: category.id,
      difficulty: 'beginner',
      status: 'published',
    });
    testCourseId = course.id;

    // Create module
    const module = await CourseModule.create({
      course_id: testCourseId,
      title: 'Test Module',
      order_index: 1,
    });

    // Create content
    const content = await ModuleContent.create({
      module_id: module.id,
      title: 'Test Lesson',
      content_type: 'video',
      youtube_url: 'https://www.youtube.com/watch?v=test',
      order_index: 1,
      duration_minutes: 30,
    });
    testContentId = content.id;

    // Enroll student
    await Enrollment.create({
      student_id: studentId,
      course_id: testCourseId,
      enrollment_date: new Date(),
      status: 'active',
    });

    // Create knowledge article
    const article = await KnowledgeArticle.create({
      title: 'Test Article for Bookmarks',
      slug: `test-article-bookmarks-${Date.now()}`,
      content: 'Test article content',
      author_id: studentId,
      category_id: category.id,
      status: 'published',
    });
    testArticleId = article.id;
  });

  // =========================================================================
  // LESSON BOOKMARKS
  // =========================================================================
  describe('Lesson Bookmarks', () => {
    describe('POST /api/bookmarks/lessons', () => {
      it('should create a lesson bookmark', async () => {
        const response = await request(app)
          .post('/api/bookmarks/lessons')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            content_id: testContentId,
            note: 'Important concept explained here',
            timestamp: 300, // 5 minutes in
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.bookmark.content_id).toBe(testContentId);
        expect(response.body.data.bookmark.note).toBe('Important concept explained here');
        lessonBookmarkId = response.body.data.bookmark.id;
      });

      it('should create bookmark without note', async () => {
        const response = await request(app)
          .post('/api/bookmarks/lessons')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            content_id: testContentId,
            timestamp: 600,
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.bookmark.timestamp).toBe(600);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/bookmarks/lessons')
          .send({
            content_id: testContentId,
            note: 'Unauthorized bookmark',
          })
          .expect(401);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('GET /api/bookmarks/lessons', () => {
      it('should get all lesson bookmarks for user', async () => {
        const response = await request(app)
          .get('/api/bookmarks/lessons')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data.bookmarks)).toBe(true);
        expect(response.body.data.bookmarks.length).toBeGreaterThan(0);
      });

      it('should filter bookmarks by course', async () => {
        const response = await request(app)
          .get(`/api/bookmarks/lessons?course_id=${testCourseId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.bookmarks.length).toBeGreaterThan(0);
      });
    });

    describe('PUT /api/bookmarks/lessons/:id', () => {
      it('should update lesson bookmark', async () => {
        const response = await request(app)
          .put(`/api/bookmarks/lessons/${lessonBookmarkId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            note: 'Updated note - very important!',
            timestamp: 350,
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.bookmark.note).toBe('Updated note - very important!');
        expect(response.body.data.bookmark.timestamp).toBe(350);
      });

      it('should return 404 for non-existent bookmark', async () => {
        const response = await request(app)
          .put('/api/bookmarks/lessons/99999')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            note: 'Update non-existent',
          })
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
      });
    });

    describe('DELETE /api/bookmarks/lessons/:id', () => {
      it('should delete lesson bookmark', async () => {
        const response = await request(app)
          .delete(`/api/bookmarks/lessons/${lessonBookmarkId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('deleted');
      });
    });
  });

  // =========================================================================
  // ARTICLE BOOKMARKS
  // =========================================================================
  describe('Article Bookmarks', () => {
    describe('POST /api/bookmarks/articles', () => {
      it('should create an article bookmark', async () => {
        const response = await request(app)
          .post('/api/bookmarks/articles')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            article_id: testArticleId,
            note: 'Great reference article',
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.bookmark.article_id).toBe(testArticleId);
        expect(response.body.data.bookmark.note).toBe('Great reference article');
        articleBookmarkId = response.body.data.bookmark.id;
      });

      it('should create bookmark without note', async () => {
        // Delete the previous one first
        await ArticleBookmark.destroy({ where: { id: articleBookmarkId } });

        const response = await request(app)
          .post('/api/bookmarks/articles')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            article_id: testArticleId,
          })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        articleBookmarkId = response.body.data.bookmark.id;
      });

      it('should prevent duplicate article bookmarks', async () => {
        const response = await request(app)
          .post('/api/bookmarks/articles')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            article_id: testArticleId,
          })
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.message).toContain('already bookmarked');
      });
    });

    describe('GET /api/bookmarks/articles', () => {
      it('should get all article bookmarks for user', async () => {
        const response = await request(app)
          .get('/api/bookmarks/articles')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data.bookmarks)).toBe(true);
        expect(response.body.data.bookmarks.length).toBeGreaterThan(0);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/bookmarks/articles?page=1&limit=10')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('pagination');
      });
    });

    describe('PUT /api/bookmarks/articles/:id', () => {
      it('should update article bookmark note', async () => {
        const response = await request(app)
          .put(`/api/bookmarks/articles/${articleBookmarkId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            note: 'Updated article note - must read again!',
          })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data.bookmark.note).toBe('Updated article note - must read again!');
      });
    });

    describe('DELETE /api/bookmarks/articles/:id', () => {
      it('should delete article bookmark', async () => {
        const response = await request(app)
          .delete(`/api/bookmarks/articles/${articleBookmarkId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.message).toContain('deleted');
      });

      it('should return 404 for already deleted bookmark', async () => {
        const response = await request(app)
          .delete(`/api/bookmarks/articles/${articleBookmarkId}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(404);

        expect(response.body).toHaveProperty('success', false);
      });
    });
  });

  // Cleanup
  afterAll(async () => {
    try {
      await LessonBookmark.destroy({ where: { user_id: studentId } });
      await ArticleBookmark.destroy({ where: { user_id: studentId } });
      await KnowledgeArticle.destroy({ where: { id: testArticleId } });
      await Enrollment.destroy({ where: { user_id: studentId } });
      await Course.destroy({ where: { id: testCourseId } });
      await User.destroy({ where: { id: studentId } });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });
});
