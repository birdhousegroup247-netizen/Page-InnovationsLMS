/**
 * Models Index
 * Central export point for all Sequelize models
 */

const { sequelize } = require('../config/database');
const User = require('./User');
const Lead = require('./Lead');
const CouponCode = require('./CouponCode');
const CouponCodeCourse = require('./CouponCodeCourse');
const CouponRedemption = require('./CouponRedemption');
const PasswordReset = require('./PasswordReset');
const EmailVerification = require('./EmailVerification');
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
const InstructorReview = require('./InstructorReview');
const LiveSession = require('./LiveSession');
const ForumPost = require('./ForumPost');
const ForumReply = require('./ForumReply');
const Wishlist = require('./Wishlist');
const Bundle = require('./Bundle');
const BundleCourse = require('./BundleCourse');
const Referral = require('./Referral');
const AdminAnnouncement = require('./AdminAnnouncement');

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

User.hasMany(EmailVerification, { foreignKey: 'user_id', as: 'email_verifications' });
EmailVerification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

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
Payment.belongsTo(CouponCode, { foreignKey: 'coupon_code_id', as: 'coupon', onDelete: 'SET NULL' });

User.hasMany(Payment, { foreignKey: 'student_id', as: 'payments', onDelete: 'CASCADE' });
Course.hasMany(Payment, { foreignKey: 'course_id', as: 'payments', onDelete: 'CASCADE' });
Enrollment.hasOne(Payment, { foreignKey: 'enrollment_id', as: 'payment', onDelete: 'CASCADE' });

// Lead relationships
Lead.belongsTo(Course, { foreignKey: 'course_interest_id', as: 'course_interest', onDelete: 'SET NULL' });
Course.hasMany(Lead, { foreignKey: 'course_interest_id', as: 'leads' });
User.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Lead.hasOne(User, { foreignKey: 'lead_id', as: 'user' });

// CouponCode relationships
CouponCode.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(CouponCode, { foreignKey: 'created_by', as: 'created_coupons' });
CouponCode.hasMany(CouponCodeCourse, { foreignKey: 'coupon_code_id', as: 'applicable_courses', onDelete: 'CASCADE' });
CouponCode.hasMany(CouponRedemption, { foreignKey: 'coupon_code_id', as: 'redemptions', onDelete: 'CASCADE' });
CouponCode.hasMany(Payment, { foreignKey: 'coupon_code_id', as: 'payments' });

// CouponCodeCourse relationships
CouponCodeCourse.belongsTo(CouponCode, { foreignKey: 'coupon_code_id', as: 'coupon' });
CouponCodeCourse.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
Course.hasMany(CouponCodeCourse, { foreignKey: 'course_id', as: 'coupon_courses' });

// CouponRedemption relationships
CouponRedemption.belongsTo(CouponCode, { foreignKey: 'coupon_code_id', as: 'coupon' });
CouponRedemption.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
CouponRedemption.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });
User.hasMany(CouponRedemption, { foreignKey: 'user_id', as: 'coupon_redemptions' });

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

// Forum relationships
Course.hasMany(ForumPost, { foreignKey: 'course_id', as: 'forum_posts', onDelete: 'CASCADE' });
ForumPost.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
ForumPost.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
ForumPost.hasMany(ForumReply, { foreignKey: 'post_id', as: 'replies', onDelete: 'CASCADE' });
ForumReply.belongsTo(ForumPost, { foreignKey: 'post_id', as: 'post' });
ForumReply.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
User.hasMany(ForumPost, { foreignKey: 'author_id', as: 'forum_posts' });
User.hasMany(ForumReply, { foreignKey: 'author_id', as: 'forum_replies' });

// Live Session relationships
Course.hasMany(LiveSession, { foreignKey: 'course_id', as: 'live_sessions', onDelete: 'CASCADE' });
LiveSession.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
User.hasMany(LiveSession, { foreignKey: 'instructor_id', as: 'live_sessions' });
LiveSession.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });

// Instructor Review relationships
User.hasMany(InstructorReview, { foreignKey: 'instructor_id', as: 'instructor_reviews' });
InstructorReview.belongsTo(User, { foreignKey: 'instructor_id', as: 'instructor' });
InstructorReview.belongsTo(User, { foreignKey: 'student_id', as: 'student' });
InstructorReview.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });
User.hasMany(InstructorReview, { foreignKey: 'student_id', as: 'given_reviews' });
Course.hasMany(InstructorReview, { foreignKey: 'course_id', as: 'instructor_reviews' });

// Referral relationships
Referral.belongsTo(User, { foreignKey: 'referrer_id', as: 'referrer' });
Referral.belongsTo(User, { foreignKey: 'referred_id', as: 'referred' });
User.hasMany(Referral, { foreignKey: 'referrer_id', as: 'referrals_made' });
User.hasOne(Referral, { foreignKey: 'referred_id', as: 'referral_source' });

// Bundle relationships
Bundle.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Bundle, { foreignKey: 'created_by', as: 'bundles' });
Bundle.belongsToMany(Course, { through: BundleCourse, foreignKey: 'bundle_id', otherKey: 'course_id', as: 'courses' });
Course.belongsToMany(Bundle, { through: BundleCourse, foreignKey: 'course_id', otherKey: 'bundle_id', as: 'bundles' });
BundleCourse.belongsTo(Bundle, { foreignKey: 'bundle_id', as: 'bundle' });
BundleCourse.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

// Wishlist relationships
Wishlist.belongsTo(User, { foreignKey: 'student_id', as: 'student', onDelete: 'CASCADE' });
Wishlist.belongsTo(Course, { foreignKey: 'course_id', as: 'course', onDelete: 'CASCADE' });
User.hasMany(Wishlist, { foreignKey: 'student_id', as: 'wishlist', onDelete: 'CASCADE' });
Course.hasMany(Wishlist, { foreignKey: 'course_id', as: 'wishlist_entries', onDelete: 'CASCADE' });

// Course prerequisite self-referencing relationships
Course.belongsTo(Course, { foreignKey: 'prerequisite_course_id', as: 'prerequisite' });
Course.hasMany(Course, { foreignKey: 'prerequisite_course_id', as: 'dependent_courses' });

// AdminAnnouncement relationships
AdminAnnouncement.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });
AdminAnnouncement.belongsTo(Course, { foreignKey: 'course_id', as: 'course', required: false });
User.hasMany(AdminAnnouncement, { foreignKey: 'admin_id', as: 'admin_announcements' });

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
  Lead,
  CouponCode,
  CouponCodeCourse,
  CouponRedemption,
  PasswordReset,
  EmailVerification,
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
  InstructorReview,
  LiveSession,
  ForumPost,
  ForumReply,
  Wishlist,
  Bundle,
  BundleCourse,
  Referral,
  AdminAnnouncement,
};
