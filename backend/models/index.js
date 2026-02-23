/**
 * Models Index
 * Central export point for all Sequelize models
 */

const { sequelize } = require('../config/database');
const User = require('./User');
const PasswordReset = require('./PasswordReset');
const InstructorApplication = require('./InstructorApplication');
const Category = require('./Category');
const Course = require('./Course');
const CourseModule = require('./CourseModule');
const ModuleContent = require('./ModuleContent');
const Enrollment = require('./Enrollment');
const ContentProgress = require('./ContentProgress');
const QuestionBank = require('./QuestionBank');
const KnowledgeArticle = require('./KnowledgeArticle');
const PracticeTestAttempt = require('./PracticeTestAttempt');
const PracticeTestQuestion = require('./PracticeTestQuestion');
const PracticeTestAnswer = require('./PracticeTestAnswer');
const AssignedTest = require('./AssignedTest');
const AssignedTestQuestion = require('./AssignedTestQuestion');
const TestAssignment = require('./TestAssignment');
const AssignedTestAttempt = require('./AssignedTestAttempt');
const AssignedTestAnswer = require('./AssignedTestAnswer');
const Certificate = require('./Certificate');
const CourseReview = require('./CourseReview');
const LessonBookmark = require('./LessonBookmark');
const ArticleBookmark = require('./ArticleBookmark');
const LessonQuestion = require('./LessonQuestion');
const QuestionReply = require('./QuestionReply');
const CourseAnnouncement = require('./CourseAnnouncement');
const Notification = require('./Notification');
const ActivityLog = require('./ActivityLog');
const Payment = require('./Payment');
const ChatRoom = require('./ChatRoom');
const ChatRoomMember = require('./ChatRoomMember');
const Conversation = require('./Conversation');
const Message = require('./Message');
const MessageReaction = require('./MessageReaction');
const MutedChat = require('./MutedChat');
const LessonNote = require('./LessonNote');
const Badge = require('./Badge');
const UserBadge = require('./UserBadge');
const Assignment = require('./Assignment');
const AssignmentSubmission = require('./AssignmentSubmission');

// ============================================================================
// RELATIONSHIPS
// ============================================================================

// User relationships
User.hasMany(PasswordReset, { foreignKey: 'user_id', as: 'password_resets' });
User.hasMany(InstructorApplication, { foreignKey: 'user_id', as: 'instructor_applications' });
User.hasMany(InstructorApplication, { foreignKey: 'reviewed_by', as: 'reviewed_applications' });
User.hasMany(Course, { foreignKey: 'instructor_id', as: 'courses' });
User.hasMany(Enrollment, { foreignKey: 'student_id', as: 'enrollments' });
User.hasMany(ContentProgress, { foreignKey: 'student_id', as: 'content_progress' });
User.hasMany(QuestionBank, { foreignKey: 'created_by', as: 'questions' });
User.hasMany(KnowledgeArticle, { foreignKey: 'author_id', as: 'articles' });

PasswordReset.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Instructor Application relationships
InstructorApplication.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
InstructorApplication.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// Category relationships
Category.hasMany(Category, { foreignKey: 'parent_category_id', as: 'subcategories' });
Category.belongsTo(Category, { foreignKey: 'parent_category_id', as: 'parent' });
Category.hasMany(Course, { foreignKey: 'category_id', as: 'courses' });
Category.hasMany(QuestionBank, { foreignKey: 'category_id', as: 'questions' });
Category.hasMany(KnowledgeArticle, { foreignKey: 'category_id', as: 'articles' });

// Course relationships
Course.belongsTo(Category, { foreignKey: 'category_id', as: 'category', onDelete: 'SET NULL' });
Course.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor', onDelete: 'SET NULL' });
Course.hasMany(CourseModule, { foreignKey: 'course_id', as: 'modules', onDelete: 'CASCADE' });
Course.hasMany(Enrollment, { foreignKey: 'course_id', as: 'enrollments', onDelete: 'CASCADE' });
Course.hasMany(QuestionBank, { foreignKey: 'course_id', as: 'questions', onDelete: 'CASCADE' });

