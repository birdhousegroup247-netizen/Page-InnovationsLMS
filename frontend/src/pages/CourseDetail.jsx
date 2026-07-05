import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { coursesAPI, instructorReviewsAPI, liveSessionsAPI, discordAPI, wishlistAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
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
  Lock,
  X,
  Video,
  Calendar,
  Link as LinkIcon,
} from 'lucide-react';
import { Container } from '../components/layout';
import { Card, Badge, Button, Spinner, Avatar } from '../components/ui';
import { cn } from '../utils/cn';
import { formatPrice } from '../utils/currency';
import { ensureAbsoluteUrl as absUrl } from '../utils/videoEmbed';
import CourseReviews from '../components/course/CourseReviews';
import { useToast } from '../components/ui/Toast';

export default function CourseDetail() {
  const { showToast } = useToast();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [instructorStats, setInstructorStats] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [discordInvite, setDiscordInvite] = useState(null);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [id]);

  useEffect(() => {
    if (!user) return;
    wishlistAPI
      .check(id)
      .then((res) => setWishlisted(res.data.data.wishlisted))
      .catch(() => {});
  }, [id, user]);

  const handleToggleWishlist = async () => {
    if (wishlistBusy) return;
    setWishlistBusy(true);
    try {
      if (wishlisted) {
        await wishlistAPI.remove(id);
        setWishlisted(false);
      } else {
        await wishlistAPI.add(id);
        setWishlisted(true);
      }
    } catch {
      // silent — the button just stays in its previous state
    } finally {
      setWishlistBusy(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/courses/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: course?.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {}
  };

  // Viewer is the course owner if their id matches the course's
  // instructor_id, or they're an admin/super_admin. Used to:
  //   - hide student CTAs (Enroll / Wishlist / "Free")
  //   - show owner-only CTAs (Share / Edit / Manage)
  //   - unlock every lesson in the curriculum preview
  //   - send the Back button to /instructor/courses instead of /courses
  const isOwner =
    !!user && !!course &&
    (user.id === course.instructor_id ||
      user.role === 'admin' ||
      user.role === 'super_admin');

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const response = await coursesAPI.getById(id);
      const data = response.data.data;
      setCourse(data.course);
      setIsEnrolled(data.isEnrolled || false);

      // Expand first module by default
      if (data.course?.modules?.length > 0) {
        setExpandedModules({ [data.course.modules[0].id]: true });
      }

      // Load instructor stats if instructor exists
      if (data.course?.instructor?.id) {
        instructorReviewsAPI.getStats(data.course.instructor.id)
          .then(r => setInstructorStats(r.data.data))
          .catch(() => {});
      }

      // Load upcoming sessions and Discord invite if enrolled
      if (data.isEnrolled) {
        liveSessionsAPI.getByCourse(id)
          .then(r => setUpcomingSessions((r.data.data.sessions || []).filter(s => s.status !== 'ended')))
          .catch(() => {});
        discordAPI.getCourseInvite(id)
          .then(r => setDiscordInvite(r.data.data.invite_url))
          .catch(() => {}); // non-critical
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

  const handleEnrollClick = async () => {
    // Paid courses go to the real checkout (Paystack / PayPal).
    if (course.price > 0) {
      navigate(`/checkout?course_id=${id}`);
      return;
    }

    // Free courses enroll in one click — no payment UI, no card form.
    // (This is how Udemy/Coursera handle free enrollment.)
    try {
      setEnrolling(true);
      await coursesAPI.enroll(id);
      setEnrollmentSuccess(true);
      setIsEnrolled(true);
      showToast('Enrolled! Opening your course…', 'success');
      setTimeout(() => {
        navigate(`/courses/${id}/learn`);
      }, 1200);
    } catch (error) {
      console.error('Enrollment error:', error);
      showToast(error.response?.data?.message || 'Failed to enroll', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const handleSubmitInstructorReview = async () => {
    if (!reviewRating) return;
    setReviewSubmitting(true);
    try {
      await instructorReviewsAPI.create(course.instructor.id, {
        rating: reviewRating,
        comment: reviewComment,
        course_id: course.id,
      });
      setReviewSuccess('Review submitted successfully!');
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment('');
    } catch (err) {
      setReviewSuccess(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
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
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-gray-400 dark:text-text-dark-muted mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
            Course not found
          </h3>
          <p className="text-gray-600 dark:text-text-dark-secondary mb-4 transition-colors">
            The course could not be loaded. It may have been removed or is unavailable.
          </p>
          <Link to="/courses">
            <Button variant="primary">Back to Courses</Button>
          </Link>
        </div>
      </div>
    );
  }

  const placeholderThumb = `https://placehold.co/1200x600/0e2b5c/ffffff?text=${encodeURIComponent(course.title)}`;
  // Legacy base64 thumbnails got truncated to 500 chars — skip them.
  const storedThumb = course.thumbnail_url || course.thumbnail;
  const thumbnail =
    typeof storedThumb === 'string' && /^(https?:)?\/\//i.test(storedThumb)
      ? storedThumb
      : placeholderThumb;

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
            onError={(e) => {
              if (e.currentTarget.src !== placeholderThumb) {
                e.currentTarget.src = placeholderThumb;
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

          {/* Back Button — owners go back to /instructor/courses,
              everyone else to the public catalogue */}
          <div className="absolute top-6 left-6">
            <Link to={isOwner ? '/instructor/courses' : '/courses'}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20"
              >
                <span className="hidden sm:inline">
                  {isOwner ? 'Back to My Courses' : 'Back to Courses'}
                </span>
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
                            {module.contents.map((content) => {
                              // Owners + admins + enrolled students see no lock.
                              const showLock = !isOwner && !isEnrolled;
                              return (
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
                                  {showLock && <span className="text-sm text-gray-500 dark:text-text-dark-muted">🔒</span>}
                                </div>
                              );
                            })}
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

              {/* Upcoming Live Sessions (enrolled only) */}
              {isEnrolled && upcomingSessions.length > 0 && (
                <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card p-6 animate-slide-up transition-colors">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2 transition-colors">
                    <Video className="h-5 w-5 text-brand-blue" /> Upcoming Live Sessions
                  </h2>
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-text-dark-primary text-sm">{session.title}</p>
                            {session.status === 'live' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 dark:text-text-dark-muted flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(session.scheduled_at).toLocaleString()} · {session.duration_minutes} min
                          </p>
                        </div>
                        <a href={absUrl(session.meeting_url)} target="_blank" rel="noreferrer"
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                            session.status === 'live'
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue hover:bg-brand-blue/20'
                          }`}>
                          <LinkIcon className="w-3.5 h-3.5" />
                          {session.status === 'live' ? 'Join Now' : 'Join'}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discord Channel (enrolled only) */}
              {isEnrolled && discordInvite && (
                <div className="bg-[#5865F2] rounded-xl shadow-sm p-5 animate-slide-up text-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                    <div>
                      <p className="font-semibold text-sm">Your Course Discord Channel</p>
                      <p className="text-white/80 text-xs mt-0.5">Chat with your classmates and instructor</p>
                    </div>
                  </div>
                  <a
                    href={discordInvite}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 px-4 py-2 bg-white text-[#5865F2] font-semibold text-sm rounded-lg hover:bg-white/90 transition-colors"
                  >
                    Join Channel
                  </a>
                </div>
              )}

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
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary transition-colors">
                        {course.instructor.full_name}
                      </h3>
                      {instructorStats && instructorStats.total_reviews > 0 && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-text-dark-primary">
                            {Number(instructorStats.average_rating).toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-text-dark-muted">
                            ({instructorStats.total_reviews} review{instructorStats.total_reviews !== 1 ? 's' : ''})
                          </span>
                        </div>
                      )}
                      <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-2 transition-colors">
                        {course.instructor.bio || 'Course Instructor'}
                      </p>
                      {isEnrolled && (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="mt-2 text-sm text-brand-blue hover:underline flex items-center gap-1"
                        >
                          <Star className="h-4 w-4" />
                          Rate this instructor
                        </button>
                      )}
                      {reviewSuccess && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1">{reviewSuccess}</p>
                      )}
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
                {/* Price — hidden for owners (they don't buy their own course) */}
                {!isOwner && (
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
                              {formatPrice(course.price - (course.price * course.discount_percentage / 100))}
                            </p>
                            <p className="text-xl text-gray-400 dark:text-text-dark-muted line-through transition-colors">
                              {formatPrice(course.price)}
                            </p>
                          </div>
                          <div className="mt-2 inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                            <Tag className="h-4 w-4" />
                            {course.discount_percentage}% off
                          </div>
                        </>
                      ) : (
                        <p className="text-4xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">
                          {formatPrice(course.price)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-4xl font-bold text-green-600 dark:text-green-400 transition-colors">
                      Free
                    </p>
                  )}
                </div>
                )}

                {/* Owner badge — replaces the price for the course owner */}
                {isOwner && (
                  <div className="mb-6 p-3 bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 rounded-lg">
                    <p className="text-xs font-semibold text-brand-blue dark:text-cyan-400 uppercase tracking-wider mb-1">
                      You own this course
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      You can preview every lesson, edit details, and manage content.
                    </p>
                  </div>
                )}

                {/* Prerequisite Notice */}
                {course.prerequisite && !isEnrolled && (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-700 dark:text-amber-300 text-sm font-medium">Prerequisite Required</p>
                        <p className="text-amber-600 dark:text-amber-400 text-xs mt-0.5">
                          Complete{' '}
                          <Link to={`/courses/${course.prerequisite.id}`} className="underline font-medium">
                            {course.prerequisite.title}
                          </Link>{' '}
                          first
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons — owner gets Share/Edit/Manage,
                    everyone else gets Enroll + Wishlist + Share. */}
                <div className="space-y-3 mb-6">
                  {isOwner ? (
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        leftIcon={<Share2 className="h-5 w-5" />}
                        onClick={handleShare}
                      >
                        {shareCopied ? 'Link copied!' : 'Share course'}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        fullWidth
                        onClick={() => navigate(`/instructor/courses/${id}/edit`)}
                      >
                        Edit course
                      </Button>
                      <Button
                        variant="ghost"
                        size="lg"
                        fullWidth
                        onClick={() => navigate(`/instructor/courses/${id}/builder`)}
                      >
                        Manage content
                      </Button>
                    </>
                  ) : isEnrolled ? (
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={() => navigate(`/courses/${id}/learn`)}
                        leftIcon={<PlayCircle className="h-5 w-5" />}
                      >
                        Continue Learning
                      </Button>
                      <Button
                        variant="ghost"
                        size="lg"
                        fullWidth
                        leftIcon={<Share2 className="h-4 w-4" />}
                        onClick={handleShare}
                      >
                        {shareCopied ? 'Link copied!' : 'Share Course'}
                      </Button>
                    </>
                  ) : (
                    <>
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

                      <Button
                        variant="outline"
                        size="lg"
                        fullWidth
                        disabled={wishlistBusy}
                        onClick={handleToggleWishlist}
                        leftIcon={
                          <Bookmark
                            className={cn('h-4 w-4', wishlisted && 'fill-brand-blue text-brand-blue')}
                          />
                        }
                      >
                        {wishlisted ? 'In your Wishlist' : 'Add to Wishlist'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="lg"
                        fullWidth
                        leftIcon={<Share2 className="h-4 w-4" />}
                        onClick={handleShare}
                      >
                        {shareCopied ? 'Link copied!' : 'Share Course'}
                      </Button>
                    </>
                  )}
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

      {/* Rate Instructor Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl p-6 w-full max-w-md transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary">Rate Instructor</h3>
              <button onClick={() => setShowReviewModal(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors" title="Close">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-text-dark-muted mb-4">
              How would you rate <span className="font-medium text-gray-900 dark:text-text-dark-primary">{course.instructor?.full_name}</span>?
            </p>
            {/* Star Rating */}
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-1"
                >
                  <Star className={`h-8 w-8 transition-colors ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                </button>
              ))}
            </div>
            {/* Comment */}
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience (optional)"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitInstructorReview}
                disabled={!reviewRating || reviewSubmitting}
                className="px-4 py-2 text-sm bg-brand-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

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
