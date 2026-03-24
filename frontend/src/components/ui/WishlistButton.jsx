import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { wishlistAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

/**
 * WishlistButton — heart toggle for any course card or detail page.
 * Props:
 *   courseId  (required) — the course id
 *   size      'sm' | 'md' (default 'md')
 *   className — extra classes
 */
export default function WishlistButton({ courseId, size = 'md', className }) {
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !courseId) return;
    wishlistAPI
      .check(courseId)
      .then((res) => setWishlisted(res.data.data.wishlisted))
      .catch(() => {});
  }, [courseId, user]);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || loading) return;

    setLoading(true);
    try {
      if (wishlisted) {
        await wishlistAPI.remove(courseId);
        setWishlisted(false);
      } else {
        await wishlistAPI.add(courseId);
        setWishlisted(true);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
  };
  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
      className={cn(
        'rounded-full bg-white/90 dark:bg-dark-800/90 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all shadow-sm',
        sizeClasses[size],
        loading && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      <Heart
        className={cn(
          iconSize[size],
          'transition-colors',
          wishlisted
            ? 'text-brand-red fill-brand-red'
            : 'text-gray-400 dark:text-text-dark-muted'
        )}
      />
    </button>
  );
}
