import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { coursesAPI, enrollmentsAPI } from '../lib/api';
import { Container } from '../components/layout';
import { Button, Select, Spinner } from '../components/ui';
import { useToast } from '../components/ui/Toast';

/**
 * Select Your Course — the cohort-mode gate for students who arrive WITHOUT
 * an enrollment. Email sign-ups pick their course on the register form and
 * are auto-enrolled, but Google sign-ups skip that form entirely — so this is
 * where they (and any other edge case) choose the course they paid for
 * offline and get enrolled. Backed by POST /api/courses/:id/cohort-claim,
 * which only lets a student claim ONE course (server-guarded).
 */
export default function SelectCourse() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { checkAuth } = useAuth();
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // If they somehow already have a course, don't show this gate.
        const enrRes = await enrollmentsAPI.getMyCourses().catch(() => null);
        const enrolled = enrRes?.data?.data?.enrollments || enrRes?.data?.data?.courses || [];
        if (active && enrolled.length > 0) {
          navigate('/dashboard', { replace: true });
          return;
        }
        const res = await coursesAPI.getAll({ limit: 100, status: 'published' });
        if (active) setCourses(res.data?.data?.courses || []);
      } catch {
        if (active) setError('Could not load courses. Please refresh.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [navigate]);

  const handleConfirm = async () => {
    if (!courseId) { setError('Please select the course you enrolled in.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await coursesAPI.cohortClaim(courseId);
      await checkAuth?.().catch(() => {});
      const title = courses.find((c) => String(c.id) === String(courseId))?.title;
      showToast(`You're enrolled in ${title || 'your course'}!`, 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not enroll you. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 py-10 sm:py-12">
          <Container>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Select your course</h1>
                <p className="text-white/80 text-sm mt-1">
                  Choose the course you enrolled in and we'll set you up.
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8 max-w-xl">
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sm:p-8">
          {loading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <>
              <label htmlFor="course" className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
                Which course did you enroll in? <span className="text-red-500">*</span>
              </label>
              <Select
                id="course"
                value={courseId}
                onChange={(e) => { setCourseId(e.target.value); setError(''); }}
                options={[
                  { value: '', label: 'Select your course…' },
                  ...courses.map((c) => ({ value: String(c.id), label: c.title })),
                ]}
              />
              <p className="text-gray-500 dark:text-text-dark-muted text-xs mt-2">
                Pick the course you paid for. If it isn't listed or you haven't paid yet,
                contact Page Innovations.
              </p>

              {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                  <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  onClick={handleConfirm}
                  loading={submitting}
                  disabled={submitting}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="flex-1"
                >
                  Confirm & start learning
                </Button>
                <Button variant="ghost" onClick={() => navigate('/dashboard')} disabled={submitting}>
                  I'll do this later
                </Button>
              </div>

              <div className="mt-6 flex items-start gap-2 text-xs text-gray-500 dark:text-text-dark-muted">
                <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>You can only claim one course. To take another, contact Page Innovations.</span>
              </div>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
