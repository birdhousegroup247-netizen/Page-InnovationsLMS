import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminInstructorAPI } from '../../lib/api';
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Mail,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { Container, EmptyState } from '../../components/layout';
import { Button, Spinner, Alert, Badge } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function InstructorApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch applications based on filter
      const appsResponse = await adminInstructorAPI.getAllApplications(filter);
      setApplications(appsResponse.data.data.applications);

      // Fetch stats
      const statsResponse = await adminInstructorAPI.getStats();
      setStats(statsResponse.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, userName) => {
    if (!window.confirm(`Approve instructor application for ${userName}?`)) {
      return;
    }

    setProcessingId(userId);
    setError('');
    try {
      await adminInstructorAPI.approveApplication(userId);
      setSuccessMessage(`${userName} has been approved as an instructor!`);
      fetchData(); // Refresh list
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId, userName) => {
    const reason = window.prompt(`Reject instructor application for ${userName}?\n\nOptional reason for rejection:`);
    if (reason === null) return; // User cancelled

    setProcessingId(userId);
    setError('');
    try {
      await adminInstructorAPI.rejectApplication(userId, reason);
      setSuccessMessage(`Application from ${userName} has been rejected.`);
      fetchData(); // Refresh list
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject application');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (userId, userName) => {
    const reason = window.prompt(`Revoke instructor status for ${userName}?\n\nReason for revocation (required):`);
    if (!reason || reason.trim() === '') return;

    setProcessingId(userId);
    setError('');
    try {
      await adminInstructorAPI.revokeInstructor(userId, reason);
      setSuccessMessage(`Instructor status revoked for ${userName}.`);
      fetchData(); // Refresh list
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke instructor status');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
    };
    return variants[status] || 'secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  Instructor Applications
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  Manage instructor verification and approval
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1 transition-colors">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1 transition-colors">Approved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1 transition-colors">Rejected</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1 transition-colors">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-blue" />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 animate-slide-up">
            <Alert variant="danger" onClose={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 animate-slide-up">
            <Alert variant="success" onClose={() => setSuccessMessage('')}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {successMessage}
              </div>
            </Alert>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: 'pending', label: 'Pending', count: stats.pending },
            { value: 'approved', label: 'Approved', count: stats.approved },
            { value: 'rejected', label: 'Rejected', count: stats.rejected },
            { value: '', label: 'All', count: stats.total },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                filter === tab.value
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-700'
              )}
            >
              {tab.label}
              <span className={cn(
                'ml-2 px-2 py-0.5 rounded-full text-xs',
                filter === tab.value
                  ? 'bg-white/20'
                  : 'bg-gray-200 dark:bg-dark-900/50'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading applications...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && applications.length === 0 && (
          <EmptyState
            icon={<Users className="w-16 h-16" />}
            title="No applications found"
            description={
              filter === 'pending'
                ? 'There are no pending instructor applications'
                : 'Try changing the filter to see more applications'
            }
          />
        )}

        {/* Applications List */}
        {!loading && applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white font-medium text-lg flex-shrink-0">
                        {app.full_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-1 transition-colors">
                          {app.full_name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant={getStatusVariant(app.instructor_status)}>
                            {app.instructor_status}
                          </Badge>
                          {app.role === 'instructor' && (
                            <Badge variant="primary">Instructor</Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-text-dark-secondary transition-colors">
                            <Mail className="w-4 h-4" />
                            <span>{app.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-text-dark-secondary transition-colors">
                            <Calendar className="w-4 h-4" />
                            <span>Applied: {formatDate(app.created_at)}</span>
                          </div>
                        </div>

                        {app.bio && (
                          <p className="mt-3 text-sm text-gray-600 dark:text-text-dark-secondary line-clamp-2 transition-colors">
                            {app.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:ml-4">
                    {app.instructor_status === 'pending' && (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(app.id, app.full_name)}
                          disabled={processingId === app.id}
                          loading={processingId === app.id}
                          leftIcon={!processingId && <UserCheck className="w-4 h-4" />}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleReject(app.id, app.full_name)}
                          disabled={processingId === app.id}
                          loading={processingId === app.id}
                          leftIcon={!processingId && <UserX className="w-4 h-4" />}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {app.instructor_status === 'approved' && app.role === 'instructor' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleRevoke(app.id, app.full_name)}
                        disabled={processingId === app.id}
                        loading={processingId === app.id}
                        leftIcon={!processingId && <UserX className="w-4 h-4" />}
                      >
                        Revoke
                      </Button>
                    )}
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
