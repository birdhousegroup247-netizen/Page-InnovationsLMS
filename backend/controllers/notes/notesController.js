const { LessonNote } = require('../../models');
const ApiResponse = require('../../utils/response');

class NotesController {
  // GET /api/notes/:contentId
  static async getNotes(req, res, next) {
    try {
      const { contentId } = req.params;
      const notes = await LessonNote.findAll({
        where: { user_id: req.user.id, content_id: contentId },
        order: [['timestamp_seconds', 'ASC']],
      });
      return ApiResponse.success(res, { notes });
    } catch (err) { next(err); }
  }

  // POST /api/notes/:contentId
  static async createNote(req, res, next) {
    try {
      const { contentId } = req.params;
      const { content, timestamp_seconds = 0 } = req.body;
      if (!content?.trim()) return ApiResponse.error(res, 'Note content is required', 400);
      const note = await LessonNote.create({
        user_id: req.user.id,
        content_id: contentId,
        content: content.trim(),
        timestamp_seconds,
      });
      return ApiResponse.success(res, { note }, 'Note saved', 201);
    } catch (err) { next(err); }
  }

  // PUT /api/notes/:noteId
  static async updateNote(req, res, next) {
    try {
      const note = await LessonNote.findOne({ where: { id: req.params.noteId, user_id: req.user.id } });
      if (!note) return ApiResponse.error(res, 'Note not found', 404);
      const { content, timestamp_seconds } = req.body;
      await note.update({ content: content ?? note.content, timestamp_seconds: timestamp_seconds ?? note.timestamp_seconds });
      return ApiResponse.success(res, { note });
    } catch (err) { next(err); }
  }

  // DELETE /api/notes/:noteId
  static async deleteNote(req, res, next) {
    try {
      const note = await LessonNote.findOne({ where: { id: req.params.noteId, user_id: req.user.id } });
      if (!note) return ApiResponse.error(res, 'Note not found', 404);
      await note.destroy();
      return ApiResponse.success(res, null, 'Note deleted');
    } catch (err) { next(err); }
  }

  // GET /api/notes - all notes for the current user across all lessons
  static async getAllMyNotes(req, res, next) {
    try {
      const { ModuleContent, CourseModule, Course } = require('../../models');
      const notes = await LessonNote.findAll({
        where: { user_id: req.user.id },
        order: [['created_at', 'DESC']],
        include: [{
          model: ModuleContent,
          as: 'lesson_content',
          attributes: ['id', 'title'],
          include: [{
            model: CourseModule,
            as: 'module',
            attributes: ['id', 'title'],
            include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
          }],
        }],
      });
      return ApiResponse.success(res, { notes });
    } catch (err) { next(err); }
  }
}

module.exports = NotesController;
