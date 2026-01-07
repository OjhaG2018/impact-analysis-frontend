// src/features/questionnaires/QuestionBankPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Search, Plus, Edit, Trash2, Copy, Eye, BookOpen,
  CheckCircle, AlertCircle, HelpCircle, Tag, FileText, RefreshCw
} from 'lucide-react';
import { questionnaireApi } from '../../api';
import {
  Question,
  QuestionBankEntry,
  QuestionType,
  QuestionCategory,
  SensitivityLevel,
  QUESTION_TYPE_LABELS,
  SENSITIVITY_LABELS,
} from '../../types';
import { Card, Button, Input, Select, Modal, Badge, LoadingSpinner } from '../../components/ui';

// ============== CONSTANTS ==============
const questionTypeOptions = Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const categoryOptions = [
  { value: 'identification', label: 'Identification & Demographics' },
  { value: 'household', label: 'Household Composition' },
  { value: 'economic', label: 'Economic Profile' },
  { value: 'education', label: 'Education & Skills' },
  { value: 'health', label: 'Health & Nutrition' },
  { value: 'time_availability', label: 'Time Availability' },
  { value: 'mobility', label: 'Mobility & Access' },
  { value: 'family_dynamics', label: 'Family Dynamics' },
  { value: 'intervention', label: 'Program/Intervention' },
  { value: 'outcomes', label: 'Outcomes & Impact' },
  { value: 'sustainability', label: 'Sustainability' },
  { value: 'verification', label: 'Verification' },
  { value: 'custom', label: 'Custom' },
];

