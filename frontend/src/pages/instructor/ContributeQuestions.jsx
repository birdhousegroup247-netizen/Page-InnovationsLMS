import { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { questionsAPI, categoriesAPI, coursesAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner, Badge } from '../../components/ui';
import QuestionModal from '../../components/questions/QuestionModal';

export default function ContributeQuestions() {
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  useEffect(() => {
    fetchQuestions();
    fetchCourses();
    fetchCategories();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await questionsAPI.getMyContributions();
      setQuestions(response.data.data.questions || []);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAll();
      setCourses(response.data.data?.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const filteredQuestions = questions.filter(q =>
    q.question_text.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: questions.length,
    approved: questions.filter(q => q.is_approved).length,
    pending: questions.filter(q => !q.is_approved).length
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <HelpCircle className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                      Contribute Questions
                    </h1>
                    <p className="text-lg text-white/90 mt-1">
                      Add questions to the question bank (pending admin approval)
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedQuestion(null);
                  setShowModal(true);
                }}
                variant="white"
                className="bg-white text-indigo-600 hover:bg-white/90"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Question
              </Button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-300 font-medium mb-1">
                Questions Require Admin Approval
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                All questions you contribute will be reviewed by an administrator before they can be used in tests.
                This ensures quality and accuracy across the question bank.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-brand-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Contributed</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your questions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
            />
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading questions...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-12 text-center">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {search ? 'No questions found' : 'No questions yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {search
                ? 'Try a different search term'
                : 'Start contributing questions to the question bank'}
            </p>
            {!search && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Question
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredQuestions.map((question) => (
                <div
                  key={question.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {question.course && (
                          <Badge color="purple">
                            📚 {question.course.title}
                          </Badge>
                        )}
                        <Badge
                          color={question.is_approved ? 'green' : 'yellow'}
                        >
                          {question.is_approved ? 'Approved' : 'Pending Review'}
                        </Badge>
                        <Badge
                          color={
                            question.difficulty === 'easy'
                              ? 'green'
                              : question.difficulty === 'medium'
                              ? 'yellow'
                              : 'red'
                          }
                        >
                          {question.difficulty}
                        </Badge>
                        <Badge color="blue">
                          {question.question_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-gray-900 dark:text-white font-medium mb-1">
                        {question.question_text}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {question.marks} mark(s) • {question.time_limit_seconds}s time limit
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedQuestion(question);
                          setShowModal(true);
                        }}
                        disabled={question.is_approved}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>

      {/* Question Modal */}
      {showModal && (
        <QuestionModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedQuestion(null);
          }}
          question={selectedQuestion}
          onSuccess={() => {
            fetchQuestions();
            setShowModal(false);
            setSelectedQuestion(null);
          }}
          courses={courses}
          categories={categories}
        />
      )}
    </>
  );
}
