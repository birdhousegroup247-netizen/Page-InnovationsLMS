import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { adminCategoriesAPI } from '../../lib/api';
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Folder,
  FileText,
} from 'lucide-react';
import { Container, EmptyState, PageHeader } from '../../components/layout';
import { Button, Spinner, Alert, Badge, Modal } from '../../components/ui';
import { cn } from '../../utils/cn';
import emptyCategories from '../../assets/empty-categories.svg';

export default function Categories() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, main_categories: 0, subcategories: 0 });
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_category_id: null,
    icon: '',
    color: '',
    description: '',
    display_order: 0,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchData();
  }, [includeInactive]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = includeInactive ? { include_inactive: 'true' } : {};

      const [categoriesResponse, statsResponse] = await Promise.all([
        adminCategoriesAPI.getAll(params),
        adminCategoriesAPI.getStats(),
      ]);

      setCategories(categoriesResponse.data.data.categories);
      setStats(statsResponse.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode, category = null) => {
    setModalMode(mode);
    setSelectedCategory(category);

    if (mode === 'edit' && category) {
      setFormData({
        name: category.name || '',
        parent_category_id: category.parent_category_id || null,
        icon: category.icon || '',
        color: category.color || '',
        description: category.description || '',
        display_order: category.display_order || 0,
        is_active: category.is_active !== undefined ? category.is_active : true,
      });
    } else {
      setFormData({
        name: '',
        parent_category_id: null,
        icon: '',
        color: '',
        description: '',
        display_order: 0,
        is_active: true,
      });
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setFormData({
      name: '',
      parent_category_id: null,
      icon: '',
      color: '',
      description: '',
      display_order: 0,
      is_active: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (modalMode === 'create') {
        await adminCategoriesAPI.create(formData);
        setSuccessMessage('Category created successfully!');
      } else {
        await adminCategoriesAPI.update(selectedCategory.id, formData);
        setSuccessMessage('Category updated successfully!');
      }

      handleCloseModal();
      fetchData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${modalMode} category`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (category) => setDeleteTarget(category);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminCategoriesAPI.delete(deleteTarget.id);
      setSuccessMessage(`Category "${deleteTarget.name}" deleted successfully!`);
      setDeleteTarget(null);
      fetchData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  // Organize categories into parent-child hierarchy
  const mainCategories = categories.filter(cat => !cat.parent_category_id);
  const getSubcategories = (parentId) => categories.filter(cat => cat.parent_category_id === parentId);

  return (
    <>
      <PageHeader
        icon={FolderTree}
        title="Categories"
        subtitle="Manage course categories"
        actions={
          <Button
            onClick={() => handleOpenModal('create')}
            variant="ghost"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
          >
            Add Category
          </Button>
        }
      />

      <Container className="py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                <FolderTree className="w-6 h-6 text-brand-blue" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Inactive</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p>
              </div>
              <div className="w-12 h-12 bg-gray-500/10 rounded-lg flex items-center justify-center">
                <EyeOff className="w-6 h-6 text-gray-500" />
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

        {/* Actions Bar — only show the toggle if there are actually inactive
            categories to hide; otherwise it looks broken (it does filter, but
            with 0 inactive rows there's nothing to add/remove visually). */}
        {stats.inactive > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
              />
              Show {stats.inactive} inactive {stats.inactive === 1 ? 'category' : 'categories'}
            </label>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
              Loading categories...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && categories.length === 0 && (
          <EmptyState
            image={emptyCategories}
            icon={<FolderTree className="w-16 h-16" />}
            title="No categories found"
            description="Get started by creating your first category to organize your courses."
            action={
              <Button
                variant="primary"
                onClick={() => handleOpenModal('create')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Category
              </Button>
            }
          />
        )}

        {/* Categories List */}
        {!loading && categories.length > 0 && (
          <div className="space-y-4">
            {categories.map((category) => {
              return (
                <div key={category.id} className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl overflow-hidden">
                  {/* Click the body to view this category's courses; Edit /
                      Delete stay separate so they don't fire on row clicks. */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/courses?category_id=${category.id}`)}
                        className="flex-1 text-left group"
                        title="View courses in this category"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {category.icon && (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl"
                              style={{ backgroundColor: category.color || '#3B82F6' }}
                            >
                              {category.icon}
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-brand-blue transition-colors">
                              {category.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={category.is_active ? 'success' : 'secondary'}>
                                {category.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {category.course_count || 0} courses
                              </span>
                            </div>
                          </div>
                        </div>

                        {category.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {category.description}
                          </p>
                        )}
                      </button>

                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenModal('edit', category)}
                          leftIcon={<Edit className="w-4 h-4" />}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(category)}
                          leftIcon={<Trash2 className="w-4 h-4" />}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </Container>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Create Category' : 'Edit Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-border-dark rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
              placeholder="e.g., Web Development"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Icon (Emoji)
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-border-dark rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
                placeholder="📚"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
                Color
              </label>
              <input
                type="color"
                value={formData.color || '#3B82F6'}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 px-1 border border-gray-300 dark:border-border-dark rounded-lg focus:ring-2 focus:ring-brand-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-border-dark rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
              placeholder="Brief description of this category..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">
              Display Order
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-border-dark rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-400">
              Active (visible to users)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseModal}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={submitting}
            >
              {modalMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Category"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
