import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assignmentsAPI } from '../lib/api';
import {
  ClipboardList, CheckCircle, Clock, AlertCircle, BookOpen,
  Send, ChevronDown, ChevronUp, Star, Link2, Play,
} from 'lucide-react';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, Alert } from '../components/ui';
import { cn } from '../utils/cn';
import CloudinaryUpload from '../components/common/CloudinaryUpload';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  submitted: { label: 'Submitted', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400', icon: <CheckCircle className="w-3 h-3" /> },
  late: { label: 'Late', color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400', icon: <AlertCircle className="w-3 h-3" /> },
  graded: { label: 'Graded', color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400', icon: <Star className="w-3 h-3" /> },
};

function getAssignmentStatus(assignment) {
  const sub = assignment.submissions?.[0];
  if (!sub) {
    if (assignment.due_date && new Date() > new Date(assignment.due_date)) return 'late';
    return 'pending';
  }
  return sub.status || 'submitted';
}

function isDueSoon(due_date) {
  if (!due_date) return false;
  const diff = new Date(due_date) - new Date();
  return diff > 0 && diff < 48 * 60 * 60 * 1000;
}

function AssignmentCard({ assignment, onSubmit }) {
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const status = getAssignmentStatus(assignment);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const sub = assignment.submissions?.[0];
  const canSubmit = status === 'pending' || status === 'late';
  const canUpdate = status === 'submitted';
  // Resubmission: graded + assignment allows it + not test-linked
  // (test scores can't be hand-overwritten).
  const canResubmit = status === 'graded' && assignment.allow_resubmit && !sub?.auto_graded;
  // A test-linked assignment doesn't take file/text/link — the
  // student "submits" by taking the linked test; the score lands
  // back in this assignment automatically via the backend hook.
  const isLinkedTest = !!assignment.linked_test_id;

  const handleSubmit = async () => {
    const hasText = textContent.trim();
    const hasFile = !!fileUrl;
    const hasLink = !!linkUrl.trim();
    if (!hasText && !hasFile && !hasLink) {
      setError('Please attach a file, paste a link, or write your answer.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {};
      if (hasText) payload.text_content = textContent;
      if (hasFile) { payload.file_url = fileUrl; payload.file_name = fileName; }
      if (hasLink) payload.link_url = linkUrl.trim();
      if (canSubmit) {
        await assignmentsAPI.submitAssignment(assignment.id, payload);
      } else if (canUpdate || canResubmit) {
        // updateSubmission is what powers both "edit before grade"
        // and "resubmit after grade" — the backend decides what's
        // allowed based on assignment.allow_resubmit + status.
        await assignmentsAPI.updateSubmission(assignment.id, payload);
      }
      setSuccess('Submitted successfully!');
      setExpanded(false);
      onSubmit();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
                {config.icon} {config.label}
              </span>
              {isDueSoon(assignment.due_date) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-3 h-3" /> Due soon
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base">{assignment.title}</h3>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <Link to={`/courses/${assignment.course?.id}`} className="hover:text-brand-blue transition-colors">
                  {assignment.course?.title || 'Unknown Course'}
                </Link>
              </span>
              {assignment.due_date && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Due: {formatDate(assignment.due_date)}
                </span>
              )}
              <span>Max score: {assignment.max_score}</span>
            </div>
          </div>
          {/* Grade display */}
          {status === 'graded' && sub?.score !== undefined && (
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{sub.score}</p>
              <p className="text-xs text-gray-500">/ {assignment.max_score}</p>
            </div>
          )}
        </div>

        {/* Grader feedback */}
        {status === 'graded' && sub?.feedback && (
          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg text-sm text-gray-700 dark:text-gray-300">
            <p className="font-medium text-green-700 dark:text-green-400 mb-1">Instructor Feedback</p>
            {sub.feedback}
          </div>
        )}

        {/* Already submitted preview */}
        {sub?.text_content && status !== 'graded' && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {sub.text_content}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          {/* Test-linked assignments use a "Take Test" CTA instead of
              the expand-and-submit flow. The student takes the test;
              the score lands here automatically (no form to fill). */}
          {isLinkedTest && (canSubmit || canUpdate) && (
            <Link
              to={`/tests/${assignment.linked_test_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue/90 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" /> Take Test
            </Link>
          )}
          {!isLinkedTest && (canSubmit || canUpdate || canResubmit) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-blue/80 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {canSubmit ? 'Submit Assignment' : canResubmit ? 'Resubmit' : 'Update Submission'}
            </button>
          )}
        </div>
      </div>

      {/* Submit form — only for non-test-linked assignments */}
      {!isLinkedTest && expanded && (canSubmit || canUpdate || canResubmit) && (
        <div className="border-t border-gray-200 dark:border-dark-700 p-5 bg-gray-50 dark:bg-dark-700/50">
          {assignment.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{assignment.description}</p>
          )}
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {success && <Alert variant="success" className="mb-3">{success}</Alert>}
          <div className="space-y-4">
            {assignment.allow_text_submission && (
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none transition-colors"
                rows={5}
                placeholder="Write your answer here..."
                value={textContent || sub?.text_content || ''}
                onChange={(e) => setTextContent(e.target.value)}
              />
            )}
            {assignment.allow_file_upload && (
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Attach a file</p>
                {sub?.file_url && !fileUrl && (
                  <p className="text-xs text-brand-blue mb-2">
                    Current file: <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="underline">{sub.file_name || 'Download'}</a>
                  </p>
                )}
                <CloudinaryUpload
                  acceptedTypes="any"
                  maxSizeMB={20}
                  uploadEndpoint="/api/upload/assignment"
                  onUploadSuccess={(url, name) => { setFileUrl(url); setFileName(name || url.split('/').pop()); }}
                  onUploadError={(msg) => setError(msg)}
                />
              </div>
            )}
            {assignment.allow_link_submission && (
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Paste a link</p>
                {sub?.link_url && !linkUrl && (
                  <p className="text-xs text-brand-blue mb-2 truncate">
                    Current link: <a href={sub.link_url} target="_blank" rel="noopener noreferrer" className="underline">{sub.link_url}</a>
                  </p>
                )}
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    placeholder="https://github.com/your-username/project"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>
            )}
            {!assignment.allow_text_submission && !assignment.allow_file_upload && !assignment.allow_link_submission && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No submission method enabled for this assignment.</p>
            )}
          </div>
          {(assignment.allow_text_submission || assignment.allow_file_upload || assignment.allow_link_submission) && (
            <div className="flex justify-end mt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                loading={submitting}
                leftIcon={!submitting && <Send className="w-4 h-4" />}
              >
                {canSubmit ? 'Submit' : canResubmit ? 'Resubmit' : 'Update'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  const fetchAssignments = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await assignmentsAPI.getAllStudentAssignments();
      setAssignments(res.data.data.assignments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssignments(); }, []);

  const filtered = filter === 'all'
    ? assignments
    : assignments.filter((a) => getAssignmentStatus(a) === filter);

  const counts = {
    all: assignments.length,
    pending: assignments.filter((a) => getAssignmentStatus(a) === 'pending').length,
    submitted: assignments.filter((a) => getAssignmentStatus(a) === 'submitted').length,
    late: assignments.filter((a) => getAssignmentStatus(a) === 'late').length,
    graded: assignments.filter((a) => getAssignmentStatus(a) === 'graded').length,
  };

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'late', label: 'Late' },
    { value: 'graded', label: 'Graded' },
  ];

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
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">My Assignments</h1>
                <p className="text-white/80 text-sm mt-0.5">Assignments from all your enrolled courses</p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending', count: counts.pending, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
            { label: 'Submitted', count: counts.submitted, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Late', count: counts.late, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
            { label: 'Graded', count: counts.graded, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
          ].map((s) => (
            <div key={s.label} className={cn('rounded-xl p-4 flex items-center gap-3', s.bg)}>
              <p className={cn('text-2xl font-bold', s.color)}>{s.count}</p>
              <p className={cn('text-sm font-medium', s.color)}>{s.label}</p>
            </div>
          ))}
        </div>

        {error && <Alert variant="danger" className="mb-6">{error}</Alert>}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                filter === tab.value
                  ? 'bg-brand-blue text-white shadow'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
              )}
            >
              {tab.label}
              <span className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                filter === tab.value ? 'bg-white/20' : 'bg-gray-200 dark:bg-dark-600'
              )}>
                {counts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">Loading assignments...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-16 h-16" />}
            title="No assignments found"
            description={filter === 'all' ? 'You have no assignments yet' : `No ${filter} assignments`}
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((a) => (
              <AssignmentCard key={a.id} assignment={a} onSubmit={fetchAssignments} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