// Module relationships
CourseModule.belongsTo(Course, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE' });
CourseModule.hasMany(ModuleContent, { foreignKey: 'module_id', as: 'contents', onDelete: 'CASCADE' });

// Content relationships
ModuleContent.belongsTo(CourseModule, { foreignKey: 'module_id', as: 'module', onDelete: 'CASCADE' });
ModuleContent.hasMany(ContentProgress, { foreignKey: 'content_id', as: 'progress', onDelete: 'CASCADE' });

// Enrollment relationships
Enrollment.belongsTo(User, { foreignKey: 'student_id', as: 'student', onDelete: 'CASCADE' });
Enrollment.belongsTo(Course, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE' });

// Content Progress relationships
ContentProgress.belongsTo(User, { foreignKey: 'student_id', as: 'student', onDelete: 'CASCADE' });
ContentProgress.belongsTo(ModuleContent, { foreignKey: 'content_id', as: 'content', onDelete: 'CASCADE' });

// Question Bank relationships
QuestionBank.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
QuestionBank.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
QuestionBank.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
QuestionBank.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// Knowledge Article relationships
KnowledgeArticle.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
KnowledgeArticle.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// Practice Test relationships
PracticeTestAttempt.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
PracticeTestAttempt.hasMany(PracticeTestQuestion, { foreignKey: 'attempt_id', as: 'test_questions' });
PracticeTestAttempt.hasMany(PracticeTestAnswer, { foreignKey: 'attempt_id', as: 'answers' });

PracticeTestQuestion.belongsTo(PracticeTestAttempt, { foreignKey: 'attempt_id', as: 'attempt' });
PracticeTestQuestion.belongsTo(QuestionBank, { foreignKey: 'question_id', as: 'question' });

PracticeTestAnswer.belongsTo(PracticeTestAttempt, { foreignKey: 'attempt_id', as: 'attempt' });
PracticeTestAnswer.belongsTo(QuestionBank, { foreignKey: 'question_id', as: 'question' });

// Assigned Test relationships
AssignedTest.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });
AssignedTest.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
AssignedTest.hasMany(AssignedTestQuestion, { foreignKey: 'test_id', as: 'test_questions' });
AssignedTest.hasMany(TestAssignment, { foreignKey: 'test_id', as: 'assignments' });

AssignedTestQuestion.belongsTo(AssignedTest, { foreignKey: 'test_id', as: 'test' });
AssignedTestQuestion.belongsTo(QuestionBank, { foreignKey: 'question_id', as: 'question' });

TestAssignment.belongsTo(AssignedTest, { foreignKey: 'test_id', as: 'test' });
TestAssignment.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
TestAssignment.hasMany(AssignedTestAttempt, { foreignKey: 'assignment_id', as: 'attempts' });

AssignedTestAttempt.belongsTo(TestAssignment, { foreignKey: 'assignment_id', as: 'assignment' });
AssignedTestAttempt.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
AssignedTestAttempt.belongsTo(AssignedTest, { foreignKey: 'test_id', as: 'test' });
AssignedTestAttempt.hasMany(AssignedTestAnswer, { foreignKey: 'attempt_id', as: 'answers' });

AssignedTestAnswer.belongsTo(AssignedTestAttempt, { foreignKey: 'attempt_id', as: 'attempt' });
AssignedTestAnswer.belongsTo(QuestionBank, { foreignKey: 'question_id', as: 'question' });

