import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ClipboardCheck, BookOpen, Calendar, Inbox, ChevronRight, ArrowLeft, Users, Clock,
} from 'lucide-react';
import { instructorAPI, coursesAPI, assignmentsAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Spinner, Alert, Badge } from '../../components/ui';
import { cn } from '../../utils/cn';

// Same component, three URLs:
//   /instructor/assignments
//   /instructor/assignments?course=:id
//   /instructor/courses/:courseId/assignments-grading   ← course card "Grade" lands here
//
// Scoped mode shows only that course's assignments + a back button.
// Unscoped mode lists everything across the instructor's courses with
// a Course chip filter. Submissions + pending-grading counts always
// shown so the instructor can prioritise their queue.

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const scopedCourseId =
    params.courseId ? parseInt(params.courseId, 10) :
    (searchParams.get('course') ? parseInt(searchParams.get('course'), 10) : null);
  const isScoped = !!scopedCourseId;

  const [items, setItems]   = useState([]);
  const [courses, setCourses] = useState([]);
  const [scopedCourse, setScopedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');

  // Resolve scoped course title for the header subtitle.
  useEffect(() => {
    if (!isScoped) { setScopedCourse(null); return; }
    coursesAPI.getById(scopedCourseId)
      .then((r) => setScopedCourse(r.data?.data?.course || null))
      .catch(() => {});
  }, [scopedCourseId, isScoped]);

  // For the picker dropdown in unscoped mode.
  useEffect(() => {
    coursesAPI.getInstructorCourses()
      .then((r) => setCourses(r.data?.data?.courses || []))
      .catch(() => {});
  }, []);

  // Fetch — scoped vs aggregated. The aggregated endpoint already
  // returns total_submissions + pending_grading per row; the
  // per-course endpoint returns submissions[] so we derive the same
  // shape client-side for visual parity.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const promise = isScoped
      ? assignmentsAPI.getCourseAssignments(scopedCourseId).then((r) => {
          const rows = r.data?.data?.assignments || [];
          return rows.map((a) => ({
            ...a,
            total_submissions: (a.submissions || []).length,
            pending_grading: (a.submissions || []).filter((s) => s.status !== 'graded').length,
          }));
        })
      : instructorAPI.getMyAssignments().then((r) => r.data?.data?.assignments || []);

    promise
      .then((rows) => { if (alive) setItems(rows); })
      .catch((e) => { if (alive) setError(e?.response?.data?.message || 'Failed to load assignments'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [scopedCourseId, isScoped]);

  const counts = useMemo(() => ({
    all: items.length,
    pending: items.filter((a) => (a.pending_grading || 0) > 0).length,
    graded:  items.filter((a) => (a.pending_grading || 0) === 0 && (a.total_submissions || 0) > 0).length,
  }), [items]);

  const visible = items.filter((a) => {
    if (filter === 'pending' && (a.pending_grading || 0) === 0) return false;
    if (filter === 'graded' && !((a.pending_grading || 0) === 0 && (a.total_submissions || 0) > 0)) return false;
    if (!isScoped && courseFilter !== 'all' && String(a.course_id) !== String(courseFilter)) return false;
    return true;
  });

  const fmt = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <Container className="py-10 sm:py-12">
          {isScoped && (
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Assignments</h1>
              <p className="text-white/85 text-sm sm:text-base mt-1">
                {isScoped
                  ? (scopedCourse?.title || 'Course assignments')
                  : 'Every assignment across every course you teach.'}
              </p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-8 space-y-4">
        {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all',     label: `All · ${counts.all}` },
            { id: 'pending', label: `Pending · ${counts.pending}` },
            { id: 'graded',  label: `Graded · ${counts.graded}` },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filter === c.id
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-700 hover:border-brand-blue/40'
              )}
            >
              {c.label}
            </button>
          ))}
          {!isScoped && courses.length > 1 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="ml-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-700"
            >
              <option value="all">Any course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl">
            <Inbox className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              {items.length === 0
                ? 'No assignments yet'
                : 'Nothing matches this filter'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Assignments are created on each course's <em>Build</em> page.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visible.map((a) => {
              const pending = a.pending_grading || 0;
              const total   = a.total_submissions || 0;
              return (
                <Link
                  key={a.id}
                  to={`/instructor/courses/${a.course_id}/assignments-grading`}
                  className="group bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4 transition-colors hover:border-brand-blue/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {a.title || 'Untitled assignment'}
                      </h3>
                      {pending > 0 && <Badge variant="warning">{pending} pending</Badge>}
                      {pending === 0 && total > 0 && <Badge variant="success">All graded</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {!isScoped && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {a.course?.title || `Course #${a.course_id}`}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Due {fmt(a.due_date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {total} submission{total === 1 ? '' : 's'}
                      </span>
                      {typeof a.max_score === 'number' && <span>Max {a.max_score}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </>
  );
}