const sensitivityOptions = Object.entries(SENSITIVITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const TYPE_COLORS: Record<string, string> = {
  text: 'bg-blue-100 text-blue-700',
  textarea: 'bg-blue-100 text-blue-700',
  number: 'bg-purple-100 text-purple-700',
  single_choice: 'bg-green-100 text-green-700',
  multiple_choice: 'bg-green-100 text-green-700',
  dropdown: 'bg-teal-100 text-teal-700',
  date: 'bg-orange-100 text-orange-700',
  time: 'bg-orange-100 text-orange-700',
  datetime: 'bg-orange-100 text-orange-700',
  scale: 'bg-yellow-100 text-yellow-700',
  ranking: 'bg-yellow-100 text-yellow-700',
  file: 'bg-gray-100 text-gray-700',
  location: 'bg-red-100 text-red-700',
  photo: 'bg-pink-100 text-pink-700',
  signature: 'bg-indigo-100 text-indigo-700',
  calculation: 'bg-cyan-100 text-cyan-700',
};

const SENSITIVITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

// ============== MAIN COMPONENT ==============
const QuestionBankPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data State
  const [questions, setQuestions] = useState<(Question | QuestionBankEntry)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter State
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    question_type: searchParams.get('type') || '',
    category: searchParams.get('category') || '',
  });

  // Modal State
  const [selectedQuestion, setSelectedQuestion] = useState<Question | QuestionBankEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Question | QuestionBankEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============== DATA FETCHING ==============
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      // Try to use question bank API first, fallback to questions API
      let data: any;
      try {
        data = await questionnaireApi.getQuestionBank({
          category: filters.category || undefined,
          question_type: filters.question_type || undefined,
          search: filters.search || undefined,
        });
        setQuestions(data.results || []);
      } catch {
        // Fallback to regular questions API
        data = await questionnaireApi.getQuestions({
          category: filters.category || undefined,
          question_type: filters.question_type || undefined,
        });
        // Filter by search locally if using questions API
        let filteredQuestions = Array.isArray(data) ? data : [];
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredQuestions = filteredQuestions.filter(q => 
            q.text?.toLowerCase().includes(searchLower) ||
            q.help_text?.toLowerCase().includes(searchLower)
          );
        }
        setQuestions(filteredQuestions);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load questions');
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ============== HANDLERS ==============
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));

    // Update URL
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key === 'question_type' ? 'type' : key, value);
    } else {
      params.delete(key === 'question_type' ? 'type' : key);
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      question_type: '',
      category: '',
    });
    setSearchParams(new URLSearchParams());
  };

  const handleViewQuestion = (question: Question | QuestionBankEntry) => {
    setSelectedQuestion(question);
    setShowDetailModal(true);
  };

  const handleDeleteQuestion = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await questionnaireApi.deleteQuestion(deleteTarget.id);
      setSuccess('Question deleted successfully!');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchQuestions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
    setDeleting(false);
  };

  // ============== HELPERS ==============
  const getTypeLabel = (type: string): string => {
    return QUESTION_TYPE_LABELS[type as QuestionType] || type;
  };

  const getCategoryLabel = (category: string): string => {
    return categoryOptions.find(c => c.value === category)?.label || category;
  };

  const getSensitivityLabel = (level: string): string => {
    return SENSITIVITY_LABELS[level as SensitivityLevel] || level;
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // ============== RENDER: STATS ==============
  const renderStats = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{questions.length}</p>
            <p className="text-xs sm:text-sm text-gray-500">Total Questions</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {questions.filter(q => 'is_required' in q && q.is_required).length}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">Required</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Tag className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {new Set(questions.map(q => q.category)).size}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">Categories</p>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">
              {questions.filter(q => 'sensitivity_level' in q && (q.sensitivity_level === 'high' || q.sensitivity_level === 'very_high')).length}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">Sensitive</p>
          </div>
        </div>
      </Card>
    </div>
  );

  // ============== RENDER: FILTERS ==============
  const renderFilters = () => (
    <Card className="p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
          <Select
            value={filters.question_type}
            onChange={(e) => handleFilterChange('question_type', e.target.value)}
            options={[{ value: '', label: 'All Types' }, ...questionTypeOptions]}
            className="w-full sm:w-48"
          />

          <Select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
            className="w-full sm:w-48"
          />

          <Button variant="secondary" onClick={fetchQuestions} className="flex-shrink-0">
            <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="flex-shrink-0">
              <span className="hidden sm:inline">Clear Filters</span>
              <span className="sm:hidden">Clear</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  // ============== RENDER: QUESTION LIST ==============
  const renderQuestionList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      );
    }

    if (questions.length === 0) {
      return (
        <Card className="p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Found</h3>
          <p className="text-gray-600 mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters'
              : 'Questions will appear here as you create them in templates'}
          </p>
          <Button onClick={() => navigate('/questionnaires')}>
            Go to Templates
          </Button>
        </Card>
      );
    }

    return (
      <Card className="p-2 sm:p-4 overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600">Question</th>
                <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600 hidden sm:table-cell">Type</th>
                <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600 hidden lg:table-cell">Category</th>
                <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600 hidden md:table-cell">Sensitivity</th>
                <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600 hidden sm:table-cell">Required</th>
                <th className="px-2 sm:px-4 py-3 text-left text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-2 sm:px-4 py-4 max-w-xs sm:max-w-md">
                    <button
                      onClick={() => handleViewQuestion(question)}
                      className="text-left hover:text-emerald-600 w-full"
                    >
                      <p className="font-medium text-gray-900 line-clamp-2 text-sm sm:text-base">{('text' in question) ? question.text : question.question_text}</p>
                      {(('help_text' in question) ? question.help_text : '') && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{('help_text' in question) ? question.help_text : ''}</p>
                      )}
                      <div className="sm:hidden mt-2 flex flex-wrap gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[question.question_type] || 'bg-gray-100 text-gray-700'}`}>
                          {getTypeLabel(question.question_type)}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SENSITIVITY_COLORS[('sensitivity_level' in question) ? question.sensitivity_level : 'low'] || 'bg-gray-100 text-gray-700'}`}>
                          {getSensitivityLabel(('sensitivity_level' in question) ? question.sensitivity_level : 'low')}
                        </span>
                        {('is_required' in question) && question.is_required && (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Required</span>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-2 sm:px-4 py-4 hidden sm:table-cell">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${TYPE_COLORS[question.question_type] || 'bg-gray-100 text-gray-700'}`}>
                      {getTypeLabel(question.question_type)}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-4 hidden lg:table-cell">
                    <span className="text-sm text-gray-600">
                      {getCategoryLabel(question.category)}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-4 hidden md:table-cell">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${SENSITIVITY_COLORS[('sensitivity_level' in question) ? question.sensitivity_level : 'low'] || 'bg-gray-100 text-gray-700'}`}>
                      {getSensitivityLabel(('sensitivity_level' in question) ? question.sensitivity_level : 'low')}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-4 hidden sm:table-cell">
                    {('is_required' in question) && question.is_required ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleViewQuestion(question)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(question); setShowDeleteModal(true); }}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-2 sm:px-4 py-3 border-t text-sm text-gray-500">
          Showing {questions.length} questions
        </div>
      </Card>
    );
  };

  // ============== RENDER: DETAIL MODAL ==============
  const renderDetailModal = () => {
    if (!selectedQuestion) return null;

    return (
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedQuestion(null); }}
        title="Question Details"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Question Text</label>
            <p className="text-lg text-gray-900">{('text' in selectedQuestion) ? selectedQuestion.text : selectedQuestion.question_text}</p>
          </div>

          {(('help_text' in selectedQuestion) ? selectedQuestion.help_text : '') && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Help Text</label>
              <p className="text-gray-700 italic">{('help_text' in selectedQuestion) ? selectedQuestion.help_text : ''}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${TYPE_COLORS[selectedQuestion.question_type] || 'bg-gray-100'}`}>
                {getTypeLabel(selectedQuestion.question_type)}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
              <p className="text-gray-900">{getCategoryLabel(selectedQuestion.category)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Sensitivity</label>
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${SENSITIVITY_COLORS[('sensitivity_level' in selectedQuestion) ? selectedQuestion.sensitivity_level : 'low'] || 'bg-gray-100'}`}>
                {getSensitivityLabel(('sensitivity_level' in selectedQuestion) ? selectedQuestion.sensitivity_level : 'low')}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Required</label>
              <p className="text-gray-900">{('is_required' in selectedQuestion) && selectedQuestion.is_required ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {selectedQuestion.options && selectedQuestion.options.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Options</label>
              <div className="flex flex-wrap gap-2">
                {selectedQuestion.options.map((opt, idx) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 rounded text-sm">
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedQuestion.ai_probing_hints && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">AI Probing Hints</label>
              <p className="text-gray-700 bg-purple-50 p-3 rounded-lg">{selectedQuestion.ai_probing_hints}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => { setShowDetailModal(false); setSelectedQuestion(null); }}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  // ============== RENDER: DELETE MODAL ==============
  const renderDeleteModal = () => (
    <Modal
      isOpen={showDeleteModal}
      onClose={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
      title="Delete Question"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">This action cannot be undone</p>
            <p className="text-sm text-red-600 mt-1">
              This question will be permanently removed from its template.
            </p>
          </div>
        </div>

        {deleteTarget && (
          <p className="text-gray-600">
            Are you sure you want to delete: <strong>"{(('text' in deleteTarget) ? deleteTarget.text : deleteTarget.question_text).substring(0, 100)}..."</strong>?
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} disabled={deleting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleDeleteQuestion} disabled={deleting} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">
            {deleting ? 'Deleting...' : 'Delete Question'}
          </Button>
        </div>
      </div>
    </Modal>
  );

  // ============== MAIN RENDER ==============
  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xl">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xl">×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/questionnaires')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Question Bank</h1>
            <p className="text-gray-500 mt-1">Browse and manage all questions across templates</p>
          </div>
        </div>
        <Button onClick={() => navigate('/questionnaires')} className="flex-shrink-0">
          <FileText className="w-4 h-4" /> <span className="hidden sm:inline">View Templates</span>
        </Button>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Filters */}
      {renderFilters()}

      {/* Question List */}
      {renderQuestionList()}

      {/* Modals */}
      {renderDetailModal()}
      {renderDeleteModal()}
    </div>
  );
};

export default QuestionBankPage;