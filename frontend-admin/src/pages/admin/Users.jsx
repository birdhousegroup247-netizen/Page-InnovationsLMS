import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { adminUsersAPI } from '../../lib/api';
import {
  Users as UsersIcon,
  Search,
  Filter,
  MoreVertical,
  Shield,
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
  Send
} from 'lucide-react';
import { Container } from '../../components/layout';
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

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'danger';
      case 'admin': return 'purple';
      case 'instructor': return 'warning';
      case 'student': return 'success';
      default: return 'default';
    }
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
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                    User Management
                  </h1>
                  <p className="text-lg text-white/90 animate-fade-in mt-1">
                    Manage users, roles, and permissions
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportCSV}
                  disabled={users.length === 0}
                  variant="ghost"
                  className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
                  title="Export users to CSV file"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={() => {
                    setCreateForm({
                      full_name: '',
                      email: '',
                      password: '',
                      role: 'student',
                      phone: '',
                      bio: ''
                    });
                    setFormErrors({});
                    setIsCreateModalOpen(true);
                  }}
                  variant="ghost"
                  leftIcon={<Plus className="h-4 w-4" />}
                  className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
                  title="Create a new user account"
                >
                  Create User
                </Button>
              </div>
            </div>
          </Container>
        </div>
      </div>

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
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600"
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
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center">
                          Joined
                          {getSortIcon('created_at')}
                        </div>
                      </th>
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
                          <div className="flex items-center">
                            <Avatar src={user.profile_picture} alt={user.full_name} size="sm" className="mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.full_name}
                                {user.id === currentUser?.id && (
                                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <Badge variant={getRoleBadgeColor(user.role)}>{user.role.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <Badge variant={getStatusBadgeColor(user.status)}>{user.status}</Badge>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(user.created_at).toLocaleDateString()}
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
                                        handleViewUserDetails(user);
                                      }}
                                    >
                                      View / Edit
                                    </Dropdown.Item>

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
                  <Badge variant={getRoleBadgeColor(selectedUser.role)}>
                    {selectedUser.role.replace('_', ' ')}
                  </Badge>
                  <Badge variant={getStatusBadgeColor(selectedUser.status)}>
                    {selectedUser.status}
                  </Badge>
                </div>
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
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to delete <strong>{selectedUsers.length} user(s)</strong>? This action cannot be undone.
        </p>
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
    </>
  );
}
