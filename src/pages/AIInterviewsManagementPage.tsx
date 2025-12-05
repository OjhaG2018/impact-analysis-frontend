import React, { useState, useEffect } from 'react';
import { 
  Bot, Plus, Search, Filter, RefreshCw, Eye, Send, Copy, 
  CheckCircle, Clock, AlertCircle, XCircle, Pause, Play,
  MessageSquare, Phone, ExternalLink, Download, MoreVertical
} from 'lucide-react';
import api, { endpoints } from '../api';
import { 
  Card, Button, Input, Select, Badge, Modal, DataTable, LoadingSpinner 
} from '../components/ui';
import { AIInterviewSession, Project, Beneficiary } from '../types';

// Status badge variants
const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  pending: 'default',
  in_progress: 'info',
  paused: 'warning',
  completed: 'success',
  abandoned: 'danger',
  expired: 'danger',
};

// Status display labels
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
  abandoned: 'Abandoned',
  expired: 'Expired',
};

// Language display labels
const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  te: 'Telugu',
  ta: 'Tamil',
  mr: 'Marathi',
  gu: 'Gujarati',
};

// Helper functions to safely get values from session (handles both nested and flat structures)
const getBeneficiaryName = (session: any): string => {
  return session.beneficiary_name || session.beneficiary?.name || 'Unknown';
};

const getBeneficiaryPhone = (session: any): string => {
  return session.beneficiary_phone || session.beneficiary?.phone || '-';
};

const getProjectCode = (session: any): string => {
  return session.project_code || session.project?.code || '-';
};

const getQuestionnaireName = (session: any): string => {
  return session.questionnaire_name || 
         session.questionnaire?.name || 
         session.questionnaire?.title ||
         session.questionnaire?.template?.name || 
         'Assessment';
};

const getStatusDisplay = (session: any): string => {
  return session.status_display || STATUS_LABELS[session.status] || session.status || 'Unknown';
};

const getLanguageDisplay = (session: any): string => {
  return session.language_display || LANGUAGE_LABELS[session.language] || session.language?.toUpperCase() || '-';
};

const getProgressPercentage = (session: any): number => {
  if (session.progress_percentage !== undefined) {
    return session.progress_percentage;
  }
  const total = session.total_questions || 0;
  const answered = session.answered_questions || 0;
  return total > 0 ? Math.round((answered / total) * 100) : 0;
};