// Certificate relationships
Certificate.belongsTo(User, { foreignKey: 'student_id', as: 'student', onDelete: 'CASCADE' });
Certificate.belongsTo(Course, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE' });

User.hasMany(Certificate, { foreignKey: 'student_id', as: 'certificates', onDelete: 'CASCADE' });
Course.hasMany(Certificate, { foreignKey: 'course_id', as: 'certificates', onDelete: 'CASCADE' });

// Course Review relationships
CourseReview.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
CourseReview.belongsTo(User, { foreignKey: 'student_id', as: 'student' });

Course.hasMany(CourseReview, { foreignKey: 'course_id', as: 'reviews' });
User.hasMany(CourseReview, { foreignKey: 'student_id', as: 'reviews' });

// Lesson Bookmark relationships
LessonBookmark.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
LessonBookmark.belongsTo(ModuleContent, { foreignKey: 'content_id', as: 'content' });

User.hasMany(LessonBookmark, { foreignKey: 'student_id', as: 'lesson_bookmarks' });
ModuleContent.hasMany(LessonBookmark, { foreignKey: 'content_id', as: 'bookmarks' });

// Article Bookmark relationships
ArticleBookmark.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
ArticleBookmark.belongsTo(KnowledgeArticle, { foreignKey: 'article_id', as: 'article' });

User.hasMany(ArticleBookmark, { foreignKey: 'student_id', as: 'article_bookmarks' });
KnowledgeArticle.hasMany(ArticleBookmark, { foreignKey: 'article_id', as: 'bookmarks' });

// Lesson Question relationships
LessonQuestion.belongsTo(ModuleContent, { foreignKey: 'content_id', as: 'content' });
LessonQuestion.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
LessonQuestion.hasMany(QuestionReply, { foreignKey: 'question_id', as: 'replies' });

ModuleContent.hasMany(LessonQuestion, { foreignKey: 'content_id', as: 'questions' });
User.hasMany(LessonQuestion, { foreignKey: 'student_id', as: 'lesson_questions' });

// Question Reply relationships
QuestionReply.belongsTo(LessonQuestion, { foreignKey: 'question_id', as: 'question' });
QuestionReply.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(QuestionReply, { foreignKey: 'user_id', as: 'question_replies' });

// Course Announcement relationships
CourseAnnouncement.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
CourseAnnouncement.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

Course.hasMany(CourseAnnouncement, { foreignKey: 'course_id', as: 'announcements' });
User.hasMany(CourseAnnouncement, { foreignKey: 'instructor_id', as: 'announcements' });

// Notification relationships
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

// Activity Log relationships
ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(ActivityLog, { foreignKey: 'user_id', as: 'activity_logs' });

// Payment relationships
Payment.belongsTo(User, { foreignKey: 'student_id', as: 'student', onDelete: 'CASCADE' });
Payment.belongsTo(Course, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE' });
Payment.belongsTo(Enrollment, { foreignKey: 'enrollment_id', as: 'enrollment', onDelete: 'CASCADE' });

User.hasMany(Payment, { foreignKey: 'student_id', as: 'payments', onDelete: 'CASCADE' });
Course.hasMany(Payment, { foreignKey: 'course_id', as: 'payments', onDelete: 'CASCADE' });
Enrollment.hasOne(Payment, { foreignKey: 'enrollment_id', as: 'payment', onDelete: 'CASCADE' });

// Chat Room relationships
ChatRoom.belongsTo(Course, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE' });
ChatRoom.hasMany(ChatRoomMember, { foreignKey: 'room_id', as: 'members', onDelete: 'CASCADE' });
ChatRoom.hasMany(Message, { foreignKey: 'room_id', as: 'messages', onDelete: 'CASCADE' });

Course.hasOne(ChatRoom, { foreignKey: 'course_id', as: 'chat_room', onDelete: 'CASCADE' });

// Chat Room Member relationships
ChatRoomMember.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'room', onDelete: 'CASCADE' });
ChatRoomMember.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
ChatRoomMember.belongsTo(User, { foreignKey: 'approved_by', as: 'approver', onDelete: 'SET NULL' });

User.hasMany(ChatRoomMember, { foreignKey: 'user_id', as: 'chat_memberships', onDelete: 'CASCADE' });

// Conversation (DM) relationships
Conversation.belongsTo(User, { foreignKey: 'user_a', as: 'participant_a', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'user_b', as: 'participant_b', onDelete: 'CASCADE' });
Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages', onDelete: 'CASCADE' });

// Message relationships
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender', onDelete: 'CASCADE' });
Message.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'room', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation', onDelete: 'CASCADE' });
// Self-referencing: a message can be a reply to another message
Message.belongsTo(Message, { foreignKey: 'reply_to_id', as: 'reply_to', onDelete: 'SET NULL' });
Message.hasMany(Message, { foreignKey: 'reply_to_id', as: 'replies' });

// Message Reaction relationships
MessageReaction.belongsTo(Message, { foreignKey: 'message_id', as: 'message', onDelete: 'CASCADE' });
MessageReaction.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
Message.hasMany(MessageReaction, { foreignKey: 'message_id', as: 'reactions', onDelete: 'CASCADE' });
User.hasMany(MessageReaction, { foreignKey: 'user_id', as: 'message_reactions', onDelete: 'CASCADE' });

// MutedChat relationships
MutedChat.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });
MutedChat.belongsTo(ChatRoom, { foreignKey: 'room_id', as: 'room', onDelete: 'CASCADE' });
MutedChat.belongsTo(Conversation, { foreignKey: 'conversation_id', as: 'conversation', onDelete: 'CASCADE' });
User.hasMany(MutedChat, { foreignKey: 'user_id', as: 'muted_chats', onDelete: 'CASCADE' });

