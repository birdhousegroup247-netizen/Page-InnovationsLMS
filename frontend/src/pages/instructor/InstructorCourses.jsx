import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { coursesAPI } from '../../lib/api';
import {
  BookOpen,
  Users,
  Plus,
  Edit,
  Eye,
  Star,
  Search,
  Filter,
  Grid,
  List,
  Hammer,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Container, EmptyState } from '../../components/layout';
import { Button, Spinner } from '../../components/ui';
import emptyCourses from '../../assets/empty-courses.svg';

export default function InstructorCourses() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  useEffect(() => {
    // Note: Role check is handled by InstructorRoute wrapper in App.jsx
    // No need to check here - InstructorRoute redirects non-instructors before this renders
    fetchCourses();
  }, [user]);

  useEffect(() => {
    // Filter courses based on search and status
    let filtered = courses;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((course) => course.status === statusFilter);
    }

    setFilteredCourses(filtered);
  }, [searchQuery, statusFilter, courses]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await coursesAPI.getInstructorCourses();
      const coursesData = response.data.data.courses || [];
      setCourses(coursesData);
      setFilteredCourses(coursesData);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Courses' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
  ];

  const stats = {
    total: courses.length,
    published: courses.filter((c) => c.status === 'published').length,
    draft: courses.filter((c) => c.status === 'draft').length,
    pending: courses.filter((c) => c.status === 'pending').length,
    archived: courses.filter((c) => c.status === 'archived').length,
  };

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 animate-fade-in">
                  My Courses
                </h1>
                <p className="text-lg text-white/90 animate-fade-in">
                  Manage and track all your courses
                </p>
              </div>
              <Button
                variant="ghost"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/instructor/courses/create')}
                className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none animate-scale-in"
              >
                Create New Course
              </Button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-border-dark transition-colors">
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-1">Total Courses</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-border-dark transition-colors">
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-1">Published</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.published}</p>
          </div>
          <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-border-dark transition-colors">
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-1">Pending Review</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-border-dark transition-colors">
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-1">Draft</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.draft}</p>
          </div>
          <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-border-dark transition-colors">
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-1">Archived</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.archived}</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-border-dark mb-6 transition-colors">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search courses by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 dark:bg-dark-700 rounded-lg p-1 transition-colors">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-dark-600 text-brand-blue shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                )}
                aria-label="Grid view"
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-dark-600 text-brand-blue shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                )}
                aria-label="List view"
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
              Showing {filteredCourses.length} of {courses.length} courses
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading your courses...
            </p>
          </div>
        )}

        {/* Empty State - No courses at all */}
        {!loading && courses.length === 0 && (
          <EmptyState
            image={emptyCourses}
            icon={<BookOpen className="w-16 h-16" />}
            title="No courses yet"
            description="Get started by creating your first course"
            actionLabel="Create Your First Course"
            onAction={() => navigate('/instructor/courses/create')}
          />
        )}

        {/* Empty State - No search results */}
        {!loading && courses.length > 0 && filteredCourses.length === 0 && (
          <EmptyState
            image={emptyCourses}
            icon={<BookOpen className="w-16 h-16" />}
            title="No courses found"
            description="Try adjusting your search or filter criteria"
            actionLabel="Clear Filters"
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          />
        )}

        {/* Courses List/Grid */}
        {!loading && filteredCourses.length > 0 && (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
                : 'flex flex-col gap-4'
            )}
          >
            {filteredCourses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                viewMode={viewMode}
                onEdit={() => navigate(`/instructor/courses/${course.id}/edit`)}
                onView={() => navigate(`/courses/${course.id}`)}
                onManageContent={() => navigate(`/instructor/courses/${course.id}/builder`)}
                delay={index * 0.05}
              />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

// Course Card Component for Instructor
function CourseCard({ course, viewMode, onEdit, onView, onManageContent, delay }) {
  const placeholder = `https://placehold.co/400x225/0e2b5c/ffffff?text=${encodeURIComponent(
    course.title || 'Course'
  )}`;
  // Legacy thumbnails stored as base64 data: URLs got truncated by the
  // STRING(500) column and now load as broken images. Filter to http(s)
  // URLs only — anything else falls through to the placeholder.
  const stored = course.thumbnail_url || course.thumbnail;
  const thumbnail =
    typeof stored === 'string' && /^(https?:)?\/\//i.test(stored)
      ? stored
      : placeholder;

  return (
    <div
      className={cn(
        'bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all animate-slide-up',
        viewMode === 'grid' ? 'flex flex-col sm:flex-row gap-4 p-4' : 'flex flex-row gap-4 p-4'
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          'flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-dark-700 transition-colors',
          viewMode === 'grid'
            ? 'w-full sm:w-48 aspect-video sm:aspect-auto sm:h-32'
            : 'w-32 h-24'
        )}
      >
        <img
          src={thumbnail}
          alt={course.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== placeholder) {
              e.currentTarget.src = placeholder;
            }
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary line-clamp-1 mb-1 transition-colors">
              {course.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {course.difficulty && (
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                    {
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400':
                        course.difficulty === 'beginner',
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400':
                        course.difficulty === 'intermediate',
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400':
                        course.difficulty === 'advanced',
                    }
                  )}
                >
                  {course.difficulty}
                </span>
              )}
              <span
                className={cn(
                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                  {
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400':
                      course.status === 'draft',
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400':
                      course.status === 'published',
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400':
                      course.status === 'archived',
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400':
                      course.status === 'pending',
                  }
                )}
              >
                {course.status === 'pending' ? 'Pending Review' : (course.status || 'Draft')}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 dark:text-text-dark-secondary text-sm line-clamp-2 mb-3 transition-colors">
          {course.description || 'No description available'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-text-dark-muted mb-4 flex-wrap transition-colors">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {course.enrolled_count || 0} students
          </span>
          {course.average_rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {Number(course.average_rating).toFixed(1)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-auto">
          <button
            onClick={onManageContent}
            className="flex items-center gap-2 px-3 py-2 bg-brand-blue hover:bg-brand-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Hammer className="h-4 w-4" />
            Manage Content
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-text-dark-primary text-sm font-medium rounded-lg transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={onView}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-text-dark-primary text-sm font-medium rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
        </div>
      </div>
    </div>
  );
}
