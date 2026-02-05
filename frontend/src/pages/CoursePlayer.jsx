import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { coursesAPI, progressAPI } from '../lib/api';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  Menu,
  X,
  Download,
  FileText,
  PlayCircle,
  Lock,
  Home,
  MessageCircle,
  BookOpen,
  Video,
  FileDown,
  AlignLeft,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Button, Spinner } from '../components/ui';
import QuestionDiscussion from '../components/course/QuestionDiscussion';
import logo from '../assets/logo.png';

// Decode HTML entities that may be stored escaped in the DB
function decodeEntities(text) {
  if (typeof text !== 'string') return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// Format plain text article content into readable HTML
function formatArticleContent(text) {
  if (typeof text !== 'string') return '';
  // If content already has HTML block tags, return as-is
  if (/<(p|div|h[1-6]|ul|ol|br)\b/i.test(text)) return text;

  // Escape HTML for safety since we're building our own HTML
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const raw = decodeEntities(text);

  // Split into paragraphs by double newlines, or if none exist treat sentences as flow
  let paragraphs = raw.split(/\n\s*\n/);

  // If no double newlines at all (wall of text), try splitting on known patterns
  if (paragraphs.length <= 1) {
    // Try to split on numbered items like "1." "2." at the start of sentences
    paragraphs = raw.split(/(?=\d+\.\s+[A-Z])/).filter(Boolean);
  }

  // If still one block, try splitting on sentence-ending patterns followed by capitals
  if (paragraphs.length <= 1 && raw.length > 500) {
    // Split on ". " followed by a capital letter (new topic) — but group into ~3 sentence chunks
    const sentences = raw.split(/(?<=\.)\s+(?=[A-Z])/);
    paragraphs = [];
    for (let i = 0; i < sentences.length; i += 3) {
      paragraphs.push(sentences.slice(i, i + 3).join(' '));
    }
  }

  return paragraphs
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      // Check if paragraph starts with a number pattern like "1." or "Step 1:"
      const numMatch = p.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        const heading = numMatch[2].split(/[.:]/, 1)[0];
        const rest = numMatch[2].slice(heading.length).replace(/^[.:\s]+/, '');
        return `<h3>${esc(numMatch[1] + '. ' + heading)}</h3>${rest ? `<p>${esc(rest)}</p>` : ''}`;
      }
      // Check for label-like patterns "Title: rest"
      const labelMatch = p.match(/^([A-Z][A-Za-z\s&-]{2,40}):\s+(.*)/);
      if (labelMatch) {
        return `<h3>${esc(labelMatch[1])}</h3><p>${esc(labelMatch[2])}</p>`;
      }
      // Single newlines → <br>
      return `<p>${esc(p).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

// Build YouTube embed URL from a youtube_url or youtube_video_id
const YT_PARAMS = 'modestbranding=1&rel=0&showinfo=0&iv_load_policy=3';
function getYouTubeEmbedUrl(content) {
  if (content.youtube_video_id) {
    return `https://www.youtube.com/embed/${content.youtube_video_id}?${YT_PARAMS}`;
  }
  if (content.youtube_url) {
    // Extract video ID from various YouTube URL formats
    const match = content.youtube_url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/
    );
    if (match) return `https://www.youtube.com/embed/${match[1]}?${YT_PARAMS}`;
    // If it's already an embed URL, append params
    if (content.youtube_url.includes('/embed/')) {
      const sep = content.youtube_url.includes('?') ? '&' : '?';
      return `${content.youtube_url}${sep}${YT_PARAMS}`;
    }
    return content.youtube_url;
  }
  return null;
}

