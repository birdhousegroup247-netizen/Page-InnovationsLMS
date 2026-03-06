import { useState, useEffect } from 'react';
import { notesAPI } from '../../lib/api';
import { StickyNote, Plus, Trash2, Edit2, Check, X, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

function formatTime(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function LessonNotes({ contentId, currentTime = 0, onSeek }) {
  const [notes, setNotes]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState({ content: '', timestamp_seconds: 0 });
  const [saving, setSaving]     = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState(null);

  useEffect(() => {
    if (!contentId) return;
    setLoading(true);
    notesAPI.getNotes(contentId)
      .then((r) => setNotes(r.data?.data?.notes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contentId]);

  const openAdd = () => {
    setForm({ content: '', timestamp_seconds: Math.floor(currentTime) });
    setAdding(true);
    setEditId(null);
  };

  const openEdit = (note) => {
    setForm({ content: note.content, timestamp_seconds: note.timestamp_seconds });
    setEditId(note.id);
    setAdding(false);
  };

  const cancel = () => { setAdding(false); setEditId(null); };

  const save = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        const r = await notesAPI.updateNote(editId, form);
        setNotes((prev) => prev.map((n) => n.id === editId ? r.data.data.note : n));
      } else {
        const r = await notesAPI.createNote(contentId, form);
        setNotes((prev) => [...prev, r.data.data.note].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
      }
      cancel();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = (noteId) => {
    setDeleteNoteId(noteId);
  };

  const confirmRemove = async () => {
    try {
      await notesAPI.deleteNote(deleteNoteId);
      setNotes((prev) => prev.filter((n) => n.id !== deleteNoteId));
      setDeleteNoteId(null);
    } catch {}
  };

  return (
    <>
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-brand-blue" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">My Notes</span>
          {notes.length > 0 && (
            <span className="text-xs bg-brand-blue/10 text-brand-blue px-1.5 py-0.5 rounded-full">{notes.length}</span>
          )}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-brand-blue text-white hover:bg-brand-blue/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Note
        </button>
      </div>

      {/* Add / Edit Form */}
      {(adding || editId) && (
        <div className="mx-3 mt-3 p-3 rounded-xl border border-brand-blue/30 bg-brand-blue/5 dark:bg-brand-blue/10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-brand-blue" />
            <span className="text-xs text-brand-blue font-medium">
              At {formatTime(form.timestamp_seconds) || '0:00'}
            </span>
            <button
              onClick={() => setForm((f) => ({ ...f, timestamp_seconds: Math.floor(currentTime) }))}
              className="ml-auto text-[11px] text-brand-blue hover:underline"
            >
              Use current time
            </button>
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Write your note..."
            rows={3}
            className="w-full text-sm bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-900 dark:text-white"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={cancel} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={save}
              disabled={saving || !form.content.trim()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {loading && (
          <p className="text-center text-sm text-gray-400 py-8">Loading notes...</p>
        )}
        {!loading && notes.length === 0 && !adding && (
          <div className="text-center py-10">
            <StickyNote className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No notes yet.</p>
            <p className="text-xs text-gray-400 mt-1">Click "Add Note" to capture a thought.</p>
          </div>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            className={cn(
              'group relative p-3 rounded-xl border bg-white dark:bg-dark-800',
              editId === note.id
                ? 'border-brand-blue/40'
                : 'border-gray-100 dark:border-dark-700 hover:border-gray-200 dark:hover:border-dark-600'
            )}
          >
            {/* Timestamp */}
            {note.timestamp_seconds > 0 && (
              <button
                onClick={() => onSeek?.(note.timestamp_seconds)}
                className="inline-flex items-center gap-1 text-[11px] text-brand-blue hover:underline mb-1.5"
              >
                <Clock className="w-3 h-3" />
                {formatTime(note.timestamp_seconds)}
              </button>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>

            {/* Actions */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openEdit(note)}
                className="p-1 rounded-lg text-gray-400 hover:text-brand-blue hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => remove(note.id)}
                className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>

    <Modal
      isOpen={!!deleteNoteId}
      onClose={() => setDeleteNoteId(null)}
      title="Delete Note"
      size="sm"
    >
      <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
        Are you sure you want to delete this note?
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setDeleteNoteId(null)}>Cancel</Button>
        <Button variant="danger" onClick={confirmRemove}>Delete Note</Button>
      </div>
    </Modal>
    </>
  );
}