const AIInterviewsManagementPage: React.FC = () => {
  // State
  const [sessions, setSessions] = useState<AIInterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AIInterviewSession | null>(null);
  
  // Create form state
  const [projects, setProjects] = useState<Project[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState({
    project: '',
    questionnaire: '',
    beneficiary_ids: [] as number[],
    language: 'en',
  });
  const [creating, setCreating] = useState(false);
  
  // Load sessions
  useEffect(() => {
    loadSessions();
    loadProjects();
  }, []);
  
  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ results: AIInterviewSession[] } | AIInterviewSession[]>(endpoints.aiSessions);
      // Handle both paginated and non-paginated responses
      const data = Array.isArray(response) ? response : (response.results || []);
      setSessions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load AI interview sessions');
    } finally {
      setLoading(false);
    }
  };
  
  const loadProjects = async () => {
    try {
      const response = await api.get<{ results: Project[] } | Project[]>(endpoints.projects);
      const data = Array.isArray(response) ? response : (response.results || []);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };
  
  const loadBeneficiaries = async (projectId: string) => {
    if (!projectId) {
      setBeneficiaries([]);
      return;
    }
    try {
      const response = await api.get<{ results: Beneficiary[] } | Beneficiary[]>(
        `${endpoints.beneficiaries}?project=${projectId}&is_interviewed=false`
      );
      const data = Array.isArray(response) ? response : (response.results || []);
      setBeneficiaries(data);
    } catch (err) {
      console.error('Failed to load beneficiaries:', err);
    }
  };
  
  const loadQuestionnaires = async (projectId: string) => {
    if (!projectId) {
      setQuestionnaires([]);
      return;
    }
    try {
      const response = await api.get<{ results: any[] } | any[]>(
        `${endpoints.projectQuestionnaires}?project=${projectId}`
      );
      const data = Array.isArray(response) ? response : (response.results || []);
      setQuestionnaires(data);
    } catch (err) {
      console.error('Failed to load questionnaires:', err);
    }
  };
  
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = e.target.value;
    setCreateForm(prev => ({ ...prev, project: projectId, questionnaire: '', beneficiary_ids: [] }));
    loadBeneficiaries(projectId);
    loadQuestionnaires(projectId);
  };
  
  const handleCreateSessions = async () => {
    if (!createForm.project || !createForm.questionnaire || createForm.beneficiary_ids.length === 0) {
      setError('Please select project, questionnaire, and at least one beneficiary');
      return;
    }
    
    setCreating(true);
    try {
      const response = await api.post<{ created: AIInterviewSession[]; errors: any[] }>(
        `${endpoints.aiSessions}bulk_create/`,
        {
          project: parseInt(createForm.project),
          questionnaire: parseInt(createForm.questionnaire),
          beneficiary_ids: createForm.beneficiary_ids,
          language: createForm.language,
        }
      );
      
      if (response.created && response.created.length > 0) {
        loadSessions();
        setShowCreateModal(false);
        setCreateForm({ project: '', questionnaire: '', beneficiary_ids: [], language: 'en' });
      }
      
      if (response.errors && response.errors.length > 0) {
        setError(`Created ${response.created?.length || 0} sessions. ${response.errors.length} errors occurred.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create sessions');
    } finally {
      setCreating(false);
    }
  };
  
  const handleCopyLink = (session: AIInterviewSession) => {
    const link = `${window.location.origin}/ai-interview/${session.access_token}`;
    navigator.clipboard.writeText(link);
    alert('Interview link copied to clipboard!');
  };
  
  const handleSendLink = async (session: AIInterviewSession) => {
    // In a real app, this would trigger SMS/WhatsApp/Email
    const phone = getBeneficiaryPhone(session);
    alert(`Link would be sent to ${phone}`);
  };
  
  const viewSessionDetails = (session: AIInterviewSession) => {
    setSelectedSession(session);
    setShowDetailsModal(true);
  };
  
  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    const beneficiaryName = getBeneficiaryName(session).toLowerCase();
    const projectCode = getProjectCode(session).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = 
      beneficiaryName.includes(searchLower) ||
      projectCode.includes(searchLower);
    const matchesStatus = !statusFilter || session.status === statusFilter;
    
    // Handle both nested and flat project structure
    const sessionProjectId = typeof session.project === 'object' 
     ? (session.project as any)?.id 
     : session.project;
    const matchesProject = !projectFilter || sessionProjectId?.toString() === projectFilter;
    
    return matchesSearch && matchesStatus && matchesProject;
  });
  
  // Table columns
  const columns = [
    {
      key: 'beneficiary_name',
      label: 'Beneficiary',
      render: (_value: unknown, session: AIInterviewSession) => (
        <div>
          <div className="font-medium">{getBeneficiaryName(session)}</div>
          <div className="text-sm text-gray-500">{getBeneficiaryPhone(session)}</div>
        </div>
      ),
    },
    {
      key: 'project_code',
      label: 'Project',
      render: (_value: unknown, session: AIInterviewSession) => (
        <div>
          <div className="font-medium">{getProjectCode(session)}</div>
          <div className="text-sm text-gray-500">{getQuestionnaireName(session)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_value: unknown, session: AIInterviewSession) => (
        <Badge variant={STATUS_VARIANTS[session.status] || 'default'}>
          {getStatusDisplay(session)}
        </Badge>
      ),
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (_value: unknown, session: AIInterviewSession) => {
        const percentage = getProgressPercentage(session);
        const answered = session.answered_questions || 0;
        const total = session.total_questions || 0;
        
        return (
          <div className="flex items-center">
            <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
              <div
                className={`h-2 rounded-full ${percentage === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">
              {answered}/{total}
            </span>
          </div>
        );
      },
    },
    {
      key: 'language',
      label: 'Language',
      render: (_value: unknown, session: AIInterviewSession) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {getLanguageDisplay(session)}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (_value: unknown, session: AIInterviewSession) => (
        <span className="text-sm text-gray-500">
          {session.created_at ? new Date(session.created_at).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value: unknown, session: AIInterviewSession) => (
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => { e.stopPropagation(); viewSessionDetails(session); }}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleCopyLink(session); }}
            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
            title="Copy Link"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleSendLink(session); }}
            className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
            title="Send Link"
          >
            <Send className="w-4 h-4" />
          </button>
          <a
            href={`/ai-interview/${session.access_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Open Interview"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      ),
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Bot className="w-8 h-8 text-blue-500 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Voice Interviews</h1>
            <p className="text-sm text-gray-500">
              Manage AI-powered voice interviews for beneficiaries
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Sessions
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Sessions</p>
              <p className="text-2xl font-bold">{sessions.length}</p>
            </div>
            <MessageSquare className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('in_progress')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold">
                {sessions.filter(s => s.status === 'in_progress').length}
              </p>
            </div>
            <Play className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('completed')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold">
                {sessions.filter(s => s.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </Card>
        <Card className="p-4 cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter('pending')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold">
                {sessions.filter(s => s.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500 opacity-50" />
          </div>
        </Card>
      </div>
      
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by beneficiary or project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={loadSessions}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </Card>
      
      {/* Sessions Table */}
      <Card>
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700">
            {error}
            <button onClick={() => setError('')} className="float-right">×</button>
          </div>
        )}
        <DataTable
          columns={columns}
          data={filteredSessions}
          loading={loading}
        />
      </Card>
      
      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create AI Interview Sessions"
      >
        <div className="space-y-4">
          <Select
            label="Project"
            name="project"
            value={createForm.project}
            onChange={handleProjectChange}
            options={[
              { value: '', label: 'Select Project' },
              ...projects.map(p => ({ value: p.id.toString(), label: `${p.code} - ${p.title}` }))
            ]}
          />
          
          <Select
            label="Questionnaire"
            name="questionnaire"
            value={createForm.questionnaire}
            onChange={(e) => setCreateForm(prev => ({ ...prev, questionnaire: e.target.value }))}
            options={[
              { value: '', label: 'Select Questionnaire' },
              ...questionnaires.map(q => ({ 
                value: q.id.toString(), 
                label: q.display_name || q.name || q.title || q.template?.name || `Questionnaire ${q.id}` 
              }))
            ]}
          />
          
          <Select
            label="Language"
            name="language"
            value={createForm.language}
            onChange={(e) => setCreateForm(prev => ({ ...prev, language: e.target.value }))}
            options={[
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'Hindi' },
              { value: 'bn', label: 'Bengali' },
              { value: 'te', label: 'Telugu' },
              { value: 'mr', label: 'Marathi' },
              { value: 'ta', label: 'Tamil' },
              { value: 'gu', label: 'Gujarati' },
            ]}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Beneficiaries ({createForm.beneficiary_ids.length} selected)
            </label>
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {beneficiaries.length === 0 ? (
                <p className="p-4 text-sm text-gray-500 text-center">
                  {createForm.project ? 'No eligible beneficiaries found' : 'Select a project first'}
                </p>
              ) : (
                beneficiaries.map(ben => (
                  <label
                    key={ben.id}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={createForm.beneficiary_ids.includes(ben.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCreateForm(prev => ({
                            ...prev,
                            beneficiary_ids: [...prev.beneficiary_ids, ben.id]
                          }));
                        } else {
                          setCreateForm(prev => ({
                            ...prev,
                            beneficiary_ids: prev.beneficiary_ids.filter(id => id !== ben.id)
                          }));
                        }
                      }}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">{ben.name}</div>
                      <div className="text-sm text-gray-500">{ben.phone} • {ben.village || ''}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
            {beneficiaries.length > 0 && (
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => setCreateForm(prev => ({
                    ...prev,
                    beneficiary_ids: beneficiaries.map(b => b.id)
                  }))}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={() => setCreateForm(prev => ({ ...prev, beneficiary_ids: [] }))}
                  className="text-sm text-gray-600 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSessions} disabled={creating}>
              {creating ? <LoadingSpinner size="sm" /> : 'Create Sessions'}
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Interview Session Details"
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Beneficiary</p>
                <p className="font-medium">{getBeneficiaryName(selectedSession)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{getBeneficiaryPhone(selectedSession)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Project</p>
                <p className="font-medium">{getProjectCode(selectedSession)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant={STATUS_VARIANTS[selectedSession.status] || 'default'}>
                  {getStatusDisplay(selectedSession)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Progress</p>
                <p className="font-medium">
                  {selectedSession.answered_questions || 0} / {selectedSession.total_questions || 0} questions
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Language</p>
                <p className="font-medium">{getLanguageDisplay(selectedSession)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">
                  {selectedSession.created_at ? new Date(selectedSession.created_at).toLocaleString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expires</p>
                <p className="font-medium">
                  {selectedSession.expires_at ? new Date(selectedSession.expires_at).toLocaleString() : '-'}
                </p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">Interview Link</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/ai-interview/${selectedSession.access_token}`}
                  className="flex-1 px-3 py-2 border rounded bg-gray-50 text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={() => handleCopyLink(selectedSession)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
              <a
                href={`/ai-interview/${selectedSession.access_token}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Interview
                </Button>
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AIInterviewsManagementPage;