// src/features/questionnaires/QuestionnairesPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, ClipboardList, Edit, Eye, Trash2, Copy, Download, ChevronDown, ChevronUp,
  Search, Sparkles, ArrowLeft, GripVertical, FileText, Clock,
  CheckCircle, AlertCircle, BookOpen, Layers
} from 'lucide-react';
import { questionnaireApi } from '../../api';
import {
  QuestionnaireTemplate,
  QuestionnaireSection,
  Question,
  QuestionnaireStatistics,
  QuestionnaireSector,
  TemplateType,
  QuestionType,
  SectionType,
  QuestionCategory,
  SensitivityLevel,
  SECTOR_LABELS,
  TEMPLATE_TYPE_LABELS,
  QUESTION_TYPE_LABELS,
  SENSITIVITY_LABELS,
  SECTOR_COLORS,
} from '../../types';
import { Card, Button, Input, Select, Modal, Badge, LoadingSpinner } from '../../components/ui';

// ============== TYPES ==============
type ViewMode = 'list' | 'detail';

// ============== OPTIONS ==============
const sectorOptions = Object.entries(SECTOR_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const templateTypeOptions = Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const questionTypeOptions = Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const sectionTypeOptions = [
  { value: 'universal', label: 'Universal Baseline' },
  { value: 'situational', label: 'Situational Assessment' },
  { value: 'sector_specific', label: 'Sector-Specific' },
  { value: 'impact_evaluation', label: 'Impact Evaluation' },
  { value: 'demographics', label: 'Demographics' },
  { value: 'economic', label: 'Economic Profile' },
  { value: 'verification', label: 'Verification' },
  { value: 'custom', label: 'Custom' },
];

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

// ============== MAIN COMPONENT ==============
const QuestionnairesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<QuestionnaireTemplate | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  // Data State
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([]);
  const [statistics, setStatistics] = useState<QuestionnaireStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter State
  const [filters, setFilters] = useState({
    sector: searchParams.get('sector') || '',
    template_type: searchParams.get('type') || '',
    ai_enabled: searchParams.get('ai') || '',
    search: '',
  });

  // Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState<QuestionnaireSection | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [activeSection, setActiveSection] = useState<QuestionnaireSection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; item: any } | null>(null);

  // Template Form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    sector: 'general' as QuestionnaireSector,
    template_type: 'baseline' as TemplateType,
    version: '1.0',
    is_default: false,
    is_active: true,
    ai_interview_enabled: true,
    estimated_duration_minutes: 30,
  });

  // Section Form
  const [sectionForm, setSectionForm] = useState({
    title: '',
    description: '',
    section_type: 'custom' as SectionType,
    order: 0,
    is_conditional: false,
    ai_section_intro: '',
  });

  // Question Form
  const [questionForm, setQuestionForm] = useState({
    text: '',
    help_text: '',
    question_type: 'text' as QuestionType,
    category: 'custom' as QuestionCategory,
    options: [] as string[],
    is_required: true,
    order: 0,
    sensitivity_level: 'low' as SensitivityLevel,
    ai_probing_hints: '',
  });
  const [optionsText, setOptionsText] = useState('');

  // ============== DATA FETCHING ==============
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filters.sector) params.sector = filters.sector;
      if (filters.template_type) params.template_type = filters.template_type;
      if (filters.ai_enabled) params.ai_interview_enabled = filters.ai_enabled === 'true';
      if (filters.search) params.search = filters.search;

      const response = await questionnaireApi.getTemplates(params);
      setTemplates(response.results || []);
      setError(null);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError(err.message || 'Failed to load templates');
    }
    setLoading(false);
  }, [filters]);

  const fetchStatistics = async () => {
    try {
      const data = await questionnaireApi.getStatistics();
      setStatistics(data);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const fetchTemplateDetail = async (id: number) => {
    setLoading(true);
    try {
      const data = await questionnaireApi.getTemplate(id);
      setSelectedTemplate(data);
      setViewMode('detail');
      if (data.sections && data.sections.length > 0) {
        setExpandedSections(new Set([data.sections[0].id]));
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load template');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
    fetchStatistics();
  }, [fetchTemplates]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ============== TEMPLATE HANDLERS ==============
  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      description: '',
      sector: 'general',
      template_type: 'baseline',
      version: '1.0',
      is_default: false,
      is_active: true,
      ai_interview_enabled: true,
      estimated_duration_minutes: 30,
    });
    setIsEditMode(false);
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim()) {
      setError('Template name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEditMode && selectedTemplate) {
        await questionnaireApi.updateTemplate(selectedTemplate.id, templateForm);
        setSuccess('Template updated successfully!');
        fetchTemplateDetail(selectedTemplate.id);
      } else {
        await questionnaireApi.createTemplate(templateForm);
        setSuccess('Template created successfully!');
      }
      resetTemplateForm();
      setShowTemplateModal(false);
      fetchTemplates();
      fetchStatistics();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail
        || Object.values(err.response?.data || {}).flat().join(', ')
        || err.message
        || 'Failed to save template';
      setError(errorMsg);
    }
    setSubmitting(false);
  };

  const handleEditTemplate = (template: QuestionnaireTemplate) => {
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      sector: template.sector,
      template_type: template.template_type,
      version: template.version || '1.0',
      is_default: template.is_default,
      is_active: template.is_active,
      ai_interview_enabled: template.ai_interview_enabled,
      estimated_duration_minutes: template.estimated_duration_minutes || 30,
    });
    setIsEditMode(true);
    setShowTemplateModal(true);
  };

  const handleCloneTemplate = async (template: QuestionnaireTemplate) => {
    try {
      await questionnaireApi.cloneTemplate(template.id);
      setSuccess(`Template "${template.name}" cloned successfully!`);
      fetchTemplates();
      fetchStatistics();
    } catch (err: any) {
      setError(err.message || 'Failed to clone template');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'template') return;
    const template = deleteConfirm.item as QuestionnaireTemplate;

    try {
      await questionnaireApi.deleteTemplate(template.id);
      setSuccess('Template deleted successfully!');
      setDeleteConfirm(null);
      if (viewMode === 'detail') {
        setViewMode('list');
        setSelectedTemplate(null);
      }
      fetchTemplates();
      fetchStatistics();
    } catch (err: any) {
      setError(err.message || 'Failed to delete template');
    }
  };

  const handleExportTemplate = async (template: QuestionnaireTemplate) => {
    try {
      const data = await questionnaireApi.exportTemplate(template.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/\s+/g, '_')}_v${template.version}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('Template exported!');
    } catch (err: any) {
      setError(err.message || 'Failed to export template');
    }
  };

  // ============== SECTION HANDLERS ==============
  const toggleSection = (sectionId: number) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const openSectionModal = (section?: QuestionnaireSection) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({
        title: section.title,
        description: section.description || '',
        section_type: section.section_type,
        order: section.order,
        is_conditional: section.is_conditional,
        ai_section_intro: section.ai_section_intro || '',
      });
    } else {
      setEditingSection(null);
      const maxOrder = selectedTemplate?.sections?.length || 0;
      setSectionForm({
        title: '',
        description: '',
        section_type: 'custom',
        order: maxOrder,
        is_conditional: false,
        ai_section_intro: '',
      });
    }
    setShowSectionModal(true);
  };

  const handleSaveSection = async () => {
    if (!selectedTemplate || !sectionForm.title.trim()) {
      setError('Section title is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingSection) {
        await questionnaireApi.updateSection(editingSection.id, sectionForm);
        setSuccess('Section updated!');
      } else {
        await questionnaireApi.createSection({
          ...sectionForm,
          template: selectedTemplate.id,
        });
        setSuccess('Section added!');
      }
      setShowSectionModal(false);
      fetchTemplateDetail(selectedTemplate.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save section');
    }
    setSubmitting(false);
  };

  const handleDeleteSection = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'section') return;
    const section = deleteConfirm.item as QuestionnaireSection;

    try {
      await questionnaireApi.deleteSection(section.id);
      setSuccess('Section deleted!');
      setDeleteConfirm(null);
      if (selectedTemplate) {
        fetchTemplateDetail(selectedTemplate.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete section');
    }
  };

  // ============== QUESTION HANDLERS ==============
  const openQuestionModal = (section: QuestionnaireSection, question?: Question) => {
    setActiveSection(section);
    if (question) {
      setEditingQuestion(question);
      setQuestionForm({
        text: question.text,
        help_text: question.help_text || '',
        question_type: question.question_type,
        category: question.category,
        options: question.options || [],
        is_required: question.is_required,
        order: question.order,
        sensitivity_level: question.sensitivity_level,
        ai_probing_hints: question.ai_probing_hints || '',
      });
      setOptionsText(question.options?.join('\n') || '');
    } else {
      setEditingQuestion(null);
      const maxOrder = section.questions?.length || 0;
      setQuestionForm({
        text: '',
        help_text: '',
        question_type: 'text',
        category: 'custom',
        options: [],
        is_required: true,
        order: maxOrder,
        sensitivity_level: 'low',
        ai_probing_hints: '',
      });
      setOptionsText('');
    }
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!activeSection || !selectedTemplate || !questionForm.text.trim()) {
      setError('Question text is required');
      return;
    }

    setSubmitting(true);
    try {
      const options = optionsText.split('\n').filter(o => o.trim());
      const data = { ...questionForm, options };

      if (editingQuestion) {
        await questionnaireApi.updateQuestion(editingQuestion.id, data);
        setSuccess('Question updated!');
      } else {
        await questionnaireApi.createQuestion({
          ...data,
          section: activeSection.id,
        });
        setSuccess('Question added!');
      }
      setShowQuestionModal(false);
      fetchTemplateDetail(selectedTemplate.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    }
    setSubmitting(false);
  };

  const handleDeleteQuestion = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'question') return;
    const question = deleteConfirm.item as Question;

    try {
      await questionnaireApi.deleteQuestion(question.id);
      setSuccess('Question deleted!');
      setDeleteConfirm(null);
      if (selectedTemplate) {
        fetchTemplateDetail(selectedTemplate.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete question');
    }
  };

  // ============== HELPERS ==============
  const getSectorColor = (sector: string) => SECTOR_COLORS[sector as QuestionnaireSector] || '#6b7280';

  const getSectorBgClass = (sector: string): string => {
    const classes: Record<string, string> = {
      agriculture: 'bg-green-100 text-green-700',
      education: 'bg-blue-100 text-blue-700',
      healthcare: 'bg-red-100 text-red-700',
      women_empowerment: 'bg-pink-100 text-pink-700',
      livelihood: 'bg-yellow-100 text-yellow-700',
      wash: 'bg-cyan-100 text-cyan-700',
      housing: 'bg-purple-100 text-purple-700',
      financial_inclusion: 'bg-lime-100 text-lime-700',
      child_welfare: 'bg-orange-100 text-orange-700',
      general: 'bg-gray-100 text-gray-700',
    };
    return classes[sector] || 'bg-gray-100 text-gray-700';
  };

  // ============== RENDER: STATISTICS ==============
  const renderStatistics = () => {
    if (!statistics) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statistics.total_templates}</p>
              <p className="text-sm text-gray-500">Total Templates</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statistics.active_templates}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statistics.ai_enabled_templates}</p>
              <p className="text-sm text-gray-500">AI-Enabled</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statistics.total_questions}</p>
              <p className="text-sm text-gray-500">Total Questions</p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // ============== RENDER: FILTERS ==============
  const renderFilters = () => (
    <Card className="p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <Select
          value={filters.sector}
          onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
          options={[{ value: '', label: 'All Sectors' }, ...sectorOptions]}
        />
        <Select
          value={filters.template_type}
          onChange={(e) => setFilters({ ...filters, template_type: e.target.value })}
          options={[{ value: '', label: 'All Types' }, ...templateTypeOptions]}
        />
        <Select
          value={filters.ai_enabled}
          onChange={(e) => setFilters({ ...filters, ai_enabled: e.target.value })}
          options={[
            { value: '', label: 'All' },
            { value: 'true', label: 'AI Enabled' },
            { value: 'false', label: 'AI Disabled' },
          ]}
        />
      </div>
    </Card>
  );

  // ============== RENDER: LIST VIEW ==============
  const renderListView = () => (
    <div>
      {renderStatistics()}
      {renderFilters()}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12 text-center">
          <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Found</h3>
          <p className="text-gray-600 mb-4">
            {filters.search || filters.sector || filters.template_type
              ? 'Try adjusting your filters'
              : 'Get started by creating your first questionnaire template'}
          </p>
          <Button onClick={() => { resetTemplateForm(); setShowTemplateModal(true); }}>
            <Plus className="w-4 h-4" /> Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${getSectorColor(template.sector)}20` }}
                >
                  <ClipboardList className="w-6 h-6" style={{ color: getSectorColor(template.sector) }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="font-semibold text-gray-900 truncate cursor-pointer hover:text-emerald-600"
                      onClick={() => fetchTemplateDetail(template.id)}
                    >
                      {template.name}
                    </h3>
                    <div className="flex gap-1 flex-shrink-0">
                      {template.is_default && <Badge variant="info">Default</Badge>}
                      {template.ai_interview_enabled && (
                        <Badge variant="success"><Sparkles className="w-3 h-3" /></Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getSectorBgClass(template.sector)}`}>
                      {template.sector_display || SECTOR_LABELS[template.sector]}
                    </span>
                  </p>

                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{template.description}</p>

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>{template.section_count || template.total_sections || 0} sections</span>
                    <span>{template.question_count || template.total_questions || 0} questions</span>
                    <span>v{template.version}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                    <button
                      onClick={() => fetchTemplateDetail(template.id)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleCloneTemplate(template)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      <Copy className="w-3.5 h-3.5" /> Clone
                    </button>
                    <button
                      onClick={() => handleExportTemplate(template)}
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {!template.is_default && (
                      <button
                        onClick={() => setDeleteConfirm({ type: 'template', item: template })}
                        className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Add new template card */}
          <Card
            className="p-6 border-2 border-dashed border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer flex items-center justify-center min-h-[280px]"
            onClick={() => { resetTemplateForm(); setShowTemplateModal(true); }}
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">Create New Template</p>
              <p className="text-sm text-gray-500 mt-1">Start from scratch</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  // ============== RENDER: DETAIL VIEW ==============
  const renderDetailView = () => {
    if (!selectedTemplate) return null;

    return (
      <div>
        {/* Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <button
                onClick={() => { setViewMode('list'); setSelectedTemplate(null); }}
                className="text-gray-600 hover:text-gray-800 mb-3 flex items-center gap-1 text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Templates
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{selectedTemplate.name}</h1>
              <p className="text-gray-500 mt-1">{selectedTemplate.description}</p>

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className={`px-3 py-1 rounded text-sm font-medium ${getSectorBgClass(selectedTemplate.sector)}`}>
                  {selectedTemplate.sector_display || SECTOR_LABELS[selectedTemplate.sector]}
                </span>
                <Badge variant="default">
                  {selectedTemplate.template_type_display || TEMPLATE_TYPE_LABELS[selectedTemplate.template_type]}
                </Badge>
                <span className="text-sm text-gray-500">v{selectedTemplate.version}</span>
                {selectedTemplate.ai_interview_enabled && (
                  <Badge variant="success">
                    <Sparkles className="w-3 h-3 mr-1" /> AI Interview
                  </Badge>
                )}
                {selectedTemplate.estimated_duration_minutes && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    ~{selectedTemplate.estimated_duration_minutes} min
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleEditTemplate(selectedTemplate)}>
                <Edit className="w-4 h-4" /> Edit
              </Button>
              <Button onClick={() => openSectionModal()}>
                <Plus className="w-4 h-4" /> Add Section
              </Button>
            </div>
          </div>
        </Card>

        {/* Sections */}
        <div className="space-y-4">
          {selectedTemplate.sections?.map((section, sIdx) => (
            <Card key={section.id} className="overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => toggleSection(section.id)}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-gray-300" />
                  {expandedSections.has(section.id) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {sIdx + 1}. {section.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {section.question_count || section.questions?.length || 0} questions
                      {section.section_type && section.section_type !== 'custom' && (
                        <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {section.section_type.replace('_', ' ')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button size="sm" variant="outline" onClick={() => openQuestionModal(section)}>
                    <Plus className="w-3 h-3" /> Question
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openSectionModal(section)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteConfirm({ type: 'section', item: section })}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {expandedSections.has(section.id) && (
                <div className="border-t bg-gray-50">
                  {!section.questions || section.questions.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p>No questions in this section.</p>
                      <button
                        onClick={() => openQuestionModal(section)}
                        className="mt-2 text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Add first question
                      </button>
                    </div>
                  ) : (
                    section.questions.map((question, qIdx) => (
                      <div
                        key={question.id}
                        className="p-4 border-b last:border-b-0 bg-white hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-sm font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                Q{qIdx + 1}
                              </span>
                              <Badge variant="default">
                                {QUESTION_TYPE_LABELS[question.question_type] || question.question_type}
                              </Badge>
                              {question.is_required && (
                                <span className="text-red-500 text-xs font-medium">Required</span>
                              )}
                              {question.sensitivity_level && question.sensitivity_level !== 'low' && (
                                <Badge variant="warning">
                                  {SENSITIVITY_LABELS[question.sensitivity_level]}
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-900">{question.text}</p>
                            {question.options && question.options.length > 0 && (
                              <p className="text-sm text-gray-500 mt-1">
                                Options: {question.options.join(' | ')}
                              </p>
                            )}
                            {question.help_text && (
                              <p className="text-sm text-gray-400 mt-1 italic">{question.help_text}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openQuestionModal(section, question)}
                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'question', item: question })}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          ))}

          {(!selectedTemplate.sections || selectedTemplate.sections.length === 0) && (
            <Card className="p-12 text-center">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No sections yet. Add sections to build your questionnaire.</p>
              <Button onClick={() => openSectionModal()}>
                <Plus className="w-4 h-4" /> Add First Section
              </Button>
            </Card>
          )}
        </div>
      </div>
    );
  };

  // ============== RENDER: MODALS ==============
  const renderTemplateModal = () => (
    <Modal
      isOpen={showTemplateModal}
      onClose={() => { setShowTemplateModal(false); resetTemplateForm(); setError(null); }}
      title={isEditMode ? 'Edit Template' : 'Create New Template'}
      size="lg"
    >
      <form onSubmit={handleTemplateSubmit} className="space-y-4">
        <Input
          label="Template Name *"
          value={templateForm.name}
          onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
          placeholder="e.g., Agriculture Impact Assessment"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
          <textarea
            value={templateForm.description}
            onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
            placeholder="Brief description of the questionnaire purpose"
            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            rows={3}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Sector *"
            value={templateForm.sector}
            onChange={(e) => setTemplateForm({ ...templateForm, sector: e.target.value as QuestionnaireSector })}
            options={sectorOptions}
          />
          <Select
            label="Template Type *"
            value={templateForm.template_type}
            onChange={(e) => setTemplateForm({ ...templateForm, template_type: e.target.value as TemplateType })}
            options={templateTypeOptions}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Version"
            value={templateForm.version}
            onChange={(e) => setTemplateForm({ ...templateForm, version: e.target.value })}
            placeholder="1.0"
          />
          <Input
            label="Est. Duration (minutes)"
            type="number"
            value={templateForm.estimated_duration_minutes}
            onChange={(e) => setTemplateForm({ ...templateForm, estimated_duration_minutes: parseInt(e.target.value) || 30 })}
          />
        </div>

        <div className="space-y-2 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={templateForm.ai_interview_enabled}
              onChange={(e) => setTemplateForm({ ...templateForm, ai_interview_enabled: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Enable AI Interview for this template</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={templateForm.is_default}
              onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Set as default template for this sector</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={templateForm.is_active}
              onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Active (available for use)</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            type="button"
            onClick={() => { setShowTemplateModal(false); resetTemplateForm(); }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : isEditMode ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </form>
    </Modal>
  );

  const renderSectionModal = () => (
    <Modal
      isOpen={showSectionModal}
      onClose={() => setShowSectionModal(false)}
      title={editingSection ? 'Edit Section' : 'Add Section'}
    >
      <div className="space-y-4">
        <Input
          label="Section Title *"
          value={sectionForm.title}
          onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
          placeholder="e.g., Demographic Information"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={sectionForm.description}
            onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
            placeholder="Brief description of this section"
            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            rows={2}
          />
        </div>

        <Select
          label="Section Type"
          value={sectionForm.section_type}
          onChange={(e) => setSectionForm({ ...sectionForm, section_type: e.target.value as SectionType })}
          options={sectionTypeOptions}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">AI Section Introduction</label>
          <textarea
            value={sectionForm.ai_section_intro}
            onChange={(e) => setSectionForm({ ...sectionForm, ai_section_intro: e.target.value })}
            placeholder="How the AI interviewer should introduce this section..."
            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500"
            rows={2}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sectionForm.is_conditional}
            onChange={(e) => setSectionForm({ ...sectionForm, is_conditional: e.target.checked })}
            className="w-4 h-4 text-emerald-600 rounded"
          />
          <span className="text-sm text-gray-700">Conditional section (shown based on conditions)</span>
        </label>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={() => setShowSectionModal(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSaveSection} disabled={!sectionForm.title.trim() || submitting}>
            {submitting ? 'Saving...' : editingSection ? 'Save Changes' : 'Add Section'}
          </Button>
        </div>
      </div>
    </Modal>
  );

  const renderQuestionModal = () => {
    const needsOptions = ['single_choice', 'multiple_choice', 'dropdown', 'ranking'].includes(questionForm.question_type);

    return (
      <Modal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        title={editingQuestion ? 'Edit Question' : 'Add Question'}
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
            <textarea
              value={questionForm.text}
              onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
              placeholder="Enter your question"
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Question Type *"
              value={questionForm.question_type}
              onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value as QuestionType })}
              options={questionTypeOptions}
            />
            <Select
              label="Category"
              value={questionForm.category}
              onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value as QuestionCategory })}
              options={categoryOptions}
            />
          </div>

          {needsOptions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options (one per line) *</label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                rows={4}
              />
            </div>
          )}

          <Input
            label="Help Text"
            value={questionForm.help_text}
            onChange={(e) => setQuestionForm({ ...questionForm, help_text: e.target.value })}
            placeholder="Additional guidance for respondents"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Sensitivity Level"
              value={questionForm.sensitivity_level}
              onChange={(e) => setQuestionForm({ ...questionForm, sensitivity_level: e.target.value as SensitivityLevel })}
              options={sensitivityOptions}
            />
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={questionForm.is_required}
                  onChange={(e) => setQuestionForm({ ...questionForm, is_required: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-sm text-gray-700">Required</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">AI Probing Hints</label>
            <textarea
              value={questionForm.ai_probing_hints}
              onChange={(e) => setQuestionForm({ ...questionForm, ai_probing_hints: e.target.value })}
              placeholder="Hints for AI on how to probe deeper or follow up..."
              className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
            <Button variant="secondary" onClick={() => setShowQuestionModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveQuestion}
              disabled={!questionForm.text.trim() || (needsOptions && !optionsText.trim()) || submitting}
            >
              {submitting ? 'Saving...' : editingQuestion ? 'Save Changes' : 'Add Question'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  const renderDeleteModal = () => (
    <Modal
      isOpen={!!deleteConfirm}
      onClose={() => setDeleteConfirm(null)}
      title={`Delete ${deleteConfirm?.type === 'template' ? 'Template' : deleteConfirm?.type === 'section' ? 'Section' : 'Question'}`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">This action cannot be undone</p>
            <p className="text-sm text-red-600 mt-1">
              {deleteConfirm?.type === 'template' && 'All sections and questions in this template will be deleted.'}
              {deleteConfirm?.type === 'section' && 'All questions in this section will be deleted.'}
              {deleteConfirm?.type === 'question' && 'This question will be permanently removed.'}
            </p>
          </div>
        </div>

        <p className="text-gray-600">
          Are you sure you want to delete{' '}
          <strong>
            "{deleteConfirm?.type === 'template'
              ? (deleteConfirm.item as QuestionnaireTemplate).name
              : deleteConfirm?.type === 'section'
              ? (deleteConfirm.item as QuestionnaireSection).title
              : (deleteConfirm?.item as Question)?.text?.substring(0, 50) + '...'}"
          </strong>
          ?
        </p>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (deleteConfirm?.type === 'template') handleDeleteTemplate();
              else if (deleteConfirm?.type === 'section') handleDeleteSection();
              else if (deleteConfirm?.type === 'question') handleDeleteQuestion();
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questionnaires</h1>
          <p className="text-gray-500 mt-1">Manage survey templates, sections, and questions</p>
        </div>
        {viewMode === 'list' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/questionnaires/questions')}>
              <BookOpen className="w-4 h-4" /> Question Bank
            </Button>
            <Button onClick={() => { resetTemplateForm(); setShowTemplateModal(true); }}>
              <Plus className="w-4 h-4" /> New Template
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {viewMode === 'list' ? renderListView() : renderDetailView()}

      {/* Modals */}
      {renderTemplateModal()}
      {renderSectionModal()}
      {renderQuestionModal()}
      {renderDeleteModal()}
    </div>
  );
};

export default QuestionnairesPage;