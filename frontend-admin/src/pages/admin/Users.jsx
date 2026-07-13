import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { adminUsersAPI, adminCoursesAPI } from '../../lib/api';
import { tokenStorage } from '../../utils/tokenStorage';
import {
  Users as UsersIcon,
  Search,
  Filter,
  MoreVertical,
  Shield,
  Lock,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  Plus,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
  FileUp,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  BookOpen,
  X,
  Crown,
} from 'lucide-react';
import { Container, PageHeader } from '../../components/layout';
import {
  Button,
  Input,
  Select,
  Table,
  Badge,
  Spinner,
  Modal,
  Avatar,
  Dropdown
} from '../../components/ui';
import { SimplePagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/layout';
import emptyUsers from '../../assets/empty-users.svg';
import { cn } from '../../utils/cn';
import { validateUserForm, formatErrors } from '../../utils/validation';

export default function Users() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState(null);

  // Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Assign-to-courses modal (only meaningful for instructors / admins)
  const [isAssignCoursesModalOpen, setIsAssignCoursesModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [teachingCourses, setTeachingCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [assignRole, setAssignRole] = useState('co');

  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    role: '',
    status: '',
    bio: '',
    phone: ''
  });

  // Create form state
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'student',
    phone: '',
    bio: ''
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [filters.page, filters.limit, filters.role, filters.status, filters.sortBy, filters.sortOrder]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== undefined) {
        fetchUsers();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminUsersAPI.getAll(filters);
      setUsers(response.data.data.users);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to load users. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminUsersAPI.getRolesStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleRoleChange = (e) => {
    setFilters(prev => ({ ...prev, role: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e) => {
    setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }));
  };

  const handleSort = (column) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const getSortIcon = (column) => {
    if (filters.sortBy !== column) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-30" />;
    return filters.sortOrder === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Bulk selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUsers(users.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleBulkSelectMode = () => {
    setBulkSelectMode(!bulkSelectMode);
    if (bulkSelectMode) {
      // Exiting bulk mode - clear selections
      setSelectedUsers([]);
    }
  };

  useEffect(() => {
    setShowBulkActions(selectedUsers.length > 0);
  }, [selectedUsers]);

  // Bulk actions
  const handleBulkActivate = async () => {
    try {
      setActionLoading(true);
      await Promise.all(selectedUsers.map(id => adminUsersAPI.activate(id)));
      showToast(`Successfully activated ${selectedUsers.length} user(s)`, 'success');
      setSelectedUsers([]);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error bulk activating users:', error);
      showToast('Failed to activate users. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      setActionLoading(true);
      await Promise.all(selectedUsers.map(id => adminUsersAPI.activate(id))); // Toggle activation
      showToast(`Successfully deactivated ${selectedUsers.length} user(s)`, 'success');
      setSelectedUsers([]);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error bulk deactivating users:', error);
      showToast('Failed to deactivate users. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = () => {
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setActionLoading(true);
      await Promise.all(selectedUsers.map(id => adminUsersAPI.delete(id)));
      showToast(`Successfully deleted ${selectedUsers.length} user(s)`, 'success');
      setSelectedUsers([]);
      setIsBulkDeleteModalOpen(false);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      showToast('Failed to delete users. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateUser = async (user) => {
    // Prevent self-deactivation
    if (user.id === currentUser?.id && user.status === 'active') {
      showToast('You cannot deactivate your own account', 'warning');
      return;
    }

    try {
      setActionLoading(true);
      await adminUsersAPI.activate(user.id);
      const action = user.status === 'active' ? 'deactivated' : 'activated';
      showToast(`User ${action} successfully`, 'success');
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error activating user:', error);
      showToast('Failed to update user status. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    // Prevent self-deletion
    if (selectedUser.id === currentUser?.id) {
      showToast('You cannot delete your own account', 'warning');
      setIsDeleteModalOpen(false);
      return;
    }

    try {
      setActionLoading(true);
      await adminUsersAPI.delete(selectedUser.id);
      setIsDeleteModalOpen(false);
      showToast('User deleted successfully', 'success');
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast(error.response?.data?.message || 'Failed to delete user. Please try again.', 'error');
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
    }
  };

  const handleViewUserDetails = async (user) => {
    try {
      setActionLoading(true);
      const response = await adminUsersAPI.getById(user.id);
      const userData = response.data.data.user || response.data.data;

      setSelectedUser(userData);
      setEditForm({
        full_name: userData.full_name || '',
        email: userData.email || '',
        role: userData.role || '',
        status: userData.status || '',
        bio: userData.bio || '',
        phone: userData.phone || ''
      });
      setFormErrors({});
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      showToast('Failed to load user details. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    // Prevent changing own role
    if (selectedUser.id === currentUser?.id && editForm.role !== currentUser.role) {
      showToast('You cannot change your own role', 'warning');
      return;
    }

    // Validate form
    const validation = validateUserForm(editForm, false);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showToast(formatErrors(validation.errors), 'error');
      return;
    }

    try {
      setActionLoading(true);

      // Prepare update data - convert status to is_active
      const updateData = { ...editForm };

      // Convert status to is_active for backend
      if (updateData.status) {
        updateData.is_active = updateData.status === 'active';
        delete updateData.status;
      }

      await adminUsersAPI.update(selectedUser.id, updateData);
      setIsEditModalOpen(false);
      setFormErrors({});
      showToast('User updated successfully', 'success');
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error updating user:', error);
      showToast(error.response?.data?.message || 'Failed to update user. Please try again.', 'error');
    } finally {
      setActionLoading(false);
      setSelectedUser(null);
    }
  };

  const handleCreateUser = async () => {
    // Validate form
    const validation = validateUserForm(createForm, true);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showToast(formatErrors(validation.errors), 'error');
      return;
    }

    try {
      setActionLoading(true);
      await adminUsersAPI.create(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({
        full_name: '',
        email: '',
        password: '',
        role: 'student',
        phone: '',
        bio: ''
      });
      setFormErrors({});
      showToast('User created successfully', 'success');
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Error creating user:', error);
      showToast(error.response?.data?.message || 'Failed to create user. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Email actions
  const handleSendPasswordReset = async (user) => {
    try {
      setActionLoading(true);
      // Assuming API endpoint exists
      await adminUsersAPI.sendPasswordReset(user.id);
      showToast(`Password reset email sent to ${user.email}`, 'success');
    } catch (error) {
      console.error('Error sending password reset:', error);
      showToast('Failed to send password reset email', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendVerificationEmail = async (user) => {
    try {
      setActionLoading(true);
      // Assuming API endpoint exists
      await adminUsersAPI.sendVerificationEmail(user.id);
      showToast(`Verification email sent to ${user.email}`, 'success');
    } catch (error) {
      console.error('Error sending verification email:', error);
      showToast('Failed to send verification email', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Unlock — bring a user out of suspended/preview back to active.
  // Does NOT touch payment / installment records. The admin can grant access
  // to a user who hasn't fully paid yet; their outstanding balance stays
  // outstanding and shows up wherever payment status normally would.
  const handleUnlockUser = async (user) => {
    const confirmed = confirm(
      `Unlock full access for ${user.full_name}?\n\nTheir account becomes active. Any unpaid installment balance is untouched and still owed.`
    );
    if (!confirmed) return;
    try {
      setActionLoading(true);
      await adminUsersAPI.setRegistrationStatus(user.id, {
        registration_status: 'active',
        note: `Admin unlock by ${currentUser?.email}`,
      });
      showToast(`Access unlocked for ${user.full_name}`, 'success');
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to unlock user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Lock — flip an active user to suspended. They keep the login but can't
  // open course content. This is the manual counterpart to the installment
  // auto-suspend so admins can lock accounts for any reason.
  const handleLockUser = async (user) => {
    const confirmed = confirm(
      `Lock access for ${user.full_name}?\n\nThey'll still be able to log in but won't be able to open course content until you unlock them.`
    );
    if (!confirmed) return;
    try {
      setActionLoading(true);
      await adminUsersAPI.setRegistrationStatus(user.id, {
        registration_status: 'suspended',
        note: `Admin lock by ${currentUser?.email}`,
      });
      showToast(`Access locked for ${user.full_name}`, 'success');
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to lock user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Assign-to-courses for instructor users ───────────────────────────────
  const openAssignCourses = async (user) => {
    setAssignTarget(user);
    setIsAssignCoursesModalOpen(true);
    setCourseSearch('');
    setAssignRole('co');
    setCoursesLoading(true);
    try {
      const [teachingRes, allRes] = await Promise.all([
        adminUsersAPI.getTeachingCourses(user.id),
        adminCoursesAPI.getAll({ status: 'all', limit: 500 }),
      ]);
      setTeachingCourses(teachingRes.data?.data?.courses || []);
      setAllCourses(allRes.data?.data?.courses || []);
    } catch (e) {
      showToast('Failed to load courses', 'error');
      setTeachingCourses([]);
      setAllCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const refreshTeachingCourses = async () => {
    if (!assignTarget) return;
    try {
      const res = await adminUsersAPI.getTeachingCourses(assignTarget.id);
      setTeachingCourses(res.data?.data?.courses || []);
    } catch (e) { /* keep stale list */ }
  };

  const handleAssignToCourse = async (courseId, role) => {
    if (!assignTarget) return;
    setActionLoading(true);
    try {
      await adminCoursesAPI.addInstructor(courseId, assignTarget.id, role);
      await refreshTeachingCourses();
      showToast('Assigned', 'success');
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to assign', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassignFromCourse = async (courseId) => {
    if (!assignTarget) return;
    setActionLoading(true);
    try {
      await adminCoursesAPI.removeInstructor(courseId, assignTarget.id);
      await refreshTeachingCourses();
      showToast('Removed from course', 'success');
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to remove', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter the "add to course" picker — only show courses the user isn't already on
  const teachingCourseIds = new Set(teachingCourses.map((tc) => tc.course?.id).filter(Boolean));
  const availableCourses = (allCourses || []).filter((c) => {
    if (teachingCourseIds.has(c.id)) return false;
    if (!courseSearch) return true;
    return (c.title || '').toLowerCase().includes(courseSearch.toLowerCase());
  });

  // Whether a user is eligible for the Assign-to-courses action
  const canBeAssignedAsInstructor = (u) =>
    u && (u.role === 'instructor' || u.role === 'admin' || u.role === 'super_admin'
      || u.instructor_status === 'approved');

  // Export to CSV
  const handleExportCSV = () => {
    try {
      const csvData = users.map(user => ({
        'Full Name': user.full_name,
        'Email': user.email,
        'Role': user.role,
        'Status': user.status,
        'Phone': user.phone || '',
        'Joined': new Date(user.created_at).toLocaleDateString(),
        'Email Verified': user.email_verified ? 'Yes' : 'No'
      }));

      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      showToast('Users exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting users:', error);
      showToast('Failed to export users', 'error');
    }
  };

  const handleImportUsers = async () => {
    if (!importFile) return showToast('Please select a CSV file', 'error');
    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/admin/users/import`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenStorage.get('accessToken')}` },
          body: formData,
        }
      );
      const data = await res.json();
      if (data.success) {
        setImportResult(data.data);
        fetchUsers();
      } else {
        showToast(data.message || 'Import failed', 'error');
      }
    } catch (err) {
      showToast('Import failed', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'danger';
      case 'admin': return 'purple';
      case 'instructor': return 'warning';
      case 'student': return 'success';
      default: return 'default';
    }
  };

  // Dual-role: approved instructors keep role='student' in the DB (everyone
  // signs up as a student — see backend authController + authz canTeach()).
  // Derive the badge from instructor_status so the list shows their earned
  // role instead of the bare signup role.
  const getEffectiveRole = (user) => {
    if (user.role === 'super_admin' || user.role === 'admin') return user.role;
    if (user.role === 'instructor' || user.instructor_status === 'approved') return 'instructor';
    return 'student';
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      default: return 'default';
    }
  };

  return (
    <>
      <PageHeader
        icon={UsersIcon}
        title="User Management"
        subtitle="Manage users, roles, and permissions"
        actions={
          <>
            <Button
              onClick={() => { setImportFile(null); setImportResult(null); setIsImportModalOpen(true); }}
              variant="ghost"
              size="sm"
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
              title="Import users from CSV"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <Button
              onClick={handleExportCSV}
              disabled={users.length === 0}
              variant="ghost"
              size="sm"
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
              title="Export users to CSV file"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => {
                setCreateForm({ full_name: '', email: '', password: '', role: 'student', phone: '', bio: '' });
                setFormErrors({});
                setIsCreateModalOpen(true);
              }}
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
              title="Create a new user account"
            >
              Create User
            </Button>
          </>
        }
      />

      <Container className="py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary">Students</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.roles?.student || 0}</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary">Instructors</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.roles?.instructor || 0}</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary">Admins</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(stats.roles?.admin || 0) + (stats.roles?.super_admin || 0)}
              </p>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {bulkSelectMode && showBulkActions && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkActivate}
                disabled={actionLoading}
                className="text-green-600 border-green-300 hover:bg-green-50"
                title="Activate selected users"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Activate
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkDeactivate}
                disabled={actionLoading}
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                title="Deactivate selected users"
              >
                <UserX className="w-4 h-4 mr-1" />
                Deactivate
              </Button>
              {currentUser?.role === 'super_admin' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={actionLoading}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  title="Delete selected users permanently"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedUsers([])}
                title="Clear selection"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search users by name or email..."
                leftIcon={<Search className="w-4 h-4" />}
                value={filters.search}
                onChange={handleSearchChange}
                className="!h-12"
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={filters.role}
                onChange={handleRoleChange}
                placeholder="Filter by role"
                className="!h-12"
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'student', label: 'Student' },
                  { value: 'instructor', label: 'Instructor' },
                  { value: 'admin', label: 'Admin' },
                ]}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={filters.status}
                onChange={handleStatusChange}
                placeholder="Filter by status"
                className="!h-12"
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
              />
            </div>
            <Button
              variant="outline"
              className="!h-12 !min-h-[48px]"
              onClick={() => {
                setFilters({
                  search: '',
                  role: '',
                  status: '',
                  page: 1,
                  limit: 10,
                  sortBy: 'created_at',
                  sortOrder: 'desc'
                });
              }}
              title="Reset all filters"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              className="!h-12 !min-h-[48px]"
              variant={bulkSelectMode ? 'primary' : 'outline'}
              onClick={toggleBulkSelectMode}
              title={bulkSelectMode ? 'Exit bulk selection mode' : 'Select multiple users for bulk actions'}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {bulkSelectMode ? 'Exit Select Mode' : 'Select Multiple'}
            </Button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              image={emptyUsers}
              icon={<UsersIcon className="w-16 h-16" />}
              title="No users found"
              description={filters.search || filters.role || filters.status ? "No users match your current filters." : "Get started by adding your first user."}
              action={
                <Button
                  variant="primary"
                  onClick={() => setIsCreateModalOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Create User
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark">
                    <tr>
                      {bulkSelectMode && (
                        <th className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === users.length}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 dark:border-border-dark"
                          />
                        </th>
                      )}
                      <th
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600"
                        onClick={() => handleSort('full_name')}
                      >
                        <div className="flex items-center">
                          User
                          {getSortIcon('full_name')}
                        </div>
                      </th>
                      <th
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 hidden md:table-cell"
                        onClick={() => handleSort('role')}
                      >
                        <div className="flex items-center">
                          Role
                          {getSortIcon('role')}
                        </div>
                      </th>
                      <th
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </th>
                      <th
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600 hidden lg:table-cell"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center">
                          Joined
                          {getSortIcon('created_at')}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">Discord</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                        {bulkSelectMode && (
                          <td className="px-3 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleSelectUser(user.id)}
                              className="rounded border-gray-300 dark:border-border-dark"
                            />
                          </td>
                        )}
                        <td className="px-3 py-4 whitespace-nowrap">
                          {/* Clicking name/email/avatar deep-links to
                              the full profile page. Replaces the old
                              modal — admins can now share URLs and
                              browser-back to the list. */}
                          <button
                            type="button"
                            onClick={() => navigate(`/users/${user.id}`)}
                            className="flex items-center text-left group focus:outline-none focus:ring-2 focus:ring-brand-blue rounded"
                          >
                            <Avatar src={user.profile_picture} alt={user.full_name} size="sm" className="mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-brand-blue transition-colors">
                                {user.full_name}
                                {user.id === currentUser?.id && (
                                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                            </div>
                          </button>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap hidden md:table-cell">
                          <Badge variant={getRoleBadgeColor(getEffectiveRole(user))}>{getEffectiveRole(user).replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <Badge variant={getStatusBadgeColor(user.status)}>{user.status}</Badge>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap hidden xl:table-cell">
                          {user.discord_user_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                              Connected
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Dropdown>
                            {({ isOpen, setIsOpen }) => (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsOpen(!isOpen)}
                                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                                {isOpen && (
                                  <Dropdown.Menu align="right">
                                    <Dropdown.Item
                                      icon={Edit}
                                      onClick={() => {
                                        setIsOpen(false);
                                        navigate(`/users/${user.id}`);
                                      }}
                                    >
                                      View / Edit
                                    </Dropdown.Item>

                                    {user.role === 'student' && (
                                      <Dropdown.Item
                                        icon={GraduationCap}
                                        onClick={() => {
                                          setIsOpen(false);
                                          navigate(`/enrollments?student_id=${user.id}`);
                                        }}
                                      >
                                        View Enrollments
                                      </Dropdown.Item>
                                    )}

                                    {user.status === 'active' ? (
                                      <Dropdown.Item
                                        icon={UserX}
                                        onClick={() => {
                                          setIsOpen(false);
                                          handleActivateUser(user);
                                        }}
                                        disabled={actionLoading}
                                      >
                                        Deactivate
                                      </Dropdown.Item>
                                    ) : (
                                      <Dropdown.Item
                                        icon={UserCheck}
                                        onClick={() => {
                                          setIsOpen(false);
                                          handleActivateUser(user);
                                        }}
                                        disabled={actionLoading}
                                      >
                                        Activate
                                      </Dropdown.Item>
                                    )}

                                    {!user.email_verified && (
                                      <Dropdown.Item
                                        icon={Mail}
                                        onClick={() => {
                                          setIsOpen(false);
                                          handleSendVerificationEmail(user);
                                        }}
                                        disabled={actionLoading}
                                      >
                                        Send Verification Email
                                      </Dropdown.Item>
                                    )}

                                    {/* Lock / Unlock — show whichever flips the
                                        user's current state. Locked = suspended
                                        OR preview (can't open content). Active
                                        users get Lock; everyone else gets Unlock. */}
                                    {user.registration_status === 'active' ? (
                                      <Dropdown.Item
                                        icon={Lock}
                                        onClick={() => {
                                          setIsOpen(false);
                                          handleLockUser(user);
                                        }}
                                        disabled={actionLoading}
                                      >
                                        Lock Access
                                      </Dropdown.Item>
                                    ) : (
                                      <Dropdown.Item
                                        icon={ShieldCheck}
                                        onClick={() => {
                                          setIsOpen(false);
                                          handleUnlockUser(user);
                                        }}
                                        disabled={actionLoading}
                                      >
                                        Unlock Access
                                      </Dropdown.Item>
                                    )}

                                    {canBeAssignedAsInstructor(user) && (
                                      <Dropdown.Item
                                        icon={BookOpen}
                                        onClick={() => {
                                          setIsOpen(false);
                                          openAssignCourses(user);
                                        }}
                                      >
                                        Assign to Courses
                                      </Dropdown.Item>
                                    )}

                                    {currentUser?.role === 'super_admin' && user.id !== currentUser?.id && (
                                      <>
                                        <Dropdown.Separator />
                                        <Dropdown.Item
                                          icon={Trash2}
                                          onClick={() => {
                                            setIsOpen(false);
                                            setSelectedUser(user);
                                            setIsDeleteModalOpen(true);
                                          }}
                                          danger
                                        >
                                          Delete User
                                        </Dropdown.Item>
                                      </>
                                    )}
                                  </Dropdown.Menu>
                                )}
                              </>
                            )}
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="px-4 py-4 border-t border-gray-200 dark:border-border-dark">
                  <SimplePagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Container>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setFormErrors({});
        }}
        title="Create New User"
        size="lg"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="full_name"
              value={createForm.full_name}
              onChange={handleCreateFormChange}
              placeholder="Enter full name"
              required
              error={formErrors.full_name}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={createForm.email}
              onChange={handleCreateFormChange}
              placeholder="Enter email"
              required
              error={formErrors.email}
            />
          </div>

          <Input
            label="Password"
            name="password"
            type="password"
            value={createForm.password}
            onChange={handleCreateFormChange}
            placeholder="Enter password (min 6 characters)"
            required
            error={formErrors.password}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Role"
              name="role"
              value={createForm.role}
              onChange={handleCreateFormChange}
              options={[
                { value: 'student', label: 'Student' },
                { value: 'instructor', label: 'Instructor' },
                { value: 'admin', label: 'Admin' },
                ...(currentUser?.role === 'super_admin' ? [{ value: 'super_admin', label: 'Super Admin' }] : []),
              ]}
              required
              error={formErrors.role}
            />
            <Input
              label="Phone (Optional)"
              name="phone"
              type="tel"
              value={createForm.phone}
              onChange={handleCreateFormChange}
              placeholder="Enter phone number"
              error={formErrors.phone}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Bio (Optional)
            </label>
            <textarea
              name="bio"
              value={createForm.bio}
              onChange={handleCreateFormChange}
              rows="3"
              className={cn(
                'w-full px-4 py-2.5 bg-white dark:bg-dark-700 border rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none',
                formErrors.bio ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-border-dark'
              )}
              placeholder="Enter bio"
            />
            {formErrors.bio && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.bio}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-border-dark">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setFormErrors({});
              }}
              disabled={actionLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={actionLoading}
            >
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* User Details/Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
          setFormErrors({});
        }}
        title="User Details & Edit"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-border-dark">
              <Avatar
                src={selectedUser.profile_picture}
                alt={selectedUser.full_name}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedUser.full_name}
                  {selectedUser.id === currentUser?.id && (
                    <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">(You)</span>
                  )}
                </h3>
                <p className="text-sm text-gray-500 dark:text-text-dark-secondary">
                  {selectedUser.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={getRoleBadgeColor(getEffectiveRole(selectedUser))}>
                    {getEffectiveRole(selectedUser).replace('_', ' ')}
                  </Badge>
                  <Badge variant={getStatusBadgeColor(selectedUser.status)}>
                    {selectedUser.status}
                  </Badge>
                </div>
                {/* Dual-role breakdown: everyone signs up as a student; the
                    instructor role is layered on via application + approval. */}
                {selectedUser.instructor_status === 'approved' && selectedUser.role === 'student' && (
                  <p className="text-xs text-gray-500 dark:text-text-dark-secondary mt-1.5">
                    Instructor (approved) · also a Student <span className="opacity-70">(signup default)</span>
                  </p>
                )}
                {selectedUser.instructor_status === 'pending' && (
                  <p className="text-xs text-gray-500 dark:text-text-dark-secondary mt-1.5">
                    Student <span className="opacity-70">(signup default)</span> · Instructor application pending
                  </p>
                )}
              </div>
            </div>

            {/* User Info Grid */}
            <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-200 dark:border-border-dark">
              <div>
                <p className="text-xs text-gray-500 dark:text-text-dark-secondary mb-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  Joined
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(selectedUser.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-text-dark-secondary mb-1">
                  <Mail className="w-3 h-3 inline mr-1" />
                  Email Status
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedUser.email_verified ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Not Verified
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pb-6 border-b border-gray-200 dark:border-border-dark">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendPasswordReset(selectedUser)}
                disabled={actionLoading}
                title="Send password reset email to user"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Password Reset
              </Button>
              {!selectedUser.email_verified && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendVerificationEmail(selectedUser)}
                  disabled={actionLoading}
                  title="Send email verification link to user"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Verification
                </Button>
              )}
            </div>

            {/* Edit Form */}
            <form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="full_name"
                  value={editForm.full_name}
                  onChange={handleEditFormChange}
                  placeholder="Enter full name"
                  required
                  error={formErrors.full_name}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditFormChange}
                  placeholder="Enter email"
                  required
                  error={formErrors.email}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Role"
                  name="role"
                  value={editForm.role}
                  onChange={handleEditFormChange}
                  options={[
                    { value: 'student', label: 'Student' },
                    { value: 'instructor', label: 'Instructor' },
                    { value: 'admin', label: 'Admin' },
                    ...(currentUser?.role === 'super_admin' ? [{ value: 'super_admin', label: 'Super Admin' }] : []),
                  ]}
                  required
                  error={formErrors.role}
                  disabled={selectedUser.id === currentUser?.id}
                />
                <Select
                  label="Status"
                  name="status"
                  value={editForm.status}
                  onChange={handleEditFormChange}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  required
                  error={formErrors.status}
                />
              </div>

              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={editForm.phone}
                onChange={handleEditFormChange}
                placeholder="Enter phone number"
                error={formErrors.phone}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={editForm.bio}
                  onChange={handleEditFormChange}
                  rows="4"
                  className={cn(
                    'w-full px-4 py-2.5 bg-white dark:bg-dark-700 border rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none',
                    formErrors.bio ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-border-dark'
                  )}
                  placeholder="Enter bio"
                />
                {formErrors.bio && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.bio}</p>
                )}
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-border-dark">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedUser(null);
                  setFormErrors({});
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateUser}
                isLoading={actionLoading}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        title="Delete User"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to delete <strong>{selectedUser?.full_name}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setIsDeleteModalOpen(false);
              setSelectedUser(null);
            }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteUser}
            isLoading={actionLoading}
          >
            Delete User
          </Button>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Delete Users"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-3">
          Are you sure you want to delete <strong>{selectedUsers.length} user(s)</strong>? This action cannot be undone.
        </p>
        <ul className="mb-6 max-h-40 overflow-y-auto space-y-1">
          {users.filter(u => selectedUsers.includes(u.id)).map(u => (
            <li key={u.id} className="text-sm text-gray-700 dark:text-text-dark-primary flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {u.full_name} <span className="text-gray-400 text-xs">({u.email})</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setIsBulkDeleteModalOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmBulkDelete}
            isLoading={actionLoading}
          >
            Delete Users
          </Button>
        </div>
      </Modal>

      {/* Import Users Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Users from CSV"
        size="md"
      >
        <div className="space-y-4">
          {!importResult ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload a CSV file with columns: <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded text-xs">full_name, email, password, role, phone</code>
              </p>
              <p className="text-xs text-gray-400">Max 500 rows. Duplicate emails will be skipped. Role defaults to "student" if empty.</p>

              {/* Download template link */}
              <button
                onClick={() => {
                  const csv = 'full_name,email,password,role,phone\nJohn Doe,john@example.com,Pass@123,student,+1234567890\nJane Smith,jane@example.com,Pass@123,student,';
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                  a.download = 'import_template.csv'; a.click();
                }}
                className="text-xs text-brand-blue hover:underline"
              >
                Download CSV template
              </button>

              <div
                className="border-2 border-dashed border-gray-200 dark:border-dark-600 rounded-xl p-8 text-center cursor-pointer hover:border-brand-blue transition-colors"
                onClick={() => document.getElementById('csv-upload-input').click()}
              >
                <FileUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {importFile ? importFile.name : 'Click to choose a CSV file'}
                </p>
                <input
                  id="csv-upload-input"
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => setImportFile(e.target.files[0] || null)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleImportUsers}
                  isLoading={importLoading}
                  disabled={!importFile || importLoading}
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  Import
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                    <p className="text-xs text-green-700 dark:text-green-400">Created</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">Skipped</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{importResult.errors?.length || 0}</p>
                    <p className="text-xs text-red-700 dark:text-red-400">Errors</p>
                  </div>
                </div>

                {importResult.errors?.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-red-200 dark:border-red-800 rounded-lg divide-y divide-red-100 dark:divide-red-900">
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="px-3 py-2 text-xs">
                        <span className="text-gray-500">Line {e.line} · {e.email}</span>
                        <span className="text-red-600 ml-2">{e.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => { setIsImportModalOpen(false); setImportResult(null); }}>
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Assign-to-courses modal */}
      <Modal
        isOpen={isAssignCoursesModalOpen}
        onClose={() => setIsAssignCoursesModalOpen(false)}
        title={`Assign ${assignTarget?.full_name || ''} to courses`}
        size="lg"
      >
        <div className="space-y-5">
          {/* Currently teaching */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Currently teaching {teachingCourses.length > 0 && `(${teachingCourses.length})`}
            </h4>
            {coursesLoading ? (
              <div className="py-8 flex justify-center"><Spinner /></div>
            ) : teachingCourses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                Not assigned to any courses yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {teachingCourses.map((tc) => (
                  <li key={tc.course.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <BookOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {tc.course.title}
                          {tc.role === 'lead' && (
                            <Badge variant="warning" size="sm" className="ml-2 inline-flex items-center gap-1">
                              <Crown className="w-3 h-3" /> Lead
                            </Badge>
                          )}
                          {tc.role === 'co' && <Badge variant="info" size="sm" className="ml-2">Co</Badge>}
                          {tc.role === 'ta' && <Badge variant="default" size="sm" className="ml-2">TA</Badge>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Status: {tc.course.status}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnassignFromCourse(tc.course.id)}
                      disabled={actionLoading || tc.role === 'lead'}
                      title={tc.role === 'lead' ? 'Reassign lead instructor first' : 'Remove from course'}
                      className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add to a course */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Add to a course
            </h4>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Search courses..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="flex-1"
              />
              <Select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                className="w-40"
                options={[
                  { value: 'co', label: 'Co-instructor' },
                  { value: 'ta', label: 'Teaching assistant' },
                  { value: 'lead', label: 'Lead (replaces current)' },
                ]}
              />
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {availableCourses.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center">
                  {courseSearch ? 'No courses match that search.' : 'No more courses to assign.'}
                </p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {availableCourses.map((c) => (
                    <li key={c.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Status: {c.status} {c.instructor?.full_name && `· Lead: ${c.instructor.full_name}`}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAssignToCourse(c.id, assignRole)}
                        disabled={actionLoading}
                      >
                        Add as {assignRole === 'lead' ? 'lead' : assignRole === 'co' ? 'co' : 'TA'}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsAssignCoursesModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
