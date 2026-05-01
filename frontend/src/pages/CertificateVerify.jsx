import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Award, Calendar, BookOpen, User } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CertificateVerify() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/api/certificates/verify/${id}`)
      .then((res) => setCert(res.data.data.certificate))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex flex-col items-center justify-center p-6">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 p-8 max-w-lg w-full text-center">
        {notFound ? (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Certificate Not Found</h1>
            <p className="text-gray-500 dark:text-text-secondary text-sm">
              This certificate ID is invalid or does not exist. If you believe this is an error, please contact support.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <span className="text-green-600 dark:text-green-400 font-semibold text-lg">Verified</span>
            </div>
            <Award className="w-16 h-16 text-brand-blue mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Certificate of Completion</h1>
            <p className="text-gray-500 dark:text-text-secondary text-sm mb-6">This certificate is authentic and was issued by TekyPro</p>

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-xl">
                <User className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Student</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{cert.student?.full_name || cert.student_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-xl">
                <BookOpen className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Course</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{cert.course?.title || cert.course_title}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-xl">
                <Calendar className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">Issue Date</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(cert.issue_date || cert.created_at).toLocaleDateString('en-US', { dateStyle: 'long' })}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 dark:text-text-secondary mt-6 font-mono break-all">
              ID: {cert.certificate_id}
            </p>
          </>
        )}

        <Link to="/" className="inline-block mt-6 text-sm text-brand-blue hover:underline">
          TekyPro LMS
        </Link>
      </div>
    </div>
  );
}
