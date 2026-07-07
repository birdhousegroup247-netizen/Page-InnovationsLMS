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
  Sparkles,
  FileText,
  MapPin,
  Phone,
  ExternalLink,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { Container, EmptyState, PageHeader } from '../../components/layout';
import { Button, Spinner, Alert, Badge, Modal, Input } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import emptyApplications from '../../assets/empty-applications.svg';
import { cn } from '../../utils/cn';

export default function InstructorApplications() {
  useAuth();
  const { showToast } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ pending: 0, under_review: 0, approved: 0, rejected: 0, revoked: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState({ open: false, type: '', userId: null, userName: '', reason: '' });
  const [successMessage, setSuccessMessage] = useState('');
  const [detailApp, setDetailApp] = useState(null); // application shown in the detail modal

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
      <PageHeader
        icon={Shield}
        title="Instructor Applications"
        subtitle="Manage instructor verification and approval"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (seeding) return;
              if (!window.confirm('Add 5 demo applications (Pending, Under Review, Approved, Rejected)? Re-running won\'t duplicate them.')) return;
              try {
                setSeeding(true);
                const res = await adminInstructorAPI.seedDemo();
                showToast(`Seeded ${res.data?.data?.created?.length || 0} demo applications`, 'success');
                fetchData();
              } catch (e) {
                showToast(e.response?.data?.message || 'Failed to seed demos', 'error');
              } finally {
                setSeeding(false);
              }
            }}
            leftIcon={<Sparkles className="h-4 w-4" />}
            className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            disabled={seeding}
          >
            {seeding ? 'Seeding…' : 'Seed demo'}
          </Button>
        }
      />

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
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl divide-y divide-gray-100 dark:divide-border-dark overflow-hidden transition-colors">
            {applications.map((app) => {
              const user = app.user || {};
              return (
                <div
                  key={app.id}
                  onClick={() => setDetailApp(app)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-dark-700/50 cursor-pointer transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white font-medium flex-shrink-0">
                    {(user.full_name || 'U').charAt(0).toUpperCase()}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{user.full_name || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email || 'No email'}</p>
                  </div>

                  {/* Status + date */}
                  <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge variant={getStatusVariant(app.status)}>{app.status}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(app.applied_at || app.created_at)}</span>
                  </div>

                  {/* Quick actions (pending) + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {app.status === 'pending' && (
                      <>
                        <Button variant="success" size="sm" onClick={() => handleApprove(app.id, user.full_name)}
                          disabled={processingId === app.id} loading={processingId === app.id}
                          leftIcon={!processingId && <UserCheck className="w-4 h-4" />}>
                          Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleReject(app.id, user.full_name)}
                          disabled={processingId === app.id} loading={processingId === app.id}
                          leftIcon={!processingId && <UserX className="w-4 h-4" />}>
                          Reject
                        </Button>
                      </>
                    )}
                    {app.status === 'approved' && user.role === 'instructor' && (
                      <Button variant="danger" size="sm" onClick={() => handleRevoke(app.id, user.full_name)}
                        disabled={processingId === app.id} loading={processingId === app.id}
                        leftIcon={!processingId && <UserX className="w-4 h-4" />}>
                        Revoke
                      </Button>
                    )}
                    <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>

      {/* Application detail modal — everything about the applicant */}
      <Modal isOpen={!!detailApp} onClose={() => setDetailApp(null)} title="Instructor application" size="lg">
        {detailApp && (() => {
          const u = detailApp.user || {};
          const Row = ({ icon: Icon, label, children }) => (
            <div className="py-3 border-b border-gray-100 dark:border-border-dark last:border-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                {Icon && <Icon className="w-3.5 h-3.5" />}{label}
              </div>
              <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{children || '—'}</div>
            </div>
          );
          return (
            <div>
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white font-semibold text-xl">
                  {(u.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{u.full_name || 'Unknown'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={getStatusVariant(detailApp.status)}>{detailApp.status}</Badge>
                    <span className="text-xs text-gray-400">Applied {formatDate(detailApp.applied_at || detailApp.created_at)}</span>
                  </div>
                </div>
              </div>

              <div className="max-h-[55vh] overflow-y-auto pr-1">
                <Row icon={Mail} label="Email">{u.email}</Row>
                <Row icon={Phone} label="Phone">{u.phone}</Row>
                <Row icon={MapPin} label="Address">{detailApp.address}</Row>
                <Row label="Bio">{detailApp.bio}</Row>
                <Row label="Qualifications">{detailApp.qualifications}</Row>
                <Row label="Teaching experience">{detailApp.teaching_experience}</Row>
                <Row label="Subjects / expertise">{detailApp.subject_expertise}</Row>
                <Row icon={ExternalLink} label="Portfolio">
                  {detailApp.portfolio_url
                    ? <a href={detailApp.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline break-all">{detailApp.portfolio_url}</a>
                    : null}
                </Row>
                <Row icon={FileText} label="CV / Resume">
                  {detailApp.cv_url
                    ? <a href={detailApp.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-blue hover:underline"><FileText className="w-4 h-4" /> View / download CV</a>
                    : null}
                </Row>
                <Row icon={FileText} label={`Certificates / credentials (${(detailApp.credential_urls || []).length})`}>
                  {(detailApp.credential_urls || []).length > 0 ? (
                    <ul className="space-y-1">
                      {detailApp.credential_urls.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-blue hover:underline"><FileText className="w-4 h-4" /> Document {i + 1}</a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Row>
                {detailApp.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <span className="font-medium text-red-700 dark:text-red-400 text-sm">Rejection reason:</span>
                    <p className="text-red-600 dark:text-red-300 text-sm mt-1">{detailApp.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {detailApp.status === 'pending' && (
                <div className="flex gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-border-dark">
                  <Button variant="success" fullWidth leftIcon={<UserCheck className="w-4 h-4" />}
                    onClick={() => { setDetailApp(null); handleApprove(detailApp.id, u.full_name); }}>
                    Approve
                  </Button>
                  <Button variant="danger" fullWidth leftIcon={<UserX className="w-4 h-4" />}
                    onClick={() => { setDetailApp(null); handleReject(detailApp.id, u.full_name); }}>
                    Reject
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

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