// Lesson Note relationships
LessonNote.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
LessonNote.belongsTo(ModuleContent, { foreignKey: 'content_id', as: 'lesson_content' });
User.hasMany(LessonNote, { foreignKey: 'user_id', as: 'lesson_notes' });
ModuleContent.hasMany(LessonNote, { foreignKey: 'content_id', as: 'notes' });

// Badge relationships
Badge.hasMany(UserBadge, { foreignKey: 'badge_id', as: 'user_badges' });
UserBadge.belongsTo(Badge, { foreignKey: 'badge_id', as: 'badge' });
UserBadge.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(UserBadge, { foreignKey: 'user_id', as: 'user_badges' });

// Assignment relationships
Assignment.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Assignment.belongsTo(ModuleContent, { foreignKey: 'content_id', as: 'content' });
Assignment.belongsTo(User, { foreignKey: 'created_by', as: 'instructor' });
Assignment.hasMany(AssignmentSubmission, { foreignKey: 'assignment_id', as: 'submissions' });
Course.hasMany(Assignment, { foreignKey: 'course_id', as: 'assignments' });
ModuleContent.hasMany(Assignment, { foreignKey: 'content_id', as: 'assignments' });

AssignmentSubmission.belongsTo(Assignment, { foreignKey: 'assignment_id', as: 'assignment' });
AssignmentSubmission.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
User.hasMany(AssignmentSubmission, { foreignKey: 'student_id', as: 'submissions' });

module.exports = {
  sequelize,  // Export sequelize instance
  User,
  PasswordReset,
  InstructorApplication,
  Category,
  Course,
  CourseModule,
  ModuleContent,
  Enrollment,
  ContentProgress,
  QuestionBank,
  KnowledgeArticle,
  PracticeTestAttempt,
  PracticeTestQuestion,
  PracticeTestAnswer,
  AssignedTest,
  AssignedTestQuestion,
  TestAssignment,
  AssignedTestAttempt,
  AssignedTestAnswer,
  Certificate,
  CourseReview,
  LessonBookmark,
  ArticleBookmark,
  LessonQuestion,
  QuestionReply,
  CourseAnnouncement,
  Notification,
  ActivityLog,
  Payment,
  ChatRoom,
  ChatRoomMember,
  Conversation,
  Message,
  MessageReaction,
  MutedChat,
  LessonNote,
  Badge,
  UserBadge,
  Assignment,
  AssignmentSubmission,
};
