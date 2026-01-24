import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { coursesAPI } from '../lib/api';
import {
  ArrowLeft,
  Clock,
  Users,
  Star,
  Award,
  BookOpen,
  CheckCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Share2,
  Bookmark,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { Container } from '../components/layout';
import { Card, Badge, Button, Spinner, Avatar } from '../components/ui';
import { cn } from '../utils/cn';
import CourseReviews from '../components/course/CourseReviews';
import PaymentModal from '../components/payment/PaymentModal';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const response = await coursesAPI.getById(id);
      setCourse(response.data.data.course);

      // Expand first module by default
      if (response.data.data.course?.modules?.length > 0) {
        setExpandedModules({ [response.data.data.course.modules[0].id]: true });
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      if (error.response?.status === 404) {
        navigate('/courses');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollClick = () => {
    // Open payment modal for both free and paid courses
    setShowPaymentModal(true);
  };

  const handleEnrollmentSuccess = async () => {
    // Called after successful payment or free enrollment
    try {
      await coursesAPI.enroll(id);
      setShowPaymentModal(false);
      setEnrollmentSuccess(true);

      // Show success message briefly then redirect
      setTimeout(() => {
        navigate(`/courses/${id}/learn`);
      }, 1500);
    } catch (error) {
      console.error('Enrollment error:', error);
      alert(error.response?.data?.message || 'Failed to enroll');
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
            Loading course...
          </p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const isEnrolled = course.is_enrolled || false;
  const thumbnail =
    course.thumbnail_url ||
    `https://placehold.co/1200x600/0e2b5c/ffffff?text=${encodeURIComponent(course.title)}`;

  const difficultyColors = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'danger',
  };

  return (
    <>
      {/* Hero Section */}
        <div className="relative h-72 sm:h-96 overflow-hidden bg-gradient-to-br from-gray-900 to-gray-700">
          <img
            src={thumbnail}
            alt={course.title}
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

          {/* Back Button */}
          <div className="absolute top-6 left-6">
            <Link to="/courses">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20"
              >
                <span className="hidden sm:inline">Back to Courses</span>
              </Button>
            </Link>
          </div>

          {/* Course Title & Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <Container>
              <div className="flex items-center gap-2 mb-3 animate-fade-in">
                <Badge variant={difficultyColors[course.difficulty] || 'info'}>
                  {course.difficulty}
                </Badge>
                <span className="text-white/80 text-sm">{course.category?.name || 'General'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 animate-slide-up">
                {course.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90 animate-slide-up">
                <span className="flex items-center gap-1.5">
                  <Users className="h-5 w-5" />
                  {course.enrolled_count || 0} students
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-5 w-5" />
                  {course.duration || 'Self-paced'}
                </span>
                {course.average_rating && (
                  <span className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    {Number(course.average_rating).toFixed(1)} ({course.reviews_count || 0} reviews)
                  </span>
                )}
              </div>
            </Container>
          </div>
        </div>

        {/* Main Content */}
        <Container className="py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Course Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card p-6 animate-slide-up transition-colors">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
                  About This Course
                </h2>
                <p className="text-gray-600 dark:text-text-dark-secondary leading-relaxed transition-colors">
                  {course.description || 'No description available.'}
                </p>
              </div>

              {/* What You'll Learn */}
              {course.learning_objectives && (
                <div
                  className="bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card p-6 animate-slide-up transition-colors"
                  style={{ animationDelay: '0.1s' }}
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
                    What You'll Learn
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {course.learning_objectives.split('\n').map((objective, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600 dark:text-text-dark-secondary text-sm transition-colors">
                          {objective}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course Curriculum */}
              <div
                className="bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card p-6 animate-slide-up transition-colors"
                style={{ animationDelay: '0.2s' }}
              >
                <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
                  Course Curriculum
                </h2>

                {course.modules && course.modules.length > 0 ? (
                  <div className="space-y-2">
                    {course.modules.map((module, moduleIndex) => (
                      <div
                        key={module.id}
                        className="border border-gray-200 dark:border-border-dark rounded-lg overflow-hidden bg-gray-50 dark:bg-dark-700 transition-colors"
                      >
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue text-white text-sm font-medium">
                              {moduleIndex + 1}
                            </span>
                            <div className="text-left">
                              <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary transition-colors">
                                {module.title}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-text-dark-muted transition-colors">
                                {module.contents?.length || 0} lessons
                              </p>
                            </div>
                          </div>
                          {expandedModules[module.id] ? (
                            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-text-dark-muted transition-colors" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-text-dark-muted transition-colors" />
                          )}
                        </button>

                        {expandedModules[module.id] && module.contents && (
                          <div className="border-t border-gray-200 dark:border-border-dark bg-white dark:bg-dark-800 transition-colors">
                            {module.contents.map((content) => (
                              <div
                                key={content.id}
                                className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors border-b border-gray-100 dark:border-border-dark last:border-0"
                              >
                                <PlayCircle className="h-5 w-5 text-brand-blue flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-gray-900 dark:text-text-dark-primary text-sm font-medium transition-colors">
                                    {content.title}
                                  </p>
                                  {content.duration_minutes && (
                                    <p className="text-gray-500 dark:text-text-dark-muted text-xs transition-colors">
                                      {content.duration_minutes} min
                                    </p>
                                  )}
                                </div>
                                {!isEnrolled && <span className="text-sm text-gray-500 dark:text-text-dark-muted">🔒</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-text-dark-muted transition-colors">
                    No curriculum available yet.
                  </p>
                )}
              </div>

              {/* Instructor */}
              {course.instructor && (
                <div
                  className="bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card p-6 animate-slide-up transition-colors"
                  style={{ animationDelay: '0.3s' }}
                >
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
                    Instructor
                  </h2>
                  <div className="flex items-start gap-4">
                    <Avatar
                      size="2xl"
                      fallback={course.instructor.full_name?.charAt(0) || 'I'}
                      className="bg-gradient-to-br from-brand-blue to-brand-purple text-white"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary transition-colors">
                        {course.instructor.full_name}
                      </h3>
                      <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-2 transition-colors">
                        {course.instructor.bio || 'Course Instructor'}
                      </p>
                      <p className="text-gray-600 dark:text-text-dark-secondary text-sm transition-colors">
                        {course.instructor.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews & Ratings */}
              <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
                <CourseReviews courseId={id} isEnrolled={isEnrolled} />
              </div>
            </div>

            {/* Right Column - Enrollment Card */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card p-6 sticky top-24 animate-scale-in transition-colors">
                {/* Price */}
                <div className="mb-6">
                  <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-2 transition-colors">
                    Course Price
                  </p>
                  {course.price > 0 ? (
                    <div>
                      {course.discount_percentage > 0 ? (
                        <>
                          <div className="flex items-baseline gap-3">
                            <p className="text-4xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">
                              ${(course.price - (course.price * course.discount_percentage / 100)).toFixed(2)}
                            </p>
                            <p className="text-xl text-gray-400 dark:text-text-dark-muted line-through transition-colors">
                              ${course.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="mt-2 inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                            <Tag className="h-4 w-4" />
                            {course.discount_percentage}% off
                          </div>
                        </>
                      ) : (
                        <p className="text-4xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">
                          ${course.price.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-4xl font-bold text-green-600 dark:text-green-400 transition-colors">
                      Free
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 mb-6">
                  {isEnrolled ? (
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={() => navigate(`/courses/${id}/learn`)}
                      leftIcon={<PlayCircle className="h-5 w-5" />}
                    >
                      Continue Learning
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={handleEnrollClick}
                      leftIcon={<BookOpen className="h-5 w-5" />}
                      className="bg-gradient-to-r from-brand-blue to-brand-purple hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                      {course.price > 0 ? 'Enroll Now' : 'Enroll For Free'}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    leftIcon={<Bookmark className="h-4 w-4" />}
                  >
                    Add to Wishlist
                  </Button>

                  <Button variant="ghost" size="lg" fullWidth leftIcon={<Share2 className="h-4 w-4" />}>
                    Share Course
                  </Button>
                </div>

                {/* Course Includes */}
                <div className="border-t border-gray-200 dark:border-border-dark pt-6 transition-colors">
                  <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
                    This course includes:
                  </h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-center gap-3 text-gray-600 dark:text-text-dark-secondary transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Full lifetime access
                    </li>
                    <li className="flex items-center gap-3 text-gray-600 dark:text-text-dark-secondary transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Certificate of completion
                    </li>
                    <li className="flex items-center gap-3 text-gray-600 dark:text-text-dark-secondary transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Access on mobile and desktop
                    </li>
                    <li className="flex items-center gap-3 text-gray-600 dark:text-text-dark-secondary transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Downloadable resources
                    </li>
                    <li className="flex items-center gap-3 text-gray-600 dark:text-text-dark-secondary transition-colors">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      30-day money-back guarantee
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Container>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        course={course}
        onSuccess={handleEnrollmentSuccess}
      />

      {/* Success Notification */}
      {enrollmentSuccess && (
        <div className="fixed bottom-8 right-8 z-50 animate-slide-up">
          <div className="bg-green-600 dark:bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6" />
            <div>
              <p className="font-semibold">Enrollment Successful!</p>
              <p className="text-sm text-green-100">Redirecting to course...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
