import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { coursesAPI, progressAPI, liveSessionsAPI, forumAPI, assignmentsAPI } from '../lib/api';
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
  StickyNote,
  Calendar,
  Link as LinkIcon,
  MessageSquare,
  ThumbsUp,
  Pin,
  Send,
  Trash2,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Button, Spinner } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import QuestionDiscussion from '../components/course/QuestionDiscussion';
import LessonNotes from '../components/course/LessonNotes';
import LockOverlay from '../components/ui/LockOverlay';
import RecordingPlayer from '../components/live-sessions/RecordingPlayer';
import SuspensionModal from '../components/ui/SuspensionModal';
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
  }
  return null;
}

// Extract just the YouTube video ID (for YT IFrame Player API)
function getYouTubeVideoId(content) {
  if (content.youtube_video_id) return content.youtube_video_id;
  if (content.youtube_url) {
    const match = content.youtube_url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/
    );
    if (match) return match[1];
  }
  return null;
}

// Convert Google Drive share URL to embed URL
function getGoogleDriveEmbedUrl(url) {
  const match = url.match(/\/file\/d\/([^/?\s]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  return null;
}

// Detect video source type
function getVideoType(content) {
  if (content.youtube_video_id) return 'youtube';
  const url = content.youtube_url || '';
  if (/(?:youtube\.com|youtu\.be)/i.test(url)) return 'youtube';
  if (/drive\.google\.com/i.test(url)) return 'gdrive';
  if (url) return 'direct';
  return null;
}

export default function CoursePlayer() {
  const { id } = useParams(); // Course ID
  const navigate = useNavigate();
  const { user, isPreview, isSuspended, installmentStage } = useAuth();
  const { showToast } = useToast();

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
  const [liveSessions, setLiveSessions] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [forumPosts, setForumPosts] = useState([]);
  const [forumPost, setForumPost] = useState(null);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [forumLoading, setForumLoading] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  // --- Progress tracking state ---
  const [ytApiLoaded, setYtApiLoaded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [articleRead, setArticleRead] = useState(false);
  const playerRef = useRef(null);
  const playerWrapperRef = useRef(null);
  const articleEndRef = useRef(null);
  const autoCompletedRef = useRef(new Set());

  useEffect(() => {
    fetchCourseData();
    fetchLiveSessions();
    fetchMyAssignments();
  }, [id]);

  const fetchLiveSessions = async () => {
    try {
      const res = await liveSessionsAPI.getByCourse(id);
      setLiveSessions(res.data.data.sessions || []);
    } catch {
      showToast('Failed to load live sessions', 'error');
    }
  };

  const fetchMyAssignments = async () => {
    try {
      const res = await assignmentsAPI.getStudentAssignments(id);
      setMyAssignments(res.data.data.assignments || []);
    } catch {
      showToast('Failed to load assignments', 'error');
    }
  };

  const fetchForumPosts = async () => {
    setForumLoading(true);
    try {
      const res = await forumAPI.getPosts(id);
      setForumPosts(res.data.data.posts || []);
    } catch {
      showToast('Failed to load forum posts', 'error');
    } finally {
      setForumLoading(false);
    }
  };

  const fetchForumPost = async (postId) => {
    try {
      const res = await forumAPI.getPost(postId);
      setForumPost(res.data.data.post);
    } catch {
      showToast('Failed to load post', 'error');
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    try {
      await forumAPI.createPost(id, { title: newPostTitle, content: newPostContent });
      setNewPostTitle(''); setNewPostContent(''); setShowNewPost(false);
      fetchForumPosts();
    } catch {
      showToast('Failed to create post', 'error');
    }
  };

  const handleAddReply = async (postId) => {
    if (!newReply.trim()) return;
    try {
      await forumAPI.addReply(postId, { content: newReply });
      setNewReply('');
      fetchForumPost(postId);
    } catch {
      showToast('Failed to post reply', 'error');
    }
  };

  // Load YouTube IFrame Player API once
  useEffect(() => {
    if (window.YT?.Player) { setYtApiLoaded(true); return; }
    window.onYouTubeIframeAPIReady = () => setYtApiLoaded(true);
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, []);

  // Reset tracking when switching lessons
  useEffect(() => {
    setVideoProgress(0);
    setVideoCurrentTime(0);
    setArticleRead(false);
  }, [currentContent?.id]);

  // YouTube player: create, track progress, save position, auto-complete
  useEffect(() => {
    if (!ytApiLoaded || !currentContent || currentContent.content_type !== 'video') return;
    const videoId = getYouTubeVideoId(currentContent);
    if (!videoId) return;

    const contentId = currentContent.id;
    const lastPos = progress[contentId]?.last_position_seconds || 0;
    const alreadyDone = isLessonCompleted(contentId);

    // Small delay to ensure wrapper div is in the DOM
    const initTimer = setTimeout(() => {
      if (!playerWrapperRef.current) return;
      if (playerRef.current?.destroy) { playerRef.current.destroy(); playerRef.current = null; }
      playerWrapperRef.current.innerHTML = '<div id="yt-player-el"></div>';

      try {
        playerRef.current = new window.YT.Player('yt-player-el', {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { modestbranding: 1, rel: 0, showinfo: 0, iv_load_policy: 3 },
          events: {
            onReady: (e) => {
              if (lastPos > 0 && !alreadyDone) {
                e.target.seekTo(lastPos, true);
                showToast('Resuming from where you left off', 'info', 3000);
              }
            },
          },
        });
      } catch (err) {
        console.error('YT Player init error:', err);
      }
    }, 200);

    // Poll playback position every 3s + auto-complete at 90%
    const trackInterval = setInterval(() => {
      try {
        if (playerRef.current?.getCurrentTime && playerRef.current?.getDuration) {
          const ct = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (dur > 0) {
            const pct = (ct / dur) * 100;
            setVideoProgress(pct);
            setVideoCurrentTime(ct);
            // Auto-complete at 90% — contentId is captured in this closure, so it's always correct
            if (pct >= 90 && !autoCompletedRef.current.has(contentId)) {
              autoCompletedRef.current.add(contentId);
              progressAPI.markComplete(contentId).then(() => {
                setProgress((prev) => ({
                  ...prev,
                  [contentId]: { completed: true, completed_at: new Date().toISOString() },
                }));
                showToast('Lesson completed!', 'success');
              }).catch((err) => {
                console.error('Video auto-complete failed:', err);
                autoCompletedRef.current.delete(contentId);
              });
            }
          }
        }
      } catch (_) {}
    }, 3000);

    // Save watch position to backend every 30s
    const saveInterval = setInterval(() => {
      try {
        if (playerRef.current?.getCurrentTime) {
          const s = Math.floor(playerRef.current.getCurrentTime());
          if (s > 0) {
            progressAPI.updateProgress(contentId, {
              watch_time_seconds: s,
              last_position_seconds: s,
            }).catch(() => {});
          }
        }
      } catch (_) {}
    }, 30000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(trackInterval);
      clearInterval(saveInterval);
      // Save final position on cleanup
      try {
        if (playerRef.current?.getCurrentTime) {
          const s = Math.floor(playerRef.current.getCurrentTime());
          if (s > 0) {
            progressAPI.updateProgress(contentId, {
              watch_time_seconds: s,
              last_position_seconds: s,
            }).catch(() => {});
          }
        }
        if (playerRef.current?.destroy) { playerRef.current.destroy(); playerRef.current = null; }
      } catch (_) {}
    };
  }, [ytApiLoaded, currentContent?.id]);

  // Article read tracking — observe sentinel at bottom of article + auto-complete
  useEffect(() => {
    if (!currentContent || currentContent.content_type !== 'article') return;
    const contentId = currentContent.id;
    let observer;
    const timer = setTimeout(() => {
      if (!articleEndRef.current) return;
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setArticleRead(true);
          // Auto-complete — contentId captured in closure
          if (!autoCompletedRef.current.has(contentId)) {
            autoCompletedRef.current.add(contentId);
            progressAPI.markComplete(contentId).then(() => {
              setProgress((prev) => ({
                ...prev,
                [contentId]: { completed: true, completed_at: new Date().toISOString() },
              }));
              showToast('Lesson completed!', 'success');
            }).catch((err) => {
              console.error('Article auto-complete failed:', err);
              autoCompletedRef.current.delete(contentId);
            });
          }
        }
      }, { threshold: 0.5 });
      observer.observe(articleEndRef.current);
    }, 200);
    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
  }, [currentContent?.id]);

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
        showToast('You must enroll in this course first', 'warning');
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
    // Skip if auto-complete already handled this lesson
    if (autoCompletedRef.current.has(currentContent.id)) return;

    setMarkingComplete(true);
    autoCompletedRef.current.add(currentContent.id);
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
      const msg = error.response?.data?.message || 'Failed to mark lesson as complete';
      showToast(msg, 'error');
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
      {/* Suspension modal for hard-locked / soft-locked users */}
      {(isSuspended || installmentStage === 'soft') && <SuspensionModal />}

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
                        ) : isPreview && !content.is_preview ? (
                          <Lock className={`h-5 w-5 ${isActive ? 'text-white/70' : 'text-gray-400 dark:text-text-dark-muted'}`} />
                        ) : !isPreview && content.is_drip_locked ? (
                          <Calendar className={`h-5 w-5 ${isActive ? 'text-white/70' : 'text-yellow-500'}`} title={`Unlocks ${content.drip_unlock_date}`} />
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
            <div className="mb-6 relative">
              {/* Lock overlay for preview-mode users on non-preview lessons */}
              {isPreview && !currentContent.is_preview && (
                <LockOverlay courseId={id} />
              )}
              {/* Drip lock overlay — lesson not yet unlocked by schedule */}
              {!isPreview && currentContent.is_drip_locked && (
                <LockOverlay variant="drip" unlockDate={currentContent.drip_unlock_date} />
              )}
              {/* Video content */}
              {currentContent.content_type === 'video' && (() => {
                const videoType = getVideoType(currentContent);
                const videoId = getYouTubeVideoId(currentContent);
                const embedUrl = getYouTubeEmbedUrl(currentContent);
                const driveUrl = videoType === 'gdrive' ? getGoogleDriveEmbedUrl(currentContent.youtube_url) : null;
                const directUrl = videoType === 'direct' ? currentContent.youtube_url : null;

                if (!videoType) {
                  return (
                    <div className="aspect-video bg-gray-900 dark:bg-dark-800 rounded-xl overflow-hidden mb-4 shadow-lg dark:shadow-card flex items-center justify-center transition-colors">
                      <div className="text-center">
                        <Video className="h-16 w-16 text-gray-400 dark:text-text-dark-muted mx-auto mb-4 transition-colors" />
                        <p className="text-gray-400 dark:text-text-dark-secondary transition-colors">
                          Video URL not available for this lesson
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="aspect-video bg-gray-900 dark:bg-dark-800 rounded-xl overflow-hidden mb-2 shadow-lg dark:shadow-card transition-colors">
                      {videoType === 'youtube' && ytApiLoaded && videoId ? (
                        <div ref={playerWrapperRef} className="w-full h-full" />
                      ) : videoType === 'youtube' ? (
                        <iframe
                          src={embedUrl}
                          title={decodeEntities(currentContent.title)}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        ></iframe>
                      ) : videoType === 'gdrive' ? (
                        <iframe
                          src={driveUrl}
                          title={decodeEntities(currentContent.title)}
                          className="w-full h-full"
                          allowFullScreen
                          allow="autoplay"
                        ></iframe>
                      ) : (
                        <video
                          src={directUrl}
                          className="w-full h-full"
                          controls
                          controlsList="nodownload"
                          title={decodeEntities(currentContent.title)}
                        />
                      )}
                    </div>
                    {/* Video watch progress bar (YouTube only — others use native controls) */}
                    {videoType === 'youtube' && !isLessonCompleted(currentContent.id) && videoProgress > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>{Math.round(videoProgress)}% watched</span>
                          {videoProgress >= 90 && <span className="text-green-500 font-medium">Completing...</span>}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-1.5">
                          <div
                            className={cn('h-1.5 rounded-full transition-all duration-500',
                              videoProgress >= 90 ? 'bg-green-500' : 'bg-brand-blue'
                            )}
                            style={{ width: `${Math.min(videoProgress, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </>
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
                    {(() => {
                      const url = decodeEntities(currentContent.document_url);
                      // Google Docs viewer renders PDFs/docs inline without download buttons
                      const viewerSrc = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
                      return (
                        <>
                          <iframe
                            src={viewerSrc}
                            title={decodeEntities(currentContent.title)}
                            className="w-full border-0"
                            style={{ height: '80vh' }}
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                          ></iframe>
                          <div className="px-4 py-2 bg-gray-800 dark:bg-dark-700 text-center">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-brand-blue hover:underline"
                            >
                              Having trouble viewing? Open in new tab
                            </a>
                          </div>
                        </>
                      );
                    })()}
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
                <>
                  <div className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden mb-2 shadow-lg dark:shadow-card transition-colors">
                    {currentContent.article_content ? (
                      <>
                        <div
                          className="max-w-none p-6 sm:p-8 text-gray-800 dark:text-gray-200 leading-relaxed [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:dark:text-white [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:text-base [&_p]:leading-7 transition-colors"
                          dangerouslySetInnerHTML={{ __html: formatArticleContent(currentContent.article_content) }}
                        />
                        {/* Sentinel — triggers auto-complete when scrolled into view */}
                        <div ref={articleEndRef} className="h-1" />
                      </>
                    ) : (
                      <div className="p-8 text-center">
                        <AlignLeft className="h-16 w-16 text-gray-400 dark:text-text-dark-muted mx-auto mb-4 transition-colors" />
                        <p className="text-gray-600 dark:text-text-dark-secondary transition-colors">
                          Article content not available for this lesson
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Reading progress hint */}
                  {!isLessonCompleted(currentContent.id) && currentContent.article_content && (
                    <p className={cn('text-xs font-medium mb-4',
                      articleRead ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'
                    )}>
                      {articleRead ? 'Article read — completing...' : 'Scroll to the end to complete this lesson'}
                    </p>
                  )}
                </>
              )}

              {/* Recorded class — instructor-uploaded recording of a
                  past live session. Drive / YouTube / Vimeo / Loom /
                  direct mp4 all detected by the player. */}
              {currentContent.content_type === 'recorded_class' && (
                <div className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden mb-4 p-4 sm:p-6 shadow-lg dark:shadow-card">
                  {currentContent.recording_url ? (
                    <RecordingPlayer url={currentContent.recording_url} title={currentContent.title} />
                  ) : (
                    <div className="aspect-video bg-gray-900 dark:bg-dark-700 rounded-xl flex items-center justify-center">
                      <p className="text-sm text-gray-300">No recording link added yet.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback if content_type is missing */}
              {!['video', 'document', 'article', 'recorded_class'].includes(currentContent.content_type) && (
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

                <button
                  onClick={() => setActiveTab('notes')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all',
                    activeTab === 'notes'
                      ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5'
                      : 'text-gray-600 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
                  )}
                >
                  <StickyNote className="w-4 h-4" />
                  <span className="hidden sm:inline">Notes</span>
                </button>

                <button
                  onClick={() => setActiveTab('grades')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all',
                    activeTab === 'grades'
                      ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5'
                      : 'text-gray-600 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
                  )}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Grades</span>
                  {myAssignments.some(a => a.submission?.status === 'graded') && (
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('sessions'); fetchLiveSessions(); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all',
                    activeTab === 'sessions'
                      ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5'
                      : 'text-gray-600 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
                  )}
                >
                  <Video className="w-4 h-4" />
                  <span className="hidden sm:inline">Live</span>
                  {liveSessions.some(s => s.status === 'live') && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>

                <button
                  onClick={() => { setActiveTab('forum'); fetchForumPosts(); }}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all',
                    activeTab === 'forum'
                      ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5'
                      : 'text-gray-600 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Forum</span>
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

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div className="-m-6">
                    <LessonNotes
                      contentId={currentContent.id}
                      currentTime={videoCurrentTime}
                      onSeek={(t) => playerRef.current?.seekTo?.(t, true)}
                    />
                  </div>
                )}

                {/* Grades Tab */}
                {activeTab === 'grades' && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-4">My Grades</h2>
                    {myAssignments.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-text-dark-muted text-sm">No assignments in this course yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myAssignments.map((assignment) => {
                          const sub = assignment.submission;
                          return (
                            <div key={assignment.id} className="border border-gray-200 dark:border-border-dark rounded-lg p-4 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-text-dark-primary text-sm">{assignment.title}</p>
                                  {assignment.due_date && (
                                    <p className="text-xs text-gray-400 dark:text-text-dark-muted">Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                                  )}
                                  {sub?.feedback && (
                                    <p className="text-xs text-gray-600 dark:text-text-dark-secondary mt-1 italic">Feedback: {sub.feedback}</p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {!sub ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400">Not submitted</span>
                                  ) : sub.status === 'graded' ? (
                                    <div>
                                      <span className="text-lg font-bold text-brand-blue">{sub.score}</span>
                                      <span className="text-xs text-gray-400 dark:text-text-dark-muted">/{assignment.max_score}</span>
                                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">Graded</div>
                                    </div>
                                  ) : (
                                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">Pending review</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Live Sessions Tab */}
                {activeTab === 'sessions' && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-4">Live Sessions</h2>
                    {liveSessions.length === 0 ? (
                      <div className="text-center py-8">
                        <Video className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-text-dark-muted text-sm">No sessions scheduled yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {liveSessions.map((session) => (
                          <div key={session.id} className="border border-gray-200 dark:border-border-dark rounded-lg p-4 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-gray-900 dark:text-text-dark-primary text-sm">{session.title}</p>
                                  {session.status === 'live' && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                                    </span>
                                  )}
                                  {session.status === 'ended' && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400">Ended</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 dark:text-text-dark-muted flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(session.scheduled_at).toLocaleString()} · {session.duration_minutes} min
                                </p>
                              </div>
                              {session.status !== 'ended' && (
                                <a
                                  href={session.meeting_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                                    session.status === 'live'
                                      ? 'bg-red-500 hover:bg-red-600 text-white'
                                      : 'bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue hover:bg-brand-blue/20'
                                  )}
                                >
                                  <LinkIcon className="w-3.5 h-3.5" />
                                  {session.status === 'live' ? 'Join Now' : 'Join'}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Forum Tab */}
                {activeTab === 'forum' && (
                  <div>
                    {forumPost ? (
                      // Post Detail View
                      <div>
                        <button onClick={() => setForumPost(null)} className="text-sm text-brand-blue hover:underline mb-4 flex items-center gap-1">
                          ← Back to posts
                        </button>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-1">{forumPost.title}</h2>
                        <p className="text-xs text-gray-400 dark:text-text-dark-muted mb-3">
                          by {forumPost.author?.full_name} · {new Date(forumPost.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-text-dark-secondary whitespace-pre-wrap mb-6">{forumPost.content}</p>
                        <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary text-sm mb-3">Replies ({forumPost.replies?.length || 0})</h3>
                        <div className="space-y-3 mb-4">
                          {(forumPost.replies || []).map((reply) => (
                            <div key={reply.id} className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 transition-colors">
                              <p className="text-xs text-gray-400 dark:text-text-dark-muted mb-1">{reply.author?.full_name}</p>
                              <p className="text-sm text-gray-700 dark:text-text-dark-secondary">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={newReply}
                            onChange={(e) => setNewReply(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                          />
                          <button
                            onClick={() => handleAddReply(forumPost.id)}
                            disabled={!newReply.trim()}
                            title={!newReply.trim() ? 'Write a reply first' : 'Send reply'}
                            className="p-2 rounded-lg bg-brand-blue text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Posts List View
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary">Discussion Forum</h2>
                          <button
                            onClick={() => setShowNewPost(!showNewPost)}
                            className="text-sm px-3 py-1.5 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            + New Post
                          </button>
                        </div>

                        {showNewPost && (
                          <div className="mb-4 p-4 border border-gray-200 dark:border-border-dark rounded-lg space-y-3 transition-colors">
                            <input
                              value={newPostTitle}
                              onChange={(e) => setNewPostTitle(e.target.value)}
                              placeholder="Post title"
                              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                            />
                            <textarea
                              value={newPostContent}
                              onChange={(e) => setNewPostContent(e.target.value)}
                              placeholder="What's on your mind?"
                              rows={3}
                              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors resize-none"
                            />
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setShowNewPost(false)} className="text-sm px-3 py-1.5 text-gray-600 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors">Cancel</button>
                              <button onClick={handleCreatePost} disabled={!newPostTitle.trim() || !newPostContent.trim()}
                                title={!newPostTitle.trim() || !newPostContent.trim() ? 'Add a title and content to post' : 'Publish post'}
                                className="text-sm px-3 py-1.5 bg-brand-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Post</button>
                            </div>
                          </div>
                        )}

                        {forumLoading ? (
                          <div className="flex justify-center py-8"><Spinner size="md" /></div>
                        ) : forumPosts.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageSquare className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-gray-500 dark:text-text-dark-muted text-sm">No posts yet. Start the conversation!</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {forumPosts.map((post) => (
                              <button
                                key={post.id}
                                onClick={() => fetchForumPost(post.id)}
                                className="w-full text-left p-4 border border-gray-200 dark:border-border-dark rounded-lg hover:border-brand-blue dark:hover:border-brand-blue transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    {post.is_pinned && <Pin className="w-3.5 h-3.5 text-brand-blue inline mr-1" />}
                                    <span className="font-medium text-gray-900 dark:text-text-dark-primary text-sm">{post.title}</span>
                                    <p className="text-xs text-gray-400 dark:text-text-dark-muted mt-0.5">
                                      {post.author?.full_name} · {post.reply_count || 0} replies
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
