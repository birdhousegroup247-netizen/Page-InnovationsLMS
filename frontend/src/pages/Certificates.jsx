import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Award, Download, Share2, ArrowLeft, ExternalLink, Copy, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, Badge } from '../components/ui';
import { cn } from '../utils/cn';

export default function Certificates() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/certificates');
      setCertificates(response.data.data.certificates || []);
    } catch (err) {
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificateId) => {
    try {
      window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/certificates/${certificateId}/download`, '_blank');
    } catch (err) {
      console.error('Error downloading certificate:', err);
    }
  };

  const handleCopyVerification = (certId) => {
    const verificationUrl = `${window.location.origin}/verify/${certId}`;
    navigator.clipboard.writeText(verificationUrl);
    setCopiedId(certId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  My Certificates
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  {certificates.length} earned {certificates.length === 1 ? 'certificate' : 'certificates'}
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading certificates...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && certificates.length === 0 && (
          <EmptyState
            icon={<Award className="w-16 h-16" />}
            title="No certificates yet"
            description="Complete courses to earn certificates and showcase your achievements"
            actionLabel="Browse Courses"
            onAction={() => navigate('/courses')}
          />
        )}

        {/* Certificates Grid */}
        {!loading && certificates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert, index) => (
              <div
                key={cert.id}
                className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm dark:shadow-card hover:shadow-lg dark:hover:shadow-elevated transition-all animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Certificate Header with gradient */}
                <div className="relative bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 p-6">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <Award className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">
                        {cert.course_title || cert.Course?.title || 'Certificate of Completion'}
                      </h3>
                      <p className="text-white/90 text-sm">
                        Issued on {formatDate(cert.issued_date || cert.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Certificate Body */}
                <div className="p-6">
                  {/* Certificate Details */}
                  <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 mb-4 transition-colors">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-text-dark-muted mb-1 text-xs transition-colors">
                          Certificate ID
                        </p>
                        <p className="text-gray-900 dark:text-text-dark-primary font-mono text-xs truncate transition-colors">
                          {cert.certificate_number || cert.id}
                        </p>
                      </div>
                      {cert.grade && (
                        <div>
                          <p className="text-gray-500 dark:text-text-dark-muted mb-1 text-xs transition-colors">
                            Final Grade
                          </p>
                          <p className="text-green-600 dark:text-green-400 font-bold transition-colors">
                            {cert.grade}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownload(cert.id)}
                        leftIcon={<Download className="h-4 w-4" />}
                        fullWidth
                      >
                        Download
                      </Button>
                      <Link to={`/certificates/${cert.id}`} className="w-full">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<ExternalLink className="h-4 w-4" />}
                          fullWidth
                        >
                          View
                        </Button>
                      </Link>
                    </div>

                    {/* Verification Link */}
                    <div className="pt-3 border-t border-gray-200 dark:border-border-dark transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 dark:text-text-dark-muted mb-1 transition-colors">
                            Verification URL
                          </p>
                          <p className="text-xs text-gray-700 dark:text-text-dark-secondary font-mono truncate transition-colors">
                            {window.location.origin}/verify/{cert.verification_code || cert.id}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyVerification(cert.verification_code || cert.id)}
                          className="flex-shrink-0"
                        >
                          {copiedId === (cert.verification_code || cert.id) ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
