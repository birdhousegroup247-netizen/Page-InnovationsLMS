import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notesAPI, enrollmentsAPI, coursesAPI } from '../lib/api';
import { FileText, Pencil, Trash2, Check, X, BookOpen, Clock, Plus } from 'lucide-react';
import { Container, EmptyState } from '../components/layout';
import { Spinner, Alert, Button, Modal } from '../components/ui';
import { cn } from '../utils/cn';

function NoteCard({ note, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!text.trim() || text === note.content) { setEditing(false); return; }
    setSaving(true);
    try {
      await notesAPI.updateNote(note.id, { content: text });
      onUpdate(note.id, text);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await notesAPI.deleteNote(note.id);
      onDelete(note.id);
    } finally {
      setDeleting(false);
    }
  };

  const formatTimestamp = (secs) => {
    if (!secs) return null;
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const lessonTitle = note.lesson_content?.title;
  const moduleTitle = note.lesson_content?.module?.title;
  const courseId = note.lesson_content?.module?.course?.id;
  const courseTitle = note.lesson_content?.module?.course?.title;

  return (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-4 transition-colors">
      {/* Course/lesson breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3 flex-wrap">
        {courseTitle && (
          <>
            <BookOpen className="w-3 h-3 flex-shrink-0" />
            {courseId ? (
              <Link to={`/courses/${courseId}/learn`} className="hover:text-brand-blue transition-colors">
                {courseTitle}
              </Link>
            ) : (
              <span>{courseTitle}</span>
            )}
          </>
        )}
        {moduleTitle && <><span className="text-gray-300 dark:text-gray-600">/</span><span>{moduleTitle}</span></>}
        {lessonTitle && <><span className="text-gray-300 dark:text-gray-600">/</span><span className="font-medium text-gray-600 dark:text-gray-300">{lessonTitle}</span></>}
        {note.timestamp_seconds > 0 && (
          <span className="ml-auto flex items-center gap-1 text-brand-blue font-mono">
            <Clock className="w-3 h-3" /> {formatTimestamp(note.timestamp_seconds)}
          </span>
        )}
      </div>

      {/* Note content */}
      {editing ? (
        <div>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none transition-colors"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setText(note.content); setEditing(false); }}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 group">
          <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Edit note"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete note"
            >
              {deleting ? <Spinner size="sm" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        {/* Sequelize serializes timestamps as createdAt (JS attribute),
            not the created_at column name — reading only created_at
            rendered "Invalid Date" on every card. */}
        {(() => {
          const d = new Date(note.created_at || note.createdAt);
          return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        })()}
      </p>
    </div>
  );
}

// "New note" modal — pick an enrolled course, then a lesson in it, write
// the note. Same API the in-player notes panel uses; this just gives
// notes a home that doesn't require having a video open.
function NewNoteModal({ isOpen, onClose, onCreated }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [contentId, setContentId] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    enrollmentsAPI.getMyCourses()
      .then((r) => {
        const rows = r.data?.data?.enrollments || r.data?.data?.courses || [];
        const list = rows
          .map((e) => ({ id: e.course?.id ?? e.course_id ?? e.id, title: e.course?.title ?? e.title }))
          .filter((c) => c.id && c.title);
        setCourses(list);
      })
      .catch(() => setError('Could not load your courses'));
  }, [isOpen]);

  useEffect(() => {
    if (!courseId) { setLessons([]); setContentId(''); return; }
    setLessonsLoading(true);
    setContentId('');
    coursesAPI.getById(courseId)
      .then((r) => {
        const modules = r.data?.data?.course?.modules || [];
        const flat = modules.flatMap((m) =>
          (m.contents || []).map((c) => ({ id: c.id, title: c.title, moduleTitle: m.title }))
        );
        setLessons(flat);
      })
      .catch(() => setError('Could not load lessons for that course'))
      .finally(() => setLessonsLoading(false));
  }, [courseId]);

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    if (!contentId || !text.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await notesAPI.createNote(contentId, { content: text.trim() });
      setText('');
      setCourseId('');
      setContentId('');
      onCreated();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const selectClass = 'w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New note" size="md">
      <form onSubmit={handleCreate} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Course</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={selectClass} required>
            <option value="">Select a course…</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lesson</label>
          <select
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            className={selectClass}
            disabled={!courseId || lessonsLoading}
            required
          >
            <option value="">{lessonsLoading ? 'Loading lessons…' : 'Select a lesson…'}</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>{l.moduleTitle} — {l.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Note</label>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write your note…"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none transition-colors"
            required
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving} disabled={!contentId || !text.trim()}>
            Save note
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function MyNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notesAPI.getAllMyNotes();
      setNotes(res.data.data.notes || []);
    } catch {
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (noteId, newContent) => {
    setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, content: newContent } : n));
  };

  const handleDelete = (noteId) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const filtered = search.trim()
    ? notes.filter((n) =>
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        n.lesson_content?.title?.toLowerCase().includes(search.toLowerCase()) ||
        n.lesson_content?.module?.course?.title?.toLowerCase().includes(search.toLowerCase())
      )
    : notes;

  // Group by course
  const grouped = filtered.reduce((acc, note) => {
    const key = note.lesson_content?.module?.course?.title || 'Unknown Course';
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">My Notes</h1>
                <p className="text-white/80 text-sm mt-0.5">
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'} across all your courses
                </p>
              </div>
              <button
                onClick={() => setShowNew(true)}
                className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New note</span>
              </button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {error && <Alert variant="danger" className="mb-6">{error}</Alert>}

        {/* Search */}
        {!loading && notes.length > 0 && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md px-4 py-2.5 rounded-xl border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">Loading your notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-16 h-16" />}
            title="No notes yet"
            description="Take notes while watching lessons, or create one right here"
            actionLabel="New note"
            onAction={() => setShowNew(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-16 h-16" />}
            title="No matching notes"
            description="Try a different search term"
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([courseName, courseNotes]) => (
              <div key={courseName}>
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white mb-3">
                  <BookOpen className="w-4 h-4 text-brand-blue" />
                  {courseName}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({courseNotes.length})</span>
                </h2>
                <div className="space-y-3">
                  {courseNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      <NewNoteModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onCreated={fetchNotes}
      />
    </>
  );
}