export default function CoursePlayer() {
  const { id } = useParams(); // Course ID
  const navigate = useNavigate();
  const { user } = useAuth();

  // Default sidebar closed on mobile so content shows first
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [course, setCourse] = useState(null);
  const [currentContent, setCurrentContent] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    setLoading(true);
    try {
      // Fetch course data first
      const courseRes = await coursesAPI.getById(id);
      const courseData = courseRes.data?.data?.course;

      if (!courseData) {
        console.error('No course data returned');
        setLoading(false);
        return;
      }

      setCourse(courseData);

      // Fetch progress separately so it doesn't break course loading
      let progressData = {};
      try {
        const progressRes = await progressAPI.getProgress(id);
        progressData = progressRes.data?.data?.progress || {};
      } catch (progressError) {
        console.error('Error fetching progress (continuing without it):', progressError);
      }
      setProgress(progressData);

      // Find first incomplete lesson or first lesson
      const firstIncomplete = findFirstIncompleteLesson(courseData, progressData);
      if (firstIncomplete) {
        setCurrentContent(firstIncomplete);
      } else if (courseData.modules?.[0]?.contents?.[0]) {
        setCurrentContent(courseData.modules[0].contents[0]);
      }
    } catch (err) {
      console.error('Error fetching course data:', err);
      if (err.response?.status === 403) {
        alert('You must enroll in this course first');
        navigate(`/courses/${id}`);
      } else {
        setError(err.message || 'Failed to load course');
      }
    } finally {
      setLoading(false);
    }
  };

  const findFirstIncompleteLesson = (courseData, progressData) => {
    if (!courseData.modules) return null;

    for (const module of courseData.modules) {
      if (!module.contents) continue;
      for (const content of module.contents) {
        if (!progressData[content.id]?.completed) {
          return content;
        }
      }
    }
    return null;
  };

  const handleMarkComplete = async () => {
    if (!currentContent || markingComplete) return;

    setMarkingComplete(true);
    try {
      await progressAPI.markComplete(currentContent.id);

      // Update local progress
      setProgress((prev) => ({
        ...prev,
        [currentContent.id]: { completed: true, completed_at: new Date().toISOString() },
      }));

      // Auto-navigate to next lesson
      setTimeout(() => {
        handleNextLesson();
      }, 500);
    } catch (error) {
      console.error('Error marking complete:', error);
      alert('Failed to mark lesson as complete');
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleNextLesson = () => {
    const next = findNextLesson();
    if (next) {
      setCurrentContent(next);
    }
  };

  const handlePreviousLesson = () => {
    const prev = findPreviousLesson();
    if (prev) {
      setCurrentContent(prev);
    }
  };

  const findNextLesson = () => {
    if (!course?.modules || !currentContent) return null;

    let foundCurrent = false;
    for (const module of course.modules) {
      if (!module.contents) continue;
      for (const content of module.contents) {
        if (foundCurrent) return content;
        if (content.id === currentContent.id) foundCurrent = true;
      }
    }
    return null;
  };

  const findPreviousLesson = () => {
    if (!course?.modules || !currentContent) return null;

    let previous = null;
    for (const module of course.modules) {
      if (!module.contents) continue;
      for (const content of module.contents) {
        if (content.id === currentContent.id) return previous;
        previous = content;
      }
    }
    return null;
  };

  const isLessonCompleted = (contentId) => {
    return progress[contentId]?.completed || false;
  };

  const calculateCourseProgress = () => {
    if (!course?.modules) return 0;

    let totalLessons = 0;
    let completedLessons = 0;

    course.modules.forEach((module) => {
      if (module.contents) {
        totalLessons += module.contents.length;
        module.contents.forEach((content) => {
          if (isLessonCompleted(content.id)) {
            completedLessons++;
          }
        });
      }
    });

    return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center transition-colors">
        <div className="text-center max-w-md">
          <FileText className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
            Failed to load course
          </h3>
          <p className="text-gray-600 dark:text-text-dark-secondary mb-4 transition-colors">
            {error}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="primary" onClick={() => { setError(null); fetchCourseData(); }}>
              Try Again
            </Button>
            <Link to="/my-courses">
              <Button variant="outline">Back to My Courses</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!course || !currentContent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 dark:text-text-dark-muted mx-auto mb-4 transition-colors" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
            Course not found
          </h3>
          <p className="text-gray-600 dark:text-text-dark-secondary mb-2 transition-colors">
            This course has no content yet or could not be loaded.
          </p>
          <Link to="/my-courses">
            <Button variant="primary" className="mt-4">
              Back to My Courses
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const courseProgress = calculateCourseProgress();
  const hasNextLesson = findNextLesson() !== null;
  const hasPreviousLesson = findPreviousLesson() !== null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex flex-col transition-colors">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-border-dark sticky top-0 z-50 transition-colors">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700 lg:hidden transition-colors"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={logo} alt="TekyPro" className="h-8 w-auto object-contain" />
            </Link>
            <div className="hidden sm:block">
              <h1 className="text-sm sm:text-base font-medium text-gray-900 dark:text-text-dark-primary line-clamp-1 transition-colors">
                {decodeEntities(course.title)}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-text-dark-muted transition-colors">
                <span>{courseProgress}% Complete</span>
                <span>•</span>
                <span>{user?.full_name}</span>
              </div>
            </div>
          </div>

          <Link to="/my-courses">
            <Button variant="ghost" leftIcon={<Home className="h-4 w-4" />} size="sm">
              <span className="hidden sm:inline">My Courses</span>
            </Button>
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-dark-700 h-1 transition-colors">
          <div
            className="bg-gradient-to-r from-brand-blue to-brand-purple h-1 transition-all duration-300"
            style={{ width: `${courseProgress}%` }}
          ></div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Course Curriculum */}
        <aside
          className={cn(
            'w-full lg:w-80 bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-border-dark overflow-y-auto transition-all duration-300',
            'fixed lg:static inset-y-0 left-0 z-40 pt-[73px] lg:pt-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="p-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
              Course Content
            </h2>

            {course.modules?.map((module, moduleIndex) => (
              <div key={module.id} className="mb-4">
                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 dark:bg-dark-700 rounded-lg transition-colors">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-blue/20 text-brand-blue text-xs font-medium">
                    {moduleIndex + 1}
                  </span>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-text-dark-primary transition-colors">
                    {decodeEntities(module.title)}
                  </h3>
                </div>

                {module.contents?.map((content, contentIndex) => {
                  const isActive = currentContent.id === content.id;
                  const isCompleted = isLessonCompleted(content.id);

                  return (
                    <button
                      key={content.id}
                      onClick={() => {
                        setCurrentContent(content);
                        // Auto-close sidebar on mobile so content is visible
                        if (window.innerWidth < 1024) setSidebarOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                        isActive
                          ? 'bg-brand-blue text-white shadow-md'
                          : 'text-gray-600 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700'
                      )}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : isActive ? (
                          <PlayCircle className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{decodeEntities(content.title)}</p>
                        <div className="flex items-center gap-2 text-xs opacity-75">
                          {content.content_type === 'video' && <Video className="h-3 w-3" />}
                          {content.content_type === 'document' && <FileDown className="h-3 w-3" />}
                          {content.content_type === 'article' && <AlignLeft className="h-3 w-3" />}
                          <span>{content.content_type}</span>
                          {content.duration_minutes && <span>• {content.duration_minutes} min</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-900 transition-colors">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            {/* Video/Content Player */}
            <div className="mb-6">
              {/* Video content */}
              {currentContent.content_type === 'video' && (() => {
                const embedUrl = getYouTubeEmbedUrl(currentContent);
                return embedUrl ? (
                  <div className="aspect-video bg-gray-900 dark:bg-dark-800 rounded-xl overflow-hidden mb-4 shadow-lg dark:shadow-card transition-colors">
                    <iframe
                      src={embedUrl}
                      title={decodeEntities(currentContent.title)}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    ></iframe>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-900 dark:bg-dark-800 rounded-xl overflow-hidden mb-4 shadow-lg dark:shadow-card flex items-center justify-center transition-colors">
                    <div className="text-center">
                      <Video className="h-16 w-16 text-gray-400 dark:text-text-dark-muted mx-auto mb-4 transition-colors" />
                      <p className="text-gray-400 dark:text-text-dark-secondary transition-colors">
                        Video URL not available for this lesson
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Document content — embedded viewer, no download */}
              {currentContent.content_type === 'document' && (
                currentContent.document_url ? (
                  <div className="bg-gray-900 dark:bg-dark-800 rounded-xl overflow-hidden mb-4 shadow-lg dark:shadow-card transition-colors">
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-dark-700 text-sm text-gray-300">
                      <FileDown className="h-4 w-4 text-brand-blue" />
                      <span>{decodeEntities(currentContent.title)}</span>
                    </div>
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(currentContent.document_url)}&embedded=true`}
                      title={decodeEntities(currentContent.title)}
                      className="w-full border-0"
                      style={{ height: '80vh' }}
                    ></iframe>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden mb-4 shadow-lg dark:shadow-card p-8 text-center transition-colors">
                    <FileText className="h-16 w-16 text-gray-400 dark:text-text-dark-muted mx-auto mb-4 transition-colors" />
                    <p className="text-gray-600 dark:text-text-dark-secondary transition-colors">
                      Document not available for this lesson
                    </p>
                  </div>
                )
              )}

              {/* Article content */}
              {currentContent.content_type === 'article' && (
                <div className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden mb-4 shadow-lg dark:shadow-card transition-colors">
                  {currentContent.article_content ? (
                    <div
                      className="max-w-none p-6 sm:p-8 text-gray-800 dark:text-gray-200 leading-relaxed [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:dark:text-white [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:text-base [&_p]:leading-7 transition-colors"
                      dangerouslySetInnerHTML={{ __html: formatArticleContent(currentContent.article_content) }}
                    />
                  ) : (
                    <div className="p-8 text-center">
                      <AlignLeft className="h-16 w-16 text-gray-400 dark:text-text-dark-muted mx-auto mb-4 transition-colors" />
                      <p className="text-gray-600 dark:text-text-dark-secondary transition-colors">
                        Article content not available for this lesson
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback if content_type is missing */}
              {!['video', 'document', 'article'].includes(currentContent.content_type) && (
                <div className="aspect-video bg-gray-900 dark:bg-dark-800 rounded-xl overflow-hidden mb-4 shadow-lg dark:shadow-card flex items-center justify-center transition-colors">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 dark:text-text-dark-muted mx-auto mb-4 transition-colors" />
                    <p className="text-gray-400 dark:text-text-dark-secondary transition-colors">
                      No content available for this lesson
                    </p>
                  </div>
                </div>
              )}

              {/* Lesson Title and Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                    {decodeEntities(currentContent.title)}
                  </h1>
                  {currentContent.duration_minutes && (
                    <p className="text-gray-600 dark:text-text-dark-secondary text-sm transition-colors">
                      Duration: {currentContent.duration_minutes} minutes
                    </p>
                  )}
                </div>

                {!isLessonCompleted(currentContent.id) && (
                  <Button
                    variant="primary"
                    onClick={handleMarkComplete}
                    loading={markingComplete}
                    leftIcon={<CheckCircle className="h-4 w-4" />}
                    className="whitespace-nowrap"
                  >
                    Mark as Complete
                  </Button>
                )}
                {isLessonCompleted(currentContent.id) && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg font-medium transition-colors">
                    <CheckCircle className="h-4 w-4" />
                    Completed
                  </div>
                )}
              </div>
            </div>

            {/* Tabs Section */}
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card mb-6 overflow-hidden transition-colors">
              {/* Tab Headers */}
              <div className="flex border-b border-gray-200 dark:border-border-dark">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all',
                    activeTab === 'overview'
                      ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5'
                      : 'text-gray-600 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Overview</span>
                </button>

                {currentContent.resources && (
                  <button
                    onClick={() => setActiveTab('resources')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all',
                      activeTab === 'resources'
                        ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5'
                        : 'text-gray-600 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
                    )}
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Resources</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('qa')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all',
                    activeTab === 'qa'
                      ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5'
                      : 'text-gray-600 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Q&A</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div>
                    {currentContent.description ? (
                      <>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-3 transition-colors">
                          About this lesson
                        </h2>
                        <p className="text-gray-600 dark:text-text-dark-secondary leading-relaxed whitespace-pre-wrap transition-colors">
                          {currentContent.description}
                        </p>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <BookOpen className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                        <p className="text-gray-600 dark:text-text-dark-secondary">
                          No description available for this lesson.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Resources Tab */}
                {activeTab === 'resources' && (
                  <div>
                    {currentContent.resources ? (
                      <>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2 transition-colors">
                          <Download className="h-5 w-5" />
                          Downloadable Resources
                        </h2>
                        <div className="space-y-3">
                          <a
                            href={currentContent.resources}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors group"
                          >
                            <FileText className="h-5 w-5 text-brand-blue" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-text-dark-primary group-hover:text-brand-blue transition-colors">
                                Lesson Resources
                              </p>
                              <p className="text-sm text-gray-500 dark:text-text-dark-muted">
                                Click to download
                              </p>
                            </div>
                            <Download className="h-5 w-5 text-gray-400 group-hover:text-brand-blue transition-colors" />
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Download className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                        <p className="text-gray-600 dark:text-text-dark-secondary">
                          No resources available for this lesson.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Q&A Tab */}
                {activeTab === 'qa' && (
                  <div>
                    <QuestionDiscussion contentId={currentContent.id} />
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 pb-8">
              <Button
                variant="outline"
                onClick={handlePreviousLesson}
                disabled={!hasPreviousLesson}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Previous Lesson
              </Button>

              <Button
                variant="primary"
                onClick={handleNextLesson}
                disabled={!hasNextLesson}
                rightIcon={<ChevronRight className="h-4 w-4" />}
              >
                Next Lesson
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
