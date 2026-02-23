const express = require('express');
const router = express.Router();
const NotesController = require('../../controllers/notes/notesController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// GET  /api/notes           — all notes for current user
router.get('/', authenticate, NotesController.getAllMyNotes);

// GET  /api/notes/:contentId
router.get('/:contentId', authenticate, NotesController.getNotes);

// POST /api/notes/:contentId
router.post('/:contentId', authenticate, NotesController.createNote);

// PUT  /api/notes/entry/:noteId
router.put('/entry/:noteId', authenticate, NotesController.updateNote);

// DELETE /api/notes/entry/:noteId
router.delete('/entry/:noteId', authenticate, NotesController.deleteNote);

module.exports = router;
