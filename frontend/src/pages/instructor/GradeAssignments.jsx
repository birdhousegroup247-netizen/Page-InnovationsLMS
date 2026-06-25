import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { assignmentsAPI } from '../../lib/api';
import {
  ClipboardCheck, CheckCircle, Clock, User, FileText, ArrowLeft,
  Edit3, Eye, EyeOff, Trash2, Calendar, BookOpen, UserX,
} from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Spinner, Alert, Badge, Modal } from '../../components/ui';
import { cn } from '../../utils/cn';

const STATUS_BADGE = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  graded: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
};

export default function GradeAssignments() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [grading, setGrading] = useState({});
  const [scores, setScores] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [assignmentId]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await assignmentsAPI.getSubmissions(assignmentId);
      setData(res.data.data);
      // Pre-fill existing grades
      const s = {};
      const f = {};
      (res.data.data.submissions || []).forEach((sub) => {
        s[sub.id] = sub.score ?? '';
        f[sub.id] = sub.feedback ?? '';
      });
      setScores(s);
      setFeedbacks(f);
    } catch (err) {
      setError('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (submissionId) => {
    const score = scores[submissionId];
    if (score === '' || score === undefined) return;
    setGrading((prev) => ({ ...prev, [submissionId]: true }));
    setError('');
    try {
      await assignmentsAPI.gradeSubmission(submissionId, {
        score: parseFloat(score),
        feedback: feedbacks[submissionId] || '',
      });
      setSuccess('Graded successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchSubmissions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to grade submission');
    } finally {
      setGrading((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  const filtered = (data?.submissions || []).filter((s) => {
    if (filter === 'pending') return s.status !== 'graded';
    if (filter === 'graded') return s.status === 'graded';
    return true;
  });

  const a = data?.assignment || null;
  const isDraft = a && a.is_published === false;

  const fmtDue = (d) =>
    d ? new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

  // Toggle publish / draft — uses the same updateAssignment endpoint
  // we already wired. On draft → published the backend fires the
  // new-assignment notification to enrolled students.
  const handleTogglePublish = async () => {
    if (!a || acting) return;
    setActing(true);
    setError('');
    try {
      await assignmentsAPI.updateAssignment(a.id, { is_published: !a.is_published });
      setSuccess(a.is_published ? 'Assignment moved to draft' : 'Published — students notified');
      setTimeout(() => setSuccess(''), 3000);
      fetchSubmissions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update assignment');
    } finally {
      setActing(false);
    }
  };

  const handleDelete = async () => {
    if (!a || acting) return;
    setActing(true);
    try {
      await assignmentsAPI.deleteAssignment(a.id);
      navigate('/instructor/assignments');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
      setActing(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red py-10">
        <Container>
          <Link to="/instructor/assignments" className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Assignments
          </Link>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <ClipboardCheck className="w-8 h-8 text-white shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                    {a?.title || 'Assignment'}
                  </h1>
                  {isDraft && <Badge variant="secondary">Draft</Badge>}
                  {a?.allow_resubmit && <Badge variant="info">Resubmit allowed</Badge>}
                  {a?.linked_test_id && <Badge variant="info">Linked test (auto-graded)</Badge>}
                </div>
                {a?.description && (
                  <p className="text-white/85 text-sm mt-1 max-w-2xl">{a.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-white/80">
                  {a?.course?.title && (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" /> {a.course.title}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Due {fmtDue(a?.due_date)}
                  </span>
                  <span>Max score: {a?.max_score || 100}</span>
                  {typeof data?.enrolled_count === 'number' && (
                    <span>{data.enrolled_count} enrolled</span>
                  )}
                </div>
              </div>
            </div>
            {a && (
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="text-white border-white/30 hover:bg-white/10">
                  <Edit3 className="w-4 h-4 mr-1.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTogglePublish}
                  loading={acting}
                  className="text-white border-white/30 hover:bg-white/10"
                >
                  {isDraft
                    ? <><Eye className="w-4 h-4 mr-1.5" /> Publish</>
                    : <><EyeOff className="w-4 h-4 mr-1.5" /> Unpublish</>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-white border-red-300/50 hover:bg-red-500/20"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </Container>
      </div>

      <Container className="py-6 space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {['all', 'pending', 'graded'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-600'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'all' && ` (${data?.submissions?.length || 0})`}
              {f === 'pending' && ` (${(data?.submissions || []).filter(s => s.status !== 'graded').length})`}
              {f === 'graded' && ` (${(data?.submissions || []).filter(s => s.status === 'graded').length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-dark-800 rounded-xl shadow-sm transition-colors">
            <ClipboardCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-text-dark-muted">No submissions to show</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((submission) => (
              <div key={submission.id} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-5 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-text-dark-primary text-sm">{submission.student?.full_name || 'Student'}</p>
                      <p className="text-xs text-gray-400 dark:text-text-dark-muted">
                        Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[submission.status] || STATUS_BADGE.pending}`}>
                    {submission.status === 'graded' ? `Graded: ${submission.score}` : 'Pending'}
                  </span>
                </div>

                {/* Submission Content */}
                {(submission.text_content || submission.text_response) && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 dark:text-text-dark-muted mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Text Response
                    </p>
                    <p className="text-sm text-gray-700 dark:text-text-dark-secondary whitespace-pre-wrap">{submission.text_content || submission.text_response}</p>
                  </div>
                )}
                {submission.file_url && (
                  <div className="mb-4">
                    <a href={submission.file_url} target="_blank" rel="noreferrer"
                      className="text-sm text-brand-blue hover:underline flex items-center gap-1">
                      <FileText className="w-4 h-4" /> View Submitted File
                    </a>
                  </div>
                )}
                {submission.link_url && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 dark:text-text-dark-muted mb-1">Submitted Link</p>
                    <a href={submission.link_url} target="_blank" rel="noreferrer"
                      className="text-sm text-brand-blue hover:underline break-all">
                      {submission.link_url}
                    </a>
                  </div>
                )}

                {/* Auto-graded: lock the form and tell the grader why. */}
                {submission.auto_graded ? (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-border-dark p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      Auto-graded from linked test — {submission.score} / {data?.assignment?.max_score || 100}
                    </p>
                    {submission.feedback && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{submission.feedback}</p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Grade Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-border-dark">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-text-dark-muted mb-1">
                          Score (out of {data?.assignment?.max_score || 100})
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={data?.assignment?.max_score || 100}
                          value={scores[submission.id] ?? ''}
                          onChange={(e) => setScores({ ...scores, [submission.id]: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                          placeholder="Score"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-text-dark-muted mb-1">Feedback</label>
                        <input
                          type="text"
                          value={feedbacks[submission.id] ?? ''}
                          onChange={(e) => setFeedbacks({ ...feedbacks, [submission.id]: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                          placeholder="Optional feedback"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end mt-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleGrade(submission.id)}
                        loading={grading[submission.id]}
                        disabled={grading[submission.id] || scores[submission.id] === ''}
                        leftIcon={<CheckCircle className="w-4 h-4" />}
                      >
                        {submission.status === 'graded' ? 'Update Grade' : 'Submit Grade'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Missing students — enrolled in the course but no submission */}
        {data?.missing_students && data.missing_students.length > 0 && (
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <UserX className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Hasn't submitted ({data.missing_students.length})
              </h3>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {data.missing_students.map((s) => (
                <li key={s.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-dark-700">
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-dark-600 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-200 shrink-0">
                    {(s.full_name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{s.full_name || 'Student'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Container>

      {/* Edit modal — reuses backend updateAssignment. We hand the
          existing assignment in as `initial`. */}
      {editOpen && a && (
        <EditAssignmentModal
          assignment={a}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            setSuccess('Assignment updated');
            setTimeout(() => setSuccess(''), 2000);
            fetchSubmissions();
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      {/* Delete confirmation */}
      <Modal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this assignment?"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This permanently removes the assignment and every submission. This can't be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={acting}>Cancel</Button>
            <Button onClick={handleDelete} loading={acting} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// Inline edit modal — minimal subset of the create form, just the
// fields a grader is likely to need to change after the fact.
function EditAssignmentModal({ assignment, onClose, onSaved, onError }) {
  const [form, setForm] = useState({
    title: assignment.title || '',
    description: assignment.description || '',
    due_date: assignment.due_date ? new Date(assignment.due_date).toISOString().slice(0, 16) : '',
    max_score: assignment.max_score ?? 100,
    allow_file_upload: !!assignment.allow_file_upload,
    allow_text_submission: !!assignment.allow_text_submission,
    allow_link_submission: !!assignment.allow_link_submission,
    allow_resubmit: !!assignment.allow_resubmit,
  });
  const [saving, setSaving] = useState(false);
  const isLinkedTest = !!assignment.linked_test_id;

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await assignmentsAPI.updateAssignment(assignment.id, form);
      onSaved();
    } catch (err) {
      onError(err.response?.data?.message || 'Failed to update assignment');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Edit assignment" size="lg">
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Title *</label>
          <input name="title" value={form.title} onChange={handle} required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handle} rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Due date</label>
            <input name="due_date" type="datetime-local" value={form.due_date} onChange={handle}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Max score</label>
            <input name="max_score" type="number" min={1} value={form.max_score} onChange={handle}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
          </div>
        </div>
        {!isLinkedTest && (
          <div>
            <p className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">Accept submissions as</p>
            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-text-dark-secondary">
                <input type="checkbox" name="allow_file_upload" checked={form.allow_file_upload} onChange={handle} /> File
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-text-dark-secondary">
                <input type="checkbox" name="allow_text_submission" checked={form.allow_text_submission} onChange={handle} /> Text
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-text-dark-secondary">
                <input type="checkbox" name="allow_link_submission" checked={form.allow_link_submission} onChange={handle} /> Link
              </label>
            </div>
          </div>
        )}
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-text-dark-secondary">
          <input type="checkbox" name="allow_resubmit" checked={form.allow_resubmit} onChange={handle} />
          Allow resubmission after grading
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
