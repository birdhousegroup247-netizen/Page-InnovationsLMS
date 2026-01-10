import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { coursesAPI, categoriesAPI } from '../lib/api';
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  Users,
  Star,
  X,
  Grid,
  List,
  ChevronDown,
} from 'lucide-react';
import { Container, EmptyState } from '../components/layout';
import { Badge, Button, Spinner } from '../components/ui';
import emptyCourses from '../assets/empty-courses.svg';
import { cn } from '../utils/cn';

export default function Courses() {
  const navigate = useNavigate();
  const location = useLocation();

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Read search parameter from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    } else if (searchQuery) {
      setSearchQuery('');
    }
  }, [location.search]);

  // Fetch courses and categories
  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedLevel, searchQuery]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedLevel) params.level = selectedLevel;

      const [coursesRes, categoriesRes] = await Promise.all([
        coursesAPI.getAll(params),
        categoriesAPI.getAll(),
      ]);

      setCourses(coursesRes.data.data.courses || []);
      setCategories(categoriesRes.data.data.categories || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLevel('');
  };

  const handleEnroll = async (courseId) => {
    try {
      await coursesAPI.enroll(courseId);
      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error('Enrollment error:', error);
      alert(error.response?.data?.message || 'Failed to enroll');
    }
  };

  const activeFiltersCount = [selectedCategory, selectedLevel].filter(Boolean).length;

  return (
    <>
      {/* Hero Section */}
        <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

          <div className="relative z-10 py-16 sm:py-20">
            <Container>
              <div className="text-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 animate-fade-in">
                  Explore Courses
                </h1>
                <p className="text-lg sm:text-xl text-white/90 mb-10 max-w-2xl mx-auto animate-fade-in">
                  Discover world-class courses to accelerate your career
                </p>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto animate-scale-in">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search for courses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-dark-800 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg transition-colors"
                    />
                  </div>
                </div>
              </div>
            </Container>
          </div>
        </div>

        {/* Filters & Content */}
        <Container className="py-8">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            {/* Left: Filter Button & Active Filters */}
            <div className="flex items-center gap-4 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                leftIcon={<Filter className="h-4 w-4" />}
                className="relative"
              >
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-brand-blue rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 ml-2 transition-transform',
                    showFilters && 'rotate-180'
                  )}
                />
              </Button>

              {/* Active Filters Tags */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-brand-red hover:text-brand-red-600 flex items-center gap-1 font-medium transition-colors"
                >
                  <X className="h-4 w-4" />
                  Clear all
                </button>
              )}
            </div>

            {/* Right: View Toggle & Count */}
            <div className="flex items-center gap-4">
              <p className="text-gray-600 dark:text-text-dark-secondary text-sm font-medium transition-colors">
                {courses.length} {courses.length === 1 ? 'course' : 'courses'}
              </p>
              <div className="flex items-center gap-1 bg-white dark:bg-dark-800 rounded-lg p-1 shadow-sm transition-colors">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2 rounded transition-all',
                    viewMode === 'grid'
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-gray-500 dark:text-text-dark-muted hover:text-gray-900 dark:hover:text-text-dark-primary hover:bg-gray-50 dark:hover:bg-dark-700'
                  )}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2 rounded transition-all',
                    viewMode === 'list'
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-gray-500 dark:text-text-dark-muted hover:text-gray-900 dark:hover:text-text-dark-primary hover:bg-gray-50 dark:hover:bg-dark-700'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mb-8 bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card p-6 animate-slide-down transition-colors">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2 transition-colors">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2 transition-colors">
                    Difficulty Level
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                  >
                    <option value="">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col justify-center items-center py-20">
              <Spinner size="lg" />
              <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
                Loading courses...
              </p>
            </div>
          )}

          {/* Empty State */}
          {!loading && courses.length === 0 && (
            <EmptyState
              image={emptyCourses}
              icon={<BookOpen className="w-16 h-16" />}
              title="No courses found"
              description="Try adjusting your filters or search query"
              actionLabel={selectedCategory || selectedLevel || searchQuery ? 'Clear Filters' : undefined}
              onAction={handleClearFilters}
            />
          )}

          {/* Courses Grid/List */}
          {!loading && courses.length > 0 && (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'flex flex-col gap-4'
              )}
            >
              {courses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  viewMode={viewMode}
                  onEnroll={handleEnroll}
                  delay={index * 0.05}
                />
              ))}
            </div>
          )}
        </Container>
    </>
  );
}

// Course Card Component
function CourseCard({ course, viewMode, onEnroll, delay }) {
  const difficultyColors = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'danger',
  };

  const thumbnail =
    course.thumbnail_url ||
    `https://placehold.co/400x225/0e2b5c/ffffff?text=${encodeURIComponent(course.title)}`;

  if (viewMode === 'list') {
    return (
      <div
        className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all animate-slide-up"
        style={{ animationDelay: `${delay}s` }}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Thumbnail */}
          <div className="sm:w-64 aspect-video sm:aspect-auto bg-gray-100 dark:bg-dark-700 flex-shrink-0 transition-colors">
            <img
              src={thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Content */}
          <div className="p-6 flex-1">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary line-clamp-1 flex-1 transition-colors">
                {course.title}
              </h3>
              <Badge
                variant={difficultyColors[course.difficulty] || 'info'}
                className="ml-3 flex-shrink-0"
              >
                {course.difficulty}
              </Badge>
            </div>

            <p className="text-sm text-gray-600 dark:text-text-dark-secondary line-clamp-2 mb-4 transition-colors">
              {course.description}
            </p>

            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-text-dark-muted mb-4 transition-colors">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {course.enrolled_count || 0} students
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {course.duration || 'Self-paced'}
              </span>
              {course.average_rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {course.average_rating.toFixed(1)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link to={`/courses/${course.id}`} className="flex-1">
                <Button variant="outline" size="sm" fullWidth>
                  View Details
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onEnroll(course.id)}
                className="flex-1"
              >
                Enroll Now
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-dark-700 transition-colors">
        <img
          src={thumbnail}
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
          loading="lazy"
        />
        <div className="absolute top-4 right-4">
          <Badge variant={difficultyColors[course.difficulty] || 'info'}>
            {course.difficulty}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-2 line-clamp-2 min-h-[3.5rem] transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-4 line-clamp-2 min-h-[2.5rem] transition-colors">
          {course.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-text-dark-muted mb-4 transition-colors">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {course.enrolled_count || 0}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {course.duration || 'Self-paced'}
          </span>
          {course.average_rating && (
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {course.average_rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link to={`/courses/${course.id}`} className="flex-1">
            <Button variant="outline" size="sm" fullWidth>
              Details
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onEnroll(course.id)}
            className="flex-1"
          >
            Enroll
          </Button>
        </div>
      </div>
    </div>
  );
}
