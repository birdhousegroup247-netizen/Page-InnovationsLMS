import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { XCircle, RotateCcw, BookOpen } from 'lucide-react';
import logo from '../assets/logo.png';

export default function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course_id');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8">
        <img src={logo} alt="Page Innovations" className="h-10 w-auto mx-auto" />
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Cancelled
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          No worries — your payment was cancelled and you haven't been charged. You can try again
          whenever you're ready.
        </p>

        <div className="space-y-3">
          {courseId && (
            <button
              onClick={() => navigate(`/checkout?course_id=${courseId}`)}
              className="flex items-center justify-center gap-2 w-full py-3 bg-brand-blue hover:bg-brand-blue-600 text-white font-semibold rounded-xl transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Try Again
            </button>
          )}
          <Link
            to="/courses"
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            Browse Courses
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
        Need help?{' '}
        <a href="mailto:support@pageinnovation.com" className="text-brand-blue hover:underline">
          Contact Support
        </a>
      </p>
    </div>
  );
}
