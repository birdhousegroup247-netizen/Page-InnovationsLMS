/**
 * Chat Routes
 * Course chat rooms, direct messages, pin, mute, admin moderation
 */

const express = require('express');
const router = express.Router();
const ChatController = require('../../controllers/chat/chatController');
const { authenticate } = require('../../middleware/auth/authMiddleware');
const { uploadMultiple, handleUploadErrors } = require('../../middleware/upload/uploadMiddleware');

// All chat routes require authentication
router.use(authenticate);

// Single-file attachment upload helper
const uploadAttachment = uploadMultiple.single('attachment');
const withAttachment = (handler) => (req, res, next) => {
  uploadAttachment(req, res, (err) => {
    if (err) return handleUploadErrors(err, req, res, next);
    handler(req, res, next);
  });
};

// ============================================================================
// ADMIN MODERATION
// ============================================================================
router.get('/admin/rooms', ChatController.adminGetAllRooms);
router.get('/admin/rooms/:roomId/messages', ChatController.adminGetRoomMessages);

// ============================================================================
// MUTE
// ============================================================================
router.post('/mute', ChatController.toggleMute);
router.get('/mute', ChatController.getMuteStatus);

// ============================================================================
// COURSE CHAT ROOMS
// ============================================================================
router.get('/rooms', ChatController.getMyRooms);
router.get('/users/search', ChatController.searchCoursemates);
router.get('/rooms/course/:courseId', ChatController.getRoomByCourse);
router.get('/rooms/:roomId/members', ChatController.getRoomMembers);
router.get('/rooms/:roomId/messages', ChatController.getRoomMessages);
router.post('/rooms/:roomId/messages', withAttachment(ChatController.sendRoomMessage));
router.get('/rooms/:roomId/requests', ChatController.getPendingRequests);
router.patch('/rooms/:roomId/requests/:userId', ChatController.handleJoinRequest);
router.delete('/rooms/:roomId/members/:userId', ChatController.removeMember);
router.patch('/rooms/:roomId/toggle', ChatController.toggleRoom);

// ============================================================================
// MESSAGES (shared — room + DM)
// ============================================================================
router.delete('/messages/:messageId', ChatController.deleteMessage);
router.post('/messages/:messageId/reactions', ChatController.toggleReaction);
router.patch('/messages/:messageId/pin', ChatController.pinMessage);

// ============================================================================
// DIRECT MESSAGES
// ============================================================================
router.get('/conversations', ChatController.getConversations);
router.post('/conversations', ChatController.getOrCreateConversation);
router.get('/conversations/:conversationId/messages', ChatController.getConversationMessages);
router.post('/conversations/:conversationId/messages', withAttachment(ChatController.sendDirectMessage));
router.patch('/conversations/:conversationId/read', ChatController.markConversationRead);

module.exports = router;
