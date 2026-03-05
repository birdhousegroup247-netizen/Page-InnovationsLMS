import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assignmentsAPI } from '../../lib/api';
import { ClipboardCheck, CheckCircle, Clock, User, FileText, ArrowLeft } from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Spinner, Alert } from '../../components/ui';

const STATUS_BADGE = {
  pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  graded: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
};

export default function GradeAssignments() {
  const { assignmentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [grading, setGrading] = useState({});
  const [scores, setScores] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red py-10">
        <Container>
          <Link to="/instructor/dashboard" className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Grade Submissions</h1>
              {data?.assignment && (
                <p className="text-white/80 text-sm">{data.assignment.title} — Max score: {data.assignment.max_score}</p>
              )}
            </div>
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
                {submission.text_response && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 dark:text-text-dark-muted mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Text Response
                    </p>
                    <p className="text-sm text-gray-700 dark:text-text-dark-secondary whitespace-pre-wrap">{submission.text_response}</p>
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
              </div>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
