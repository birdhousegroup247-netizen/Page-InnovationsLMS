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
import { Button, Spinner, Alert, Badge, Modal, Input } from '../../components/ui';
import emptyApplications from '../../assets/empty-applications.svg';
import { cn } from '../../utils/cn';

export default function InstructorApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ pending: 0, under_review: 0, approved: 0, rejected: 0, revoked: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState({ open: false, type: '', userId: null, userName: '', reason: '' });
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

  const handleApprove = (userId, userName) =>
    setActionModal({ open: true, type: 'approve', userId, userName, reason: '' });

  const handleReject = (userId, userName) =>
    setActionModal({ open: true, type: 'reject', userId, userName, reason: '' });

  const handleRevoke = (userId, userName) =>
    setActionModal({ open: true, type: 'revoke', userId, userName, reason: '' });

  const confirmAction = async () => {
    const { type, userId, userName, reason } = actionModal;
    if (type === 'revoke' && !reason.trim()) {
      setError('Reason is required for revoking instructor status');
      return;
    }
    setActionModal((m) => ({ ...m, open: false }));
    setProcessingId(userId);
    setError('');
    try {
      if (type === 'approve') {
        await adminInstructorAPI.approveApplication(userId);
        setSuccessMessage(`${userName} has been approved as an instructor!`);
      } else if (type === 'reject') {
        await adminInstructorAPI.rejectApplication(userId, reason);
        setSuccessMessage(`Application from ${userName} has been rejected.`);
      } else if (type === 'revoke') {
        await adminInstructorAPI.revokeInstructor(userId, reason);
        setSuccessMessage(`Instructor status revoked for ${userName}.`);
      }
      fetchData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${type} application`);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusVariant = (status) => {
    const variants = {
      pending: 'warning',
      under_review: 'info',
      approved: 'success',
      rejected: 'danger',
      revoked: 'danger',
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
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1 transition-colors">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1 transition-colors">Approved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{stats.approved}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1 transition-colors">Rejected</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1 transition-colors">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{stats.total}</p>
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
            { value: 'under_review', label: 'Under Review', count: stats.under_review },
            { value: 'approved', label: 'Approved', count: stats.approved },
            { value: 'rejected', label: 'Rejected', count: stats.rejected },
            { value: 'revoked', label: 'Revoked', count: stats.revoked },
            { value: '', label: 'All', count: stats.total },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                filter === tab.value
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'bg-gray-100 dark:bg-dark-800 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-700'
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
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium transition-colors">
              Loading applications...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && applications.length === 0 && (
          <EmptyState
            image={emptyApplications}
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
            {applications.map((app) => {
              const user = app.user || {};
              return (
                <div key={app.id} className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white font-medium text-lg flex-shrink-0">
                          {(user.full_name || 'U').charAt(0).toUpperCase()}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 transition-colors">
                            {user.full_name || 'Unknown User'}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge variant={getStatusVariant(app.status)}>
                              {app.status}
                            </Badge>
                            {user.role === 'instructor' && (
                              <Badge variant="primary">Instructor</Badge>
                            )}
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 transition-colors">
                              <Mail className="w-4 h-4" />
                              <span>{user.email || 'No email'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 transition-colors">
                              <Calendar className="w-4 h-4" />
                              <span>Applied: {formatDate(app.applied_at || app.created_at)}</span>
                            </div>
                            {app.reviewed_at && (
                              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 transition-colors">
                                <CheckCircle className="w-4 h-4" />
                                <span>Reviewed: {formatDate(app.reviewed_at)}</span>
                                {app.reviewer && <span className="text-xs">by {app.reviewer.full_name}</span>}
                              </div>
                            )}
                          </div>

                          {/* Application Details */}
                          {(app.bio || app.qualifications || app.teaching_experience || app.subject_expertise) && (
                            <div className="mt-4 space-y-2 text-sm">
                              {app.bio && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-white">Bio:</span>
                                  <p className="text-gray-600 dark:text-gray-400 mt-1">{app.bio}</p>
                                </div>
                              )}
                              {app.qualifications && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-white">Qualifications:</span>
                                  <p className="text-gray-600 dark:text-gray-400 mt-1">{app.qualifications}</p>
                                </div>
                              )}
                              {app.teaching_experience && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-white">Teaching Experience:</span>
                                  <p className="text-gray-600 dark:text-gray-400 mt-1">{app.teaching_experience}</p>
                                </div>
                              )}
                              {app.subject_expertise && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-white">Subject Expertise:</span>
                                  <p className="text-gray-600 dark:text-gray-400 mt-1">{app.subject_expertise}</p>
                                </div>
                              )}
                              {app.portfolio_url && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-white">Portfolio:</span>
                                  <a
                                    href={app.portfolio_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-blue hover:underline ml-2"
                                  >
                                    {app.portfolio_url}
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Rejection Reason */}
                          {app.rejection_reason && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <span className="font-medium text-red-700 dark:text-red-400 text-sm">Rejection Reason:</span>
                              <p className="text-red-600 dark:text-red-300 text-sm mt-1">{app.rejection_reason}</p>
                            </div>
                          )}

                          {/* Admin Notes */}
                          {app.admin_notes && (
                            <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <span className="font-medium text-yellow-700 dark:text-yellow-400 text-sm">Admin Notes:</span>
                              <p className="text-yellow-600 dark:text-yellow-300 text-sm mt-1">{app.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:ml-4">
                      {app.status === 'pending' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApprove(app.id, user.full_name)}
                            disabled={processingId === app.id}
                            loading={processingId === app.id}
                            leftIcon={!processingId && <UserCheck className="w-4 h-4" />}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReject(app.id, user.full_name)}
                            disabled={processingId === app.id}
                            loading={processingId === app.id}
                            leftIcon={!processingId && <UserX className="w-4 h-4" />}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {app.status === 'approved' && user.role === 'instructor' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRevoke(app.id, user.full_name)}
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
              );
            })}
          </div>
        )}
      </Container>

      {/* Approve / Reject / Revoke Confirmation Modal */}
      <Modal
        isOpen={actionModal.open}
        onClose={() => setActionModal((m) => ({ ...m, open: false }))}
        title={
          actionModal.type === 'approve' ? 'Approve Application'
          : actionModal.type === 'reject' ? 'Reject Application'
          : 'Revoke Instructor Status'
        }
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-4">
          {actionModal.type === 'approve' && `Approve instructor application for ${actionModal.userName}?`}
          {actionModal.type === 'reject' && `Reject instructor application for ${actionModal.userName}?`}
          {actionModal.type === 'revoke' && `Revoke instructor status for ${actionModal.userName}? This will downgrade them to a student.`}
        </p>
        {(actionModal.type === 'reject' || actionModal.type === 'revoke') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">
              Reason {actionModal.type === 'revoke' ? '(required)' : '(optional)'}
            </label>
            <textarea
              value={actionModal.reason}
              onChange={(e) => setActionModal((m) => ({ ...m, reason: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              placeholder={`Reason for ${actionModal.type}ing...`}
            />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setActionModal((m) => ({ ...m, open: false }))}>Cancel</Button>
          <Button
            variant={actionModal.type === 'approve' ? 'success' : 'danger'}
            onClick={confirmAction}
          >
            {actionModal.type === 'approve' ? 'Approve' : actionModal.type === 'reject' ? 'Reject' : 'Revoke'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
