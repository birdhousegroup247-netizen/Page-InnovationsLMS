import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Globe, Linkedin, Github, Calendar, Cake,
  Shield, BookOpen, Award, CreditCard, GraduationCap, Send, RefreshCw, Trash2,
  CheckCircle, XCircle, Save, Edit3,
} from 'lucide-react';
import { adminUsersAPI } from '../../lib/api';
import { Container, PageHeader } from '../../components/layout';
import { Button, Spinner, Alert, Badge, Avatar } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';

// Full-page user view. Replaces the old modal so the admin can deep
// link, share URLs, and see everything about a user without a
// scrolling popup. Sections (not tabs) so the whole record is one
// scroll — admins triage faster that way.
export default function AdminUserDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);
  const [data, setData] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: '',
    status: '',
    phone: '',
    bio: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminUsersAPI.getById(userId);
      const payload = res?.data?.data || {};
      setData(payload);
      const u = payload.user || {};
      setForm({
        full_name: u.full_name || '',
        email: u.email || '',
        role: u.role || '',
        status: u.status || (u.is_active ? 'active' : 'inactive'),
        phone: u.phone || '',
        bio: u.bio || '',
      });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const u = data?.user;
  const stats = data?.stats || {};
  const enrollments = data?.recent_enrollments || [];
  const payments = data?.recent_payments || [];
  const isSelf = u && currentUser && u.id === currentUser.id;
  const roleLower = (u?.role || '').toLowerCase();

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
  const fmtMoney = (n, c = 'USD') => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(Number(n || 0)); }
    catch { return `$${Number(n || 0).toFixed(2)}`; }
  };

  const roleVariant = useMemo(() => ({
    super_admin: 'danger', admin: 'info', instructor: 'success', student: 'secondary',
  }[roleLower] || 'secondary'), [roleLower]);

  const onSave = async () => {
    setActing(true);
    try {
      await adminUsersAPI.update(userId, form);
      showToast('User updated', 'success');
      setEditMode(false);
      load();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Update failed', 'error');
    } finally {
      setActing(false);
    }
  };

  const onSendReset = async () => {
    if (!window.confirm(`Send a password reset email to ${u.email}?`)) return;
    setActing(true);
    try {
      await adminUsersAPI.sendPasswordReset(u.id);
      showToast('Password reset email sent', 'success');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to send reset', 'error');
    } finally { setActing(false); }
  };

  const onSendVerification = async () => {
    setActing(true);
    try {
      await adminUsersAPI.sendVerificationEmail(u.id);
      showToast('Verification email sent', 'success');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed to send verification', 'error');
    } finally { setActing(false); }
  };

  const onToggleActive = async () => {
    const next = u.is_active === false ? true : false;
    if (!window.confirm(`${next ? 'Activate' : 'Deactivate'} ${u.full_name || u.email}?`)) return;
    setActing(true);
    try {
      if (next) {
        await adminUsersAPI.activate(u.id);
      } else {
        await adminUsersAPI.update(u.id, { status: 'inactive' });
      }
      showToast(`User ${next ? 'activated' : 'deactivated'}`, 'success');
      load();
    } catch (e) {
      showToast(e?.response?.data?.message || 'Failed', 'error');
    } finally { setActing(false); }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete ${u.full_name || u.email}? This cannot be undone.`)) return;
    setActing(true);
    try {
      await adminUsersAPI.delete(u.id);
      showToast('User deleted', 'success');
      navigate('/users');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Delete failed', 'error');
      setActing(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-20 flex justify-center"><Spinner size="lg" /></Container>
    );
  }
  if (error || !u) {
    return (
      <Container className="py-8">
        <Alert variant="danger">{error || 'User not found'}</Alert>
        <Button className="mt-4" onClick={() => navigate('/users')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Users
        </Button>
      </Container>
    );
  }

  return (
    <>
      <PageHeader
        icon={Shield}
        title="User Profile"
        subtitle={u.email}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/users')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
          >
            Back to Users
          </Button>
        }
      />

      <Container className="py-8 space-y-6">

        {/* Identity card */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 sm:p-7">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <Avatar src={u.profile_picture} alt={u.full_name} size="xl" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {u.full_name || '(no name)'}
                </h2>
                {isSelf && <span className="text-xs text-brand-blue font-medium">(You)</span>}
              </div>
              <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-3">{u.email}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={roleVariant}>{(u.role || '').replace('_', ' ')}</Badge>
                <Badge variant={u.is_active === false ? 'danger' : 'success'}>
                  {u.is_active === false ? 'Inactive' : 'Active'}
                </Badge>
                {u.email_verified ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" /> Email verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <XCircle className="w-3 h-3" /> Email not verified
                  </span>
                )}
                {u.display_name && (
                  <span className="text-xs text-gray-500 dark:text-text-dark-muted">Display name: {u.display_name}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats — adapts to role */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {roleLower === 'student' && (
            <StatTile icon={BookOpen} tint="blue"   label="Enrollments" value={stats.enrollments ?? 0} />
          )}
          {roleLower === 'student' && (
            <StatTile icon={Award} tint="purple" label="Certificates" value={stats.certificates ?? 0} />
          )}
          {(roleLower === 'instructor' || roleLower === 'admin' || roleLower === 'super_admin') && (
            <StatTile icon={GraduationCap} tint="green"  label="Courses created" value={stats.coursesCreated ?? 0} />
          )}
          <StatTile icon={CreditCard} tint="amber" label="Payments" value={stats.payments_count ?? 0} />
          <StatTile icon={CreditCard} tint="rose"  label="Total spent" value={fmtMoney(stats.total_spent || 0)} />
        </div>

        {/* Quick actions */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-5 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={acting} leftIcon={<Send className="w-4 h-4" />} onClick={onSendReset}>
            Send password reset
          </Button>
          {!u.email_verified && (
            <Button size="sm" variant="outline" disabled={acting} leftIcon={<Mail className="w-4 h-4" />} onClick={onSendVerification}>
              Send verification
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={acting || isSelf} leftIcon={<RefreshCw className="w-4 h-4" />} onClick={onToggleActive}>
            {u.is_active === false ? 'Activate' : 'Deactivate'}
          </Button>
          {!editMode ? (
            <Button size="sm" variant="primary" leftIcon={<Edit3 className="w-4 h-4" />} onClick={() => setEditMode(true)}>
              Edit details
            </Button>
          ) : (
            <Button size="sm" variant="primary" disabled={acting} leftIcon={<Save className="w-4 h-4" />} onClick={onSave}>
              Save changes
            </Button>
          )}
          <div className="ml-auto" />
          {currentUser?.role === 'super_admin' && !isSelf && (
            <Button size="sm" variant="danger" disabled={acting} leftIcon={<Trash2 className="w-4 h-4" />} onClick={onDelete}>
              Delete user
            </Button>
          )}
        </div>

        {/* Profile details + (when editMode) inline edit */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 sm:p-7 space-y-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile details</h3>
          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EditableField label="Full Name *">
                <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputCls()} />
              </EditableField>
              <EditableField label="Email *">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls()} />
              </EditableField>
              <EditableField label="Role *">
                <select value={form.role} disabled={isSelf} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls()}>
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                  {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                </select>
              </EditableField>
              <EditableField label="Status *">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputCls()}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </EditableField>
              <EditableField label="Phone">
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls()} />
              </EditableField>
              <EditableField label="Bio" className="md:col-span-2">
                <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={inputCls('resize-none')} />
              </EditableField>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
              <ReadRow icon={Calendar} label="Joined" value={fmtDate(u.created_at)} />
              <ReadRow icon={Cake}     label="Date of Birth" value={u.date_of_birth ? fmtDate(u.date_of_birth) : '—'} />
              <ReadRow icon={Phone}    label="Phone" value={u.phone || '—'} />
              <ReadRow icon={MapPin}   label="Location" value={u.location || '—'} />
              <ReadRow icon={Globe}    label="Timezone" value={u.timezone || '—'} />
              <ReadRow icon={Globe}    label="Website" value={u.website || '—'} link={u.website} />
              <ReadRow icon={Linkedin} label="LinkedIn" value={u.linkedin_url || '—'} link={u.linkedin_url} />
              <ReadRow icon={Github}   label="GitHub"   value={u.github_url || '—'} link={u.github_url} />
              {u.bio && (
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-1">Bio</p>
                  <p className="text-sm text-gray-700 dark:text-text-dark-secondary whitespace-pre-wrap">{u.bio}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Enrollments (students) */}
        {roleLower === 'student' && (
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 sm:p-7">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-blue" />
              Recent enrollments
              <span className="text-xs font-normal text-gray-500 dark:text-text-dark-muted">({enrollments.length})</span>
            </h3>
            {enrollments.length === 0 ? (
              <EmptyHint>No course enrollments yet.</EmptyHint>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-border-dark">
                {enrollments.map((e) => (
                  <li key={e.id} className="py-3 flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-gray-100 dark:bg-dark-700 overflow-hidden flex-shrink-0">
                      {e.course?.thumbnail && /^(https?:)?\/\//.test(e.course.thumbnail) && (
                        <img src={e.course.thumbnail} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {e.course?.title || `Course #${e.course_id}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                        Enrolled {fmtDate(e.enrollment_date || e.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {Math.round(parseFloat(e.progress_percentage || 0))}%
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-text-dark-muted">
                        {e.completed_at ? 'Completed' : (e.progress_percentage > 0 ? 'In progress' : 'Not started')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Payments */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 sm:p-7">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-purple" />
            Recent payments
            <span className="text-xs font-normal text-gray-500 dark:text-text-dark-muted">({payments.length})</span>
          </h3>
          {payments.length === 0 ? (
            <EmptyHint>No payments on file.</EmptyHint>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-text-dark-muted border-b border-gray-200 dark:border-border-dark">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Course</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Provider</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-border-dark last:border-0">
                      <td className="py-2 pr-3 text-gray-700 dark:text-text-dark-secondary">{fmtDate(p.created_at)}</td>
                      <td className="py-2 pr-3 text-gray-900 dark:text-white truncate max-w-[14rem]">
                        {p.course?.title || (p.course_id ? `Course #${p.course_id}` : '—')}
                      </td>
                      <td className="py-2 pr-3 font-medium text-gray-900 dark:text-white">{fmtMoney(p.amount, p.currency || 'USD')}</td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-text-dark-secondary capitalize">{p.provider || '—'}</td>
                      <td className="py-2">
                        <Badge variant={p.status === 'paid' ? 'success' : (p.status === 'failed' ? 'danger' : 'warning')}>
                          {p.status || 'unknown'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}

const inputCls = (extra = '') =>
  `w-full px-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue ${extra}`;

function EditableField({ label, children, className }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">{label}</label>
      {children}
    </div>
  );
}

function ReadRow({ icon: Icon, label, value, link }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}{label}
      </p>
      {link && value !== '—' ? (
        <a href={link} target="_blank" rel="noreferrer" className="text-sm text-brand-blue hover:underline break-all">{value}</a>
      ) : (
        <p className="text-sm text-gray-900 dark:text-white break-words">{value}</p>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, tint, label, value }) {
  const tints = {
    blue:   'bg-blue-500/10 text-blue-600',
    purple: 'bg-brand-purple/10 text-brand-purple',
    green:  'bg-green-500/10 text-green-600',
    amber:  'bg-amber-500/10 text-amber-600',
    rose:   'bg-rose-500/10 text-rose-600',
  };
  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tints[tint] || tints.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-text-dark-muted">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ children }) {
  return <p className="text-sm text-gray-500 dark:text-text-dark-muted italic">{children}</p>;
}
