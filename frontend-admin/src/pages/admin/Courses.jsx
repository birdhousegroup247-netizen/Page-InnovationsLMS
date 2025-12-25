import { useState, useEffect } from 'react';
import { adminCoursesAPI } from '../../lib/api';
import {
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { Container } from '../../components/layout';
import {
  Badge,
  Spinner,
} from '../../components/ui';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await adminCoursesAPI.getAll({ page: 1, limit: 10 });
      setCourses(response.data.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminCoursesAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'default';
      case 'pending': return 'warning';
      case 'archived': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red py-12">
        <Container>
          <h1 className="text-3xl font-bold text-white">Course Management</h1>
          <p className="text-white/90 mt-2">Manage all courses and approve submissions</p>
        </Container>
      </div>

      <Container className="py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary">Total Courses</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">{stats.total || 0}</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary">Published</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">{stats.published || 0}</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary">Pending</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">{stats.pending || 0}</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary">Draft</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">{stats.draft || 0}</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {/* Courses Table */}
        {!loading && !error && (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Instructor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-text-dark-primary">{course.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-text-dark-secondary">
                        {course.instructor?.full_name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={getStatusBadgeColor(course.status)}>{course.status}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 dark:text-text-dark-secondary">
                        {course.enrolled_count || 0}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {courses.length === 0 && (
              <div className="py-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-text-dark-secondary">No courses found</p>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
