/**
 * Integration Tests for Notifications API
 */

const request = require('supertest');
const app = require('../../server');
const { User, Notification } = require('../../models');

describe('Notifications API', () => {
  let studentToken, instructorToken;
  let studentId, instructorId;
  let testNotificationId;

  beforeAll(async () => {
    // Create student
    const studentRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Student Notifications',
        email: `student_notif_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'student',
      });
    studentToken = studentRes.body.data.accessToken;
    studentId = studentRes.body.data.user.id;

    // Create instructor
    const instructorRes = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test Instructor Notifications',
        email: `instructor_notif_${Date.now()}@example.com`,
        password: 'TestPassword123!',
        role: 'instructor',
      });
    instructorToken = instructorRes.body.data.accessToken;
    instructorId = instructorRes.body.data.user.id;

    // Create test notifications
    const notification1 = await Notification.create({
      user_id: studentId,
      type: 'course_enrollment',
      title: 'Welcome to SQL Basics',
      message: 'You have successfully enrolled in SQL Basics course.',
      is_read: false,
    });
    testNotificationId = notification1.id;

    await Notification.create({
      user_id: studentId,
      type: 'test_assignment',
      title: 'New Test Assigned',
      message: 'A new test has been assigned to you.',
      is_read: false,
    });

    await Notification.create({
      user_id: studentId,
      type: 'announcement',
      title: 'Course Updated',
      message: 'New content has been added to your course.',
      is_read: true, // Already read
    });
  });

  describe('GET /api/notifications', () => {
    it('should get all notifications for user', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data.notifications)).toBe(true);
      expect(response.body.data.notifications.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter unread notifications', async () => {
      const response = await request(app)
        .get('/api/notifications?is_read=false')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.notifications.every(n => !n.is_read)).toBe(true);
    });

    it('should filter read notifications', async () => {
      const response = await request(app)
        .get('/api/notifications?is_read=true')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.notifications.every(n => n.is_read)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/notifications?page=1&limit=2')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination.itemsPerPage).toBe(2);
    });

    it('should filter by notification type', async () => {
      const response = await request(app)
        .get('/api/notifications?type=course_enrollment')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.notifications.every(n => n.type === 'course_enrollment')).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should only show user own notifications', async () => {
      // Instructor should not see student notifications
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      // Instructor should have 0 or different notifications
      const hasStudentNotif = response.body.data.notifications.some(
        n => n.user_id === studentId
      );
      expect(hasStudentNotif).toBe(false);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should get unread notification count', async () => {
      const response = await request(app)
        .get('/api/notifications/unread/count')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('unread_count');
      expect(typeof response.body.data.unread_count).toBe('number');
      expect(response.body.data.unread_count).toBeGreaterThanOrEqual(1); // At least 1 unread
    });

    it('should return 0 for user with no unread notifications', async () => {
      // Mark all as read first
      await Notification.update(
        { is_read: true },
        { where: { user_id: studentId } }
      );

      const response = await request(app)
        .get('/api/notifications/unread/count')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.data.unread_count).toBe(0);

      // Reset for other tests
      await Notification.update(
        { is_read: false },
        { where: { id: testNotificationId } }
      );
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/${testNotificationId}/read`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('marked as read');

      // Verify it was updated
      const notification = await Notification.findByPk(testNotificationId);
      expect(notification.is_read).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .put('/api/notifications/99999/read')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should prevent marking another user notification', async () => {
      // Create notification for instructor
      const instrNotif = await Notification.create({
        user_id: instructorId,
        type: 'system',
        title: 'Instructor Notification',
        message: 'This is for the instructor',
        is_read: false,
      });

      // Student tries to mark instructor's notification
      const response = await request(app)
        .put(`/api/notifications/${instrNotif.id}/read`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404); // Should not find it (belongs to different user)

      expect(response.body).toHaveProperty('success', false);

      // Cleanup
      await instrNotif.destroy();
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete own notification', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${testNotificationId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.message).toContain('deleted');

      // Verify it was deleted
      const notification = await Notification.findByPk(testNotificationId);
      expect(notification).toBeNull();
    });

    it('should return 404 for already deleted notification', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${testNotificationId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should prevent deleting another user notification', async () => {
      // Create notification for instructor
      const instrNotif = await Notification.create({
        user_id: instructorId,
        type: 'system',
        title: 'Instructor Notification',
        message: 'This is for the instructor',
        is_read: false,
      });

      // Student tries to delete instructor's notification
      const response = await request(app)
        .delete(`/api/notifications/${instrNotif.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);

      // Verify it still exists
      const notification = await Notification.findByPk(instrNotif.id);
      expect(notification).not.toBeNull();

      // Cleanup
      await instrNotif.destroy();
    });
  });

  // Cleanup
  afterAll(async () => {
    try {
      await Notification.destroy({ where: { user_id: [studentId, instructorId] } });
      await User.destroy({ where: { id: [studentId, instructorId] } });
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });
});
