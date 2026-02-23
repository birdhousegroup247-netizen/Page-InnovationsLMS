/**
 * Integration Tests — Messaging Feature
 * Covers: course chat rooms, direct messages, reactions, mute, pin, admin moderation
 */

const request = require('supertest');
const app = require('../../server');
const { sequelize, ChatRoom, ChatRoomMember, Conversation, Message, MessageReaction, MutedChat, Course, User } = require('../../models');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function login(email, password = 'password123') {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  // Return cookie jar string for subsequent requests
  const cookies = res.headers['set-cookie'] || [];
  return { token: res.body?.data?.accessToken, cookies };
}

function authed(agent, cookies, token) {
  if (cookies && cookies.length) return agent.set('Cookie', cookies);
  if (token) return agent.set('Authorization', `Bearer ${token}`);
  return agent;
}

// ─── Test state shared across describe blocks ─────────────────────────────────

let adminAuth, instructorAuth, studentAuth;
let testCourseId, testRoomId, testConversationId;
let roomMessageId, dmMessageId;
let testStudentUser, testInstructorUser;

const TS = Date.now(); // unique suffix per test run

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Login as super admin (always exists)
  adminAuth = await login('admin@tekypro.com');

  // Create a test instructor user
  const instrReg = await request(app).post('/api/auth/register').send({
    full_name: 'Test Instructor',
    email: `test_instructor_${TS}@test.com`,
    password: 'TestPass123!',
    role: 'student', // register as student first
  });
  instructorAuth = { token: instrReg.body?.data?.accessToken, cookies: instrReg.headers['set-cookie'] || [] };

  // Create a test student user
  const studReg = await request(app).post('/api/auth/register').send({
    full_name: 'Test Student',
    email: `test_student_${TS}@test.com`,
    password: 'TestPass123!',
    role: 'student',
  });
  studentAuth = { token: studReg.body?.data?.accessToken, cookies: studReg.headers['set-cookie'] || [] };

  // Find the student user record
  testStudentUser = await User.findOne({ where: { email: `test_student_${TS}@test.com` } });
  testInstructorUser = await User.findOne({ where: { email: `test_instructor_${TS}@test.com` } });

  // Find or create a published course
  let course = await Course.findOne({ where: { status: 'published' } });
  if (!course) {
    // Get admin user for instructor_id
    const adminUser = await User.findOne({ where: { email: 'admin@tekypro.com' } });
    const cat = await sequelize.query("SELECT id FROM categories LIMIT 1", { type: sequelize.QueryTypes.SELECT });
    course = await Course.create({
      title: `Test Course ${TS}`,
      slug: `test-course-${TS}`,
      description: 'Auto-created for messaging tests',
      instructor_id: adminUser.id,
      category_id: cat[0]?.id || null,
      level: 'beginner',
      price: 0,
      currency: 'USD',
      status: 'published',
      published_at: new Date(),
    });
  }
  testCourseId = course.id;

  // Ensure a chat room exists for that course
  const [room] = await ChatRoom.findOrCreate({
    where: { course_id: testCourseId },
    defaults: { course_id: testCourseId, is_active: true },
  });
  testRoomId = room.id;

  // Approve the student as a member of the room so room-message tests work
  if (testStudentUser) {
    await ChatRoomMember.upsert({
      room_id: testRoomId,
      user_id: testStudentUser.id,
      role: 'student',
      status: 'approved',
      joined_at: new Date(),
    });
  }
});

afterAll(async () => {
  // Clean up chat room member + messages created during the suite
  if (testRoomId) {
    await Message.destroy({ where: { room_id: testRoomId }, force: true }).catch(() => {});
    await ChatRoomMember.destroy({ where: { room_id: testRoomId } }).catch(() => {});
  }
  if (testConversationId) {
    await Message.destroy({ where: { conversation_id: testConversationId }, force: true }).catch(() => {});
    await Conversation.destroy({ where: { id: testConversationId }, force: true }).catch(() => {});
  }
  // Remove test users
  if (testStudentUser) await User.destroy({ where: { id: testStudentUser.id }, force: true }).catch(() => {});
  if (testInstructorUser) await User.destroy({ where: { id: testInstructorUser.id }, force: true }).catch(() => {});
  await sequelize.close();
});

