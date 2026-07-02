import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Edit,
  BarChart3,
  Users,
  CheckCircle,
  Clock,
  Archive,
  Send,
  RotateCcw,
} from 'lucide-react';
import { assignedTestsAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner, Badge, Tooltip } from '../../components/ui';
import { cn } from '../../utils/cn';
import { useToast } from '../../components/ui/Toast';

export default function ManageTests() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      // getMyTests hits the student endpoint (/student/my-tests) which
      // 403s for instructor accounts. Instructors own tests, so use
      // the instructor list endpoint instead.
      const response = await assignedTestsAPI.getInstructorTests();
      setTests(response.data.data.tests || []);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Per-row lifecycle action ids that are mid-flight (so the spinner
  // shows on the right row instead of disabling the whole table).
  const [actingOn, setActingOn] = useState(null);

  const handlePublish = async (test) => {
    if (!window.confirm(
      test.course_id
        ? `Publish "${test.test_name}" and assign it to every enrolled student in the course?`
        : `Publish "${test.test_name}"? You can fine-tune student assignment later from Edit.`
    )) return;
    setActingOn(test.id);
    try {
      // assign_to: 'all' fans out to every course enrollee on the
      // backend; if the test isn't tied to a course (category-wide
      // test) we just flip status and the instructor can assign
      // specific students from Edit.
      await assignedTestsAPI.publishTest(test.id, test.course_id ? { assign_to: 'all' } : {});
      await fetchTests();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to publish test', 'error');
    } finally {
      setActingOn(null);
    }
  };

  const handleArchive = async (test) => {
    if (!window.confirm(`Archive "${test.test_name}"? Students who already started keep access; new attempts will be blocked.`)) return;
    setActingOn(test.id);
    try {
      await assignedTestsAPI.archiveTest(test.id);
      await fetchTests();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to archive test', 'error');
    } finally {
      setActingOn(null);
    }
  };

  const handleRestore = async (test) => {
    setActingOn(test.id);
    try {
      // Archive -> Draft so the instructor can re-publish deliberately.
      await assignedTestsAPI.updateTest(test.id, { status: 'draft' });
      await fetchTests();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to restore test', 'error');
    } finally {
      setActingOn(null);
    }
  };

  const filteredTests = tests.filter(test => {
    const q = search.toLowerCase();
    // Backend column is test_name; keep .title fallback in case any
    // other shape sneaks in.
    const name = (test.test_name || test.title || '').toLowerCase();
    const courseTitle = (test.course?.title || '').toLowerCase();
    return name.includes(q) || courseTitle.includes(q);
  });

  const stats = {
    total: tests.length,
    published: tests.filter(t => t.status === 'published').length,
    draft: tests.filter(t => t.status === 'draft').length,
    archived: tests.filter(t => t.status === 'archived').length
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { color: 'gray', label: 'Draft' },
      published: { color: 'green', label: 'Published' },
      archived: { color: 'yellow', label: 'Archived' }
    };
    return <Badge color={config[status]?.color || 'gray'}>{config[status]?.label || status}</Badge>;
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                      My Tests
                    </h1>
                    <p className="text-lg text-white/90 animate-fade-in mt-1">
                      Manage tests for your courses
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => navigate('/instructor/tests/create')}
                variant="ghost"
                leftIcon={<Plus className="h-4 w-4" />}
                className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none animate-scale-in"
              >
                Create Test
              </Button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-brand-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tests</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.published}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Published</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 dark:bg-dark-700 rounded-lg flex items-center justify-center">
                <Edit className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draft}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Drafts</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Archive className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.archived}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Archived</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tests..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
            />
          </div>
        </div>

        {/* Tests List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tests...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {search ? 'No tests found' : 'No tests yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {search
                ? 'Try a different search term'
                : 'Create your first test to get started'}
            </p>
            {!search && (
              <Button onClick={() => navigate('/instructor/tests/create')}>
                <Plus className="w-5 h-5 mr-2" />
                Create Test
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTests.map((test) => (
              <div
                key={test.id}
                className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {test.test_name || test.title}
                      </h3>
                      {getStatusBadge(test.status)}
                    </div>
                    {test.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {test.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        <span>{test.question_count || 0} questions</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>{test.assigned_students_count || 0} students</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Due: {formatDate(test.due_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {test.status === 'draft' && (
                      <Tooltip content="Publish (and assign to enrolled students)">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label="Publish test"
                          disabled={actingOn === test.id}
                          onClick={() => handlePublish(test)}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    )}
                    {test.status === 'published' && (
                      <Tooltip content="Archive test">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label="Archive test"
                          disabled={actingOn === test.id}
                          onClick={() => handleArchive(test)}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    )}
                    {test.status === 'archived' && (
                      <Tooltip content="Move back to drafts">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label="Restore to drafts"
                          disabled={actingOn === test.id}
                          onClick={() => handleRestore(test)}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip content="View results & analytics">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="View results & analytics"
                        onClick={() => navigate(`/instructor/tests/${test.id}/results`)}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Edit test">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Edit test"
                        onClick={() => navigate(`/instructor/tests/${test.id}/edit`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
