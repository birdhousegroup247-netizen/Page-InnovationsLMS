import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Plus, CheckCircle, Clock, Upload, ChevronRight, FolderOpen } from 'lucide-react';
import { adminQuestionsAPI, categoriesAPI } from '../../lib/api';
import { Button, Spinner } from '../../components/ui';
import Container from '../../components/layout/Container';
import StatsCard from '../../components/ui/StatsCard';
import { PageHeader } from '../../components/layout';
import { useToast } from '../../components/ui/Toast';
import QuestionModal from '../../components/questions/QuestionModal';
import BulkImport from '../../components/questions/BulkImport';

/**
 * QuestionBank — landing page for the question bank.
 *
 * Replaces the previous accordion-based layout with a clean category grid.
 * Each card navigates to /questions/category/:id where the actual question
 * list and per-question detail live. Stats + "Add" / "Import" stay at the
 * top so the most common actions never leave the main screen.
 */
export default function QuestionBank() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, multiple_choice: 0, true_false: 0, fill_blank: 0 });
  const [categories, setCategories] = useState([]);
  const [breakdown, setBreakdown] = useState({ category_counts: [], uncategorized_count: 0 });
  const [loading, setLoading] = useState(true);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const [catRes, bdRes, statsRes] = await Promise.all([
        categoriesAPI.getAll(),
        adminQuestionsAPI.getCategoryBreakdown(),
        adminQuestionsAPI.getAll({ page: 1, limit: 1 }),
      ]);
      setCategories(Array.isArray(catRes.data.data?.categories) ? catRes.data.data.categories : []);
      const bd = bdRes.data.data;
      setBreakdown({ category_counts: bd.category_counts || [], uncategorized_count: bd.uncategorized_count || 0 });
      if (statsRes.data.data?.stats) setStats(statsRes.data.data.stats);
    } catch (e) {
      console.error('Init failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const countForCategory = (catId) => {
    if (catId === null) return breakdown.uncategorized_count;
    return breakdown.category_counts.find((c) => String(c.category_id) === String(catId))?.question_count || 0;
  };

  // Category tiles: every defined category + an "Uncategorized" bucket at the end.
  const tiles = [
    ...categories.map((c) => ({ id: c.id, name: c.name, color: c.color, slug: String(c.id) })),
    { id: null, name: 'Uncategorized', color: null, slug: 'uncategorized' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        icon={HelpCircle}
        title="Question Bank"
        subtitle="Browse and manage questions by category"
        actions={
          <>
            <Button
              onClick={() => setShowBulkImportModal(true)}
              variant="ghost"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Import CSV
            </Button>
            <Button
              onClick={() => setShowQuestionModal(true)}
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Add Question
            </Button>
          </>
        }
      />

      <Container className="py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatsCard title="Total" value={stats.total} icon={HelpCircle} color="blue" />
          <StatsCard title="Approved" value={stats.approved} icon={CheckCircle} color="green" />
          <StatsCard title="Pending" value={stats.pending} icon={Clock} color="yellow" />
          <StatsCard title="MCQ" value={stats.multiple_choice} icon={HelpCircle} color="purple" />
          <StatsCard title="True/False" value={stats.true_false} icon={HelpCircle} color="indigo" />
          <StatsCard title="Fill Blank" value={stats.fill_blank} icon={HelpCircle} color="pink" />
        </div>

        {/* Category tiles */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Categories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map((tile) => {
              const count = countForCategory(tile.id);
              return (
                <button
                  key={tile.slug}
                  type="button"
                  onClick={() => navigate(`/questions/category/${tile.slug}`)}
                  className="group p-5 bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl text-left hover:border-brand-blue dark:hover:border-brand-blue hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: tile.color ? `${tile.color}20` : 'rgba(99,102,241,0.1)',
                          color: tile.color || '#6366f1',
                        }}
                      >
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand-blue transition-colors">
                          {tile.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {count} {count === 1 ? 'question' : 'questions'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Container>

      {/* Modals — Add new question + Bulk import. Live on the landing so admins
          can create questions before drilling into any category. */}
      {showQuestionModal && (
        <QuestionModal
          isOpen={showQuestionModal}
          onClose={() => setShowQuestionModal(false)}
          question={null}
          onSaved={() => {
            setShowQuestionModal(false);
            showToast('Question created', 'success');
            refresh();
          }}
        />
      )}

      {showBulkImportModal && (
        <BulkImport
          isOpen={showBulkImportModal}
          onClose={() => setShowBulkImportModal(false)}
          onImported={() => {
            setShowBulkImportModal(false);
            showToast('Questions imported', 'success');
            refresh();
          }}
        />
      )}
    </>
  );
}
