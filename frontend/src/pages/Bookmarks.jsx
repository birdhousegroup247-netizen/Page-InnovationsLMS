import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Bookmark, Trash2, BookOpen, FileText, ArrowLeft, CheckCircle } from 'lucide-react';
import { bookmarksAPI } from '../lib/api';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, Badge, Alert, Modal } from '../components/ui';
import emptyBookmarks from '../assets/empty-bookmarks.svg';
import { cn } from '../utils/cn';

export default function Bookmarks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, lessons, articles
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchBookmarks();
  }, [filter]);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      setError('');

      let lessonBookmarks = [];
      let articleBookmarks = [];

      // Fetch bookmarks in parallel for better performance
      const promises = [];

      if (filter === 'all' || filter === 'lessons') {
        promises.push(
          bookmarksAPI.getLessonBookmarks()
            .then(res => res.data.data.bookmarks.map(b => ({ ...b, type: 'lesson' })))
            .catch(err => {
              console.error('Error fetching lesson bookmarks:', err);
              return []; // Return empty array on error
            })
        );
      }

      if (filter === 'all' || filter === 'articles') {
        promises.push(
          bookmarksAPI.getArticleBookmarks()
            .then(res => res.data.data.bookmarks.map(b => ({ ...b, type: 'article' })))
            .catch(err => {
              console.error('Error fetching article bookmarks:', err);
              return []; // Return empty array on error
            })
        );
      }

      const results = await Promise.all(promises);
      const allBookmarks = results.flat().sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setBookmarks(allBookmarks);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
      setError('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (bookmark) => {
    setDeleteTarget(bookmark);
  };

  const confirmDelete = async () => {
    try {
      if (deleteTarget.type === 'lesson') {
        await bookmarksAPI.deleteLessonBookmark(deleteTarget.id);
      } else {
        await bookmarksAPI.deleteArticleBookmark(deleteTarget.id);
      }
      setDeleteTarget(null);
      setSuccess('Bookmark removed');
      fetchBookmarks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting bookmark:', err);
      setError('Failed to remove bookmark');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const filterOptions = [
    { value: 'all', label: 'All', count: bookmarks.length },
    { value: 'lessons', label: 'Lessons', count: bookmarks.filter(b => b.type === 'lesson').length },
    { value: 'articles', label: 'Articles', count: bookmarks.filter(b => b.type === 'article').length },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Bookmark className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  Saved Lessons
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  {bookmarks.length} saved {bookmarks.length === 1 ? 'item' : 'items'} — lessons and articles you bookmarked while learning
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 animate-slide-up">
            <Alert variant="success" onClose={() => setSuccess('')}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {success}
              </div>
            </Alert>
          </div>
        )}
        {error && (
          <div className="mb-6 animate-slide-up">
            <Alert variant="danger" onClose={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                filter === option.value
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-600'
              )}
            >
              {option.label}
              <span className="ml-2 opacity-75">({option.count})</span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading bookmarks...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && bookmarks.length === 0 && (
          <EmptyState
            image={emptyBookmarks}
            icon={<Bookmark className="w-16 h-16" />}
            title="No bookmarks yet"
            description="Save lessons and articles to find them here later"
            actionLabel="Browse Courses"
            onAction={() => navigate('/courses')}
          />
        )}

        {/* Bookmarks List */}
        {!loading && bookmarks.length > 0 && (
          <div className="space-y-4">
            {bookmarks.map((bookmark) => (
              <div
                key={`${bookmark.type}-${bookmark.id}`}
                className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-elevated transition-all animate-slide-up"
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
                    bookmark.type === 'lesson'
                      ? 'bg-brand-blue/10 text-brand-blue'
                      : 'bg-brand-purple/10 text-brand-purple'
                  )}>
                    {bookmark.type === 'lesson' ? (
                      <BookOpen className="h-6 w-6" />
                    ) : (
                      <FileText className="h-6 w-6" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary transition-colors">
                            {bookmark.title || bookmark.ModuleContent?.title || bookmark.Article?.title || 'Untitled'}
                          </h3>
                          <Badge variant={bookmark.type === 'lesson' ? 'primary' : 'secondary'}>
                            {bookmark.type}
                          </Badge>
                        </div>
                        {bookmark.notes && (
                          <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-3 transition-colors">
                            {bookmark.notes}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-text-dark-muted transition-colors">
                          Saved on {formatDate(bookmark.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4">
                      <Link
                        to={bookmark.type === 'lesson'
                          ? `/courses/${bookmark.ModuleContent?.module?.course_id}/learn?content=${bookmark.content_id}`
                          : `/knowledge/${bookmark.article_id}`
                        }
                      >
                        <Button variant="primary" size="sm">
                          View {bookmark.type === 'lesson' ? 'Lesson' : 'Article'}
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(bookmark)}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Bookmark"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to remove this bookmark?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Remove Bookmark</Button>
        </div>
      </Modal>
    </>
  );
}