// ============================================================================
// 1. COURSE CHAT ROOMS
// ============================================================================

describe('Course Chat Rooms', () => {

  // ── GET room by course ────────────────────────────────────────────────────

  describe('GET /api/chat/rooms/course/:courseId', () => {
    it('should return the chat room for an approved student', async () => {
      const res = await authed(
        request(app).get(`/api/chat/rooms/course/${testCourseId}`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.room).toMatchObject({
        course_id: testCourseId,
        is_active: true,
      });
    });

    it('should return 404 for a course with no chat room', async () => {
      const res = await authed(
        request(app).get('/api/chat/rooms/course/999999'),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get(`/api/chat/rooms/course/${testCourseId}`)
        .expect(401);
    });
  });

  // ── GET room members ──────────────────────────────────────────────────────

  describe('GET /api/chat/rooms/:roomId/members', () => {
    it('should return approved members list', async () => {
      const res = await authed(
        request(app).get(`/api/chat/rooms/${testRoomId}/members`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.members)).toBe(true);
      // Each member should have user fields
      if (res.body.data.members.length > 0) {
        expect(res.body.data.members[0]).toHaveProperty('id');
        expect(res.body.data.members[0]).toHaveProperty('full_name');
      }
    });

    it('should return 404 for unknown room', async () => {
      const res = await authed(
        request(app).get('/api/chat/rooms/999999/members'),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ── GET room messages ─────────────────────────────────────────────────────

  describe('GET /api/chat/rooms/:roomId/messages', () => {
    it('should return messages (possibly empty) for an approved student', async () => {
      const res = await authed(
        request(app).get(`/api/chat/rooms/${testRoomId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
    });

    it('should respect limit query param', async () => {
      const res = await authed(
        request(app).get(`/api/chat/rooms/${testRoomId}/messages?limit=5`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(200);

      expect(res.body.data.messages.length).toBeLessThanOrEqual(5);
    });

    it('should return 403 for a user not in the room', async () => {
      // Create a temp user with no membership
      const tempEmail = `tempuser_${Date.now()}@example.com`;
      await request(app).post('/api/auth/register').send({
        full_name: 'Temp No-Member',
        email: tempEmail,
        password: 'TempPass123!',
        role: 'student',
      });
      const tempAuth = await login(tempEmail, 'TempPass123!');

      const res = await authed(
        request(app).get(`/api/chat/rooms/${testRoomId}/messages`),
        tempAuth.cookies,
        tempAuth.token,
      ).expect(403);

      expect(res.body.success).toBe(false);

      // Clean up temp user
      await User.destroy({ where: { email: tempEmail }, force: true }).catch(() => {});
    });
  });

  // ── POST send room message ────────────────────────────────────────────────

  describe('POST /api/chat/rooms/:roomId/messages', () => {
    it('should send a plain text message', async () => {
      const res = await authed(
        request(app).post(`/api/chat/rooms/${testRoomId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ body: 'Hello from integration test!' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatchObject({ body: 'Hello from integration test!' });
      expect(res.body.data.message.sender).toHaveProperty('id');

      // Save for later tests (reply, reaction, pin, delete)
      roomMessageId = res.body.data.message.id;
    });

    it('should reject an empty message with no attachment', async () => {
      const res = await authed(
        request(app).post(`/api/chat/rooms/${testRoomId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ body: '   ' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should send a reply-to message', async () => {
      if (!roomMessageId) return; // skip if parent message wasn't created

      const res = await authed(
        request(app).post(`/api/chat/rooms/${testRoomId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ body: 'This is a reply!', reply_to_id: roomMessageId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message.reply_to_id).toBe(roomMessageId);

      // Clean up reply
      await Message.destroy({ where: { id: res.body.data.message.id }, force: true }).catch(() => {});
    });

    it('should reject reply_to_id from a different room', async () => {
      const res = await authed(
        request(app).post(`/api/chat/rooms/${testRoomId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ body: 'Sneaky reply', reply_to_id: 999999 })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── PATCH pin/unpin message ────────────────────────────────────────────────

  describe('PATCH /api/chat/messages/:messageId/pin', () => {
    it('admin can pin a room message', async () => {
      if (!roomMessageId) return;

      const res = await authed(
        request(app).patch(`/api/chat/messages/${roomMessageId}/pin`),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message.is_pinned).toBe(true);
    });

    it('admin can unpin a pinned message (toggle)', async () => {
      if (!roomMessageId) return;

      const res = await authed(
        request(app).patch(`/api/chat/messages/${roomMessageId}/pin`),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message.is_pinned).toBe(false);
    });

    it('student cannot pin a message', async () => {
      if (!roomMessageId) return;

      const res = await authed(
        request(app).patch(`/api/chat/messages/${roomMessageId}/pin`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ── DELETE message (admin moderation) ────────────────────────────────────

  describe('DELETE /api/chat/messages/:messageId', () => {
    it('admin can soft-delete any message', async () => {
      if (!roomMessageId) return;

      const res = await authed(
        request(app).delete(`/api/chat/messages/${roomMessageId}`),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);

      // Verify deleted_at was set
      const msg = await Message.findByPk(roomMessageId);
      expect(msg.deleted_at).not.toBeNull();

      // Restore for reaction test below
      await msg.update({ deleted_at: null });
    });

    it('student cannot delete a message', async () => {
      if (!roomMessageId) return;

      const res = await authed(
        request(app).delete(`/api/chat/messages/${roomMessageId}`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(403);

      expect(res.body.success).toBe(false);
    });
  });
});

// ============================================================================
// 2. REACTIONS
// ============================================================================

describe('Message Reactions', () => {

  describe('POST /api/chat/messages/:messageId/reactions', () => {
    it('should add a reaction to a room message', async () => {
      if (!roomMessageId) return;

      const res = await authed(
        request(app).post(`/api/chat/messages/${roomMessageId}/reactions`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ emoji: '👍' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe('added');
      expect(Array.isArray(res.body.data.reactions)).toBe(true);
    });

    it('should remove the same reaction (toggle off)', async () => {
      if (!roomMessageId) return;

      const res = await authed(
        request(app).post(`/api/chat/messages/${roomMessageId}/reactions`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ emoji: '👍' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.action).toBe('removed');
    });

    it('should return 400 when emoji is missing', async () => {
      if (!roomMessageId) return;

      const res = await authed(
        request(app).post(`/api/chat/messages/${roomMessageId}/reactions`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for a non-existent message', async () => {
      const res = await authed(
        request(app).post('/api/chat/messages/999999/reactions'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ emoji: '🔥' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });
});

// ============================================================================
// 3. MUTE / UNMUTE
// ============================================================================

describe('Mute / Unmute', () => {

  describe('POST /api/chat/mute', () => {
    it('should mute a room', async () => {
      const res = await authed(
        request(app).post('/api/chat/mute'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ roomId: testRoomId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.muted).toBe(true);
    });

    it('should unmute a room (toggle)', async () => {
      const res = await authed(
        request(app).post('/api/chat/mute'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ roomId: testRoomId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.muted).toBe(false);
    });

    it('should return 400 without roomId or conversationId', async () => {
      const res = await authed(
        request(app).post('/api/chat/mute'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/chat/mute', () => {
    it('should return mute status for a room', async () => {
      const res = await authed(
        request(app).get(`/api/chat/mute?roomId=${testRoomId}`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('muted');
      expect(typeof res.body.data.muted).toBe('boolean');
    });
  });
});

// ============================================================================
// 4. DIRECT MESSAGES
// ============================================================================

describe('Direct Messages', () => {
  let studentUserId, adminUserId;

  beforeAll(async () => {
    const adminUser = await User.findOne({ where: { email: 'admin@tekypro.com' } });
    studentUserId = testStudentUser?.id;
    adminUserId   = adminUser?.id;
  });

  // ── Get or create conversation ────────────────────────────────────────────

  describe('POST /api/chat/conversations', () => {
    it('should create a conversation between student and admin', async () => {
      const res = await authed(
        request(app).post('/api/chat/conversations'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ recipientId: adminUserId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.conversation).toHaveProperty('id');

      testConversationId = res.body.data.conversation.id;
    });

    it('should return the same conversation on second call (idempotent)', async () => {
      const res = await authed(
        request(app).post('/api/chat/conversations'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ recipientId: adminUserId })
        .expect(200);

      expect(res.body.data.conversation.id).toBe(testConversationId);
    });

    it('should reject messaging yourself', async () => {
      const res = await authed(
        request(app).post('/api/chat/conversations'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ recipientId: studentUserId })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 when recipientId is missing', async () => {
      const res = await authed(
        request(app).post('/api/chat/conversations'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent recipient', async () => {
      const res = await authed(
        request(app).post('/api/chat/conversations'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ recipientId: 999999 })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ── List conversations ────────────────────────────────────────────────────

  describe('GET /api/chat/conversations', () => {
    it('should list all conversations for the authenticated user', async () => {
      const res = await authed(
        request(app).get('/api/chat/conversations'),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.conversations)).toBe(true);

      if (res.body.data.conversations.length > 0) {
        const conv = res.body.data.conversations[0];
        expect(conv).toHaveProperty('unread_count');
        expect(conv).toHaveProperty('participant_a');
        expect(conv).toHaveProperty('participant_b');
      }
    });
  });

  // ── Send direct message ───────────────────────────────────────────────────

  describe('POST /api/chat/conversations/:conversationId/messages', () => {
    it('should send a DM in the conversation', async () => {
      if (!testConversationId) return;

      const res = await authed(
        request(app).post(`/api/chat/conversations/${testConversationId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ body: 'Hey admin, this is a test DM!' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatchObject({ body: 'Hey admin, this is a test DM!' });
      expect(res.body.data.message.sender).toHaveProperty('id');

      dmMessageId = res.body.data.message.id;
    });

    it('should reject empty DM body', async () => {
      if (!testConversationId) return;

      const res = await authed(
        request(app).post(`/api/chat/conversations/${testConversationId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ body: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should send a DM reply-to', async () => {
      if (!testConversationId || !dmMessageId) return;

      const res = await authed(
        request(app).post(`/api/chat/conversations/${testConversationId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ body: 'Replying to my own DM for testing', reply_to_id: dmMessageId })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message.reply_to_id).toBe(dmMessageId);

      await Message.destroy({ where: { id: res.body.data.message.id }, force: true }).catch(() => {});
    });

    it('should block non-participant from sending a DM', async () => {
      if (!testConversationId) return;

      // Use the instructor test account (not part of this conversation)
      const res = await authed(
        request(app).post(`/api/chat/conversations/${testConversationId}/messages`),
        instructorAuth.cookies,
        instructorAuth.token,
      )
        .send({ body: 'Sneaky DM from outsider' })
        .expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent conversation', async () => {
      const res = await authed(
        request(app).post('/api/chat/conversations/999999/messages'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ body: 'Ghost DM' })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // ── Get DM messages ───────────────────────────────────────────────────────

  describe('GET /api/chat/conversations/:conversationId/messages', () => {
    it('should return messages in a conversation', async () => {
      if (!testConversationId) return;

      const res = await authed(
        request(app).get(`/api/chat/conversations/${testConversationId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
      expect(res.body.data.messages.length).toBeGreaterThan(0);
    });

    it('should block non-participant from reading DMs', async () => {
      if (!testConversationId) return;

      // instructorAuth is not part of the student<->admin conversation
      const res = await authed(
        request(app).get(`/api/chat/conversations/${testConversationId}/messages`),
        instructorAuth.cookies,
        instructorAuth.token,
      ).expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ── Mark conversation as read ─────────────────────────────────────────────

  describe('PATCH /api/chat/conversations/:conversationId/read', () => {
    it('admin can mark the conversation as read', async () => {
      if (!testConversationId) return;

      const res = await authed(
        request(app).patch(`/api/chat/conversations/${testConversationId}/read`),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);

      // Verify is_read was updated in DB
      const unread = await Message.count({
        where: {
          conversation_id: testConversationId,
          is_read: false,
        },
      });
      expect(unread).toBe(0);
    });

    it('should block non-participant from marking read', async () => {
      if (!testConversationId) return;

      const res = await authed(
        request(app).patch(`/api/chat/conversations/${testConversationId}/read`),
        instructorAuth.cookies,
        instructorAuth.token,
      ).expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  // ── Mute a conversation ───────────────────────────────────────────────────

  describe('Mute a DM conversation', () => {
    it('should mute a conversation', async () => {
      if (!testConversationId) return;

      const res = await authed(
        request(app).post('/api/chat/mute'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ conversationId: testConversationId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.muted).toBe(true);
    });

    it('should unmute a conversation', async () => {
      if (!testConversationId) return;

      const res = await authed(
        request(app).post('/api/chat/mute'),
        studentAuth.cookies,
        studentAuth.token,
      )
        .send({ conversationId: testConversationId })
        .expect(200);

      expect(res.body.data.muted).toBe(false);
    });

    it('GET mute status should work for conversations', async () => {
      if (!testConversationId) return;

      const res = await authed(
        request(app).get(`/api/chat/mute?conversationId=${testConversationId}`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.muted).toBe('boolean');
    });
  });
});

// ============================================================================
// 5. ADMIN MODERATION
// ============================================================================

describe('Admin Moderation', () => {

  describe('GET /api/chat/admin/rooms', () => {
    it('admin can list all chat rooms', async () => {
      const res = await authed(
        request(app).get('/api/chat/admin/rooms'),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.rooms)).toBe(true);

      if (res.body.data.rooms.length > 0) {
        const room = res.body.data.rooms[0];
        expect(room).toHaveProperty('member_count');
        expect(room).toHaveProperty('message_count');
      }
    });

    it('student cannot access admin rooms list', async () => {
      const res = await authed(
        request(app).get('/api/chat/admin/rooms'),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(403);

      expect(res.body.success).toBe(false);
    });

    it('should respect pagination params', async () => {
      const res = await authed(
        request(app).get('/api/chat/admin/rooms?page=1&limit=3'),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(200);

      expect(res.body.data.rooms.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /api/chat/admin/rooms/:roomId/messages', () => {
    it('admin can read all messages in a room (including deleted)', async () => {
      const res = await authed(
        request(app).get(`/api/chat/admin/rooms/${testRoomId}/messages`),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
    });

    it('student cannot access admin room messages endpoint', async () => {
      const res = await authed(
        request(app).get(`/api/chat/admin/rooms/${testRoomId}/messages`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(403);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/chat/rooms/:roomId/toggle', () => {
    it('admin can disable and re-enable a chat room', async () => {
      // Disable
      const disableRes = await authed(
        request(app).patch(`/api/chat/rooms/${testRoomId}/toggle`),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(200);

      expect(disableRes.body.success).toBe(true);

      // Re-enable so other tests aren't blocked
      await authed(
        request(app).patch(`/api/chat/rooms/${testRoomId}/toggle`),
        adminAuth.cookies,
        adminAuth.token,
      ).expect(200);

      // Confirm room is back active in DB
      const room = await ChatRoom.findByPk(testRoomId);
      expect(room.is_active).toBe(true);
    });

    it('student cannot toggle a room', async () => {
      const res = await authed(
        request(app).patch(`/api/chat/rooms/${testRoomId}/toggle`),
        studentAuth.cookies,
        studentAuth.token,
      ).expect(403);

      expect(res.body.success).toBe(false);
    });
  });
});
