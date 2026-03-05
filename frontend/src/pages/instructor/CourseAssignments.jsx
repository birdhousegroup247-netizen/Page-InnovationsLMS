import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { assignmentsAPI, coursesAPI } from '../../lib/api';
import { ClipboardCheck, ArrowLeft, ChevronRight, Clock, Users } from 'lucide-react';
import { Container } from '../../components/layout';
import { Spinner, Alert } from '../../components/ui';

export default function CourseAssignments() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseName, setCourseName] = useState('');

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignRes, courseRes] = await Promise.all([
        assignmentsAPI.getCourseAssignments(courseId),
        coursesAPI.getById(courseId),
      ]);
      setAssignments(assignRes.data.data.assignments || []);
      setCourseName(courseRes.data.data.course?.title || '');
    } catch (err) {
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = (a) => (a.submissions || []).filter(s => s.status !== 'graded').length;

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red py-10">
        <Container>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">Assignments</h1>
              {courseName && <p className="text-white/80 text-sm">{courseName}</p>}
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-6">
        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-dark-800 rounded-xl shadow-sm transition-colors">
            <ClipboardCheck className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-text-dark-muted font-medium">No assignments yet</p>
            <p className="text-gray-400 dark:text-text-dark-muted text-sm mt-1">
              Create assignments inside your lessons from the course builder.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const pending = pendingCount(assignment);
              const total = (assignment.submissions || []).length;
              return (
                <div key={assignment.id} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-5 flex items-center justify-between gap-4 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary truncate">{assignment.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-text-dark-muted">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {total} submission{total !== 1 ? 's' : ''}
                      </span>
                      {pending > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <Clock className="w-4 h-4" />
                          {pending} pending
                        </span>
                      )}
                      {pending === 0 && total > 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium">All graded</span>
                      )}
                      <span>Max: {assignment.max_score}</span>
                      {assignment.due_date && (
                        <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/instructor/assignments/${assignment.id}/grade`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Grade <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </>
  );
}
