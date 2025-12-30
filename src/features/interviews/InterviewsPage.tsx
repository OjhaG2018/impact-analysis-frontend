// src/features/interviews/InterviewsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, LayoutGrid, List, Calendar, 
  ChevronDown, MoreVertical, Clock, MapPin, User, FileText,
  CheckCircle, XCircle, PlayCircle, Eye, Edit, Trash2,
  AlertCircle, Star, MessageSquare, Download, RefreshCw,
  ChevronRight, X, Phone, Mail, Building, GripVertical,
  ClipboardList, Users, TrendingUp, Award, Send, Mic, Camera
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { 
  InterviewResponse, InterviewStatus, PaginatedResponse, 
  Project, User as UserType, QuestionnaireTemplate, Beneficiary,
  QuestionAnswer, Question, QuestionnaireSection
} from '../../types';
import { Card, Button, Badge, Input, Select, Modal, ProgressBar } from '../../components/ui';

// ============== TYPES ==============
type ViewMode = 'kanban' | 'list' | 'calendar';

interface KanbanColumn {
  id: InterviewStatus;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

interface InterviewFilters {
  search: string;
  project: string;
  interviewer: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}

// ============== CONSTANTS ==============
const KANBAN_COLUMNS: KanbanColumn[] = [
  { 
    id: 'draft', 
    title: 'Draft', 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-200',
    icon: <FileText className="w-4 h-4" />
  },
  { 
    id: 'in_progress', 
    title: 'In Progress', 
    color: 'text-amber-600', 
    bgColor: 'bg-amber-50', 
    borderColor: 'border-amber-200',
    icon: <PlayCircle className="w-4 h-4" />
  },
  { 
    id: 'submitted', 
    title: 'Submitted', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50', 
    borderColor: 'border-blue-200',
    icon: <Send className="w-4 h-4" />
  },
  { 
    id: 'reviewed', 
    title: 'Under Review', 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-50', 
    borderColor: 'border-purple-200',
    icon: <Eye className="w-4 h-4" />
  },
  { 
    id: 'approved', 
    title: 'Approved', 
    color: 'text-emerald-600', 
    bgColor: 'bg-emerald-50', 
    borderColor: 'border-emerald-200',
    icon: <CheckCircle className="w-4 h-4" />
  },
  { 
    id: 'rejected', 
    title: 'Rejected', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-200',
    icon: <XCircle className="w-4 h-4" />
  },
];

const STATUS_CONFIG: Record<InterviewStatus, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
  draft: { variant: 'default', label: 'Draft' },
  in_progress: { variant: 'warning', label: 'In Progress' },
  submitted: { variant: 'info', label: 'Submitted' },
  reviewed: { variant: 'info', label: 'Reviewed' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'danger', label: 'Rejected' },
};

// ============== MAIN COMPONENT ==============
const InterviewsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [interviewers, setInterviewers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<InterviewFilters>({
    search: '',
    project: '',
    interviewer: '',
    dateFrom: '',
    dateTo: '',
    status: '',
  });

  // Modal states
  const [showNewInterviewModal, setShowNewInterviewModal] = useState(false);
  const [showConductModal, setShowConductModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<InterviewResponse | null>(null);
  const [draggedInterview, setDraggedInterview] = useState<InterviewResponse | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [interviewsData, projectsData, usersData] = await Promise.all([
        api.get<PaginatedResponse<InterviewResponse> | InterviewResponse[]>(endpoints.interviews),
        api.get<PaginatedResponse<Project> | Project[]>(endpoints.projects),
        api.get<PaginatedResponse<UserType> | UserType[]>(endpoints.fieldResources),
      ]);
      
      setInterviews(Array.isArray(interviewsData) ? interviewsData : interviewsData.results);
      setProjects(Array.isArray(projectsData) ? projectsData : projectsData.results);
      setInterviewers(Array.isArray(usersData) ? usersData : usersData.results);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  // Filtered interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter(interview => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          interview.beneficiary_name?.toLowerCase().includes(searchLower) ||
          interview.project_code?.toLowerCase().includes(searchLower) ||
          interview.interviewer_name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.project && interview.project.toString() !== filters.project) return false;
      if (filters.interviewer && interview.interviewer?.toString() !== filters.interviewer) return false;
      if (filters.status && interview.status !== filters.status) return false;
      if (filters.dateFrom && interview.interview_date < filters.dateFrom) return false;
      if (filters.dateTo && interview.interview_date > filters.dateTo) return false;
      return true;
    });
  }, [interviews, filters]);

  // Statistics
  const stats = useMemo(() => {
    const total = interviews.length;
    const byStatus = interviews.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {} as Record<InterviewStatus, number>);
    
    const withScores = interviews.filter(i => i.impact_score !== null && i.impact_score !== undefined && !isNaN(i.impact_score));
    const avgScore = withScores.length > 0
      ? (withScores.reduce((sum, i) => sum + (i.impact_score || 0), 0) / withScores.length)
      : 0;
    
    const todayInterviews = interviews.filter(i => 
      i.interview_date === new Date().toISOString().split('T')[0]
    ).length;
    
    const completionRate = total > 0 
      ? ((byStatus.approved || 0) / total * 100)
      : 0;

    return { total, byStatus, avgScore: isNaN(avgScore) ? 0 : avgScore, todayInterviews, completionRate };
  }, [interviews]);

  // Interviews grouped by status for Kanban
  const interviewsByStatus = useMemo(() => {
    const grouped: Record<InterviewStatus, InterviewResponse[]> = {
      draft: [],
      in_progress: [],
      submitted: [],
      reviewed: [],
      approved: [],
      rejected: [],
    };
    
    filteredInterviews.forEach(interview => {
      grouped[interview.status].push(interview);
    });
    
    return grouped;
  }, [filteredInterviews]);

  // Handlers
  const handleFilterChange = (key: keyof InterviewFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleViewDetails = (interview: InterviewResponse) => {
    navigate(`/interviews/${interview.id}`);
  };

  const handleConductInterview = (interview: InterviewResponse) => {
    setSelectedInterview(interview);
    setShowConductModal(true);
  };

  const handleReviewInterview = (interview: InterviewResponse) => {
    setSelectedInterview(interview);
    setShowReviewModal(true);
  };

  const handleStatusChange = async (interview: InterviewResponse, newStatus: InterviewStatus) => {
    try {
      await api.patch(`${endpoints.interviews}${interview.id}/`, { status: newStatus });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteInterview = async (interview: InterviewResponse) => {
    if (!window.confirm('Are you sure you want to delete this interview?')) return;
    try {
      await api.delete(`${endpoints.interviews}${interview.id}/`);
      loadData();
    } catch (error) {
      console.error('Error deleting interview:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (interview: InterviewResponse) => {
    setDraggedInterview(interview);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (targetStatus: InterviewStatus) => {
    if (!draggedInterview || draggedInterview.status === targetStatus) {
      setDraggedInterview(null);
      return;
    }

    // Validate status transitions
    const validTransitions: Record<InterviewStatus, InterviewStatus[]> = {
      draft: ['in_progress'],
      in_progress: ['submitted', 'draft'],
      submitted: ['reviewed', 'in_progress'],
      reviewed: ['approved', 'rejected', 'submitted'],
      approved: [],
      rejected: ['in_progress'],
    };

    if (!validTransitions[draggedInterview.status].includes(targetStatus)) {
      alert(`Cannot move from ${draggedInterview.status} to ${targetStatus}`);
      setDraggedInterview(null);
      return;
    }

    await handleStatusChange(draggedInterview, targetStatus);
    setDraggedInterview(null);
  };

  // Handle stat card click - filter by status
  const handleStatCardClick = (status: string | null) => {
    if (status === null) {
      setFilters(prev => ({ ...prev, status: '' }));
    } else {
      setFilters(prev => ({ ...prev, status }));
    }
    if (status) {
      setViewMode('list');
    }
  };

  // Render functions
  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <Card 
        className={`p-4 bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${filters.status === '' ? 'ring-2 ring-gray-400' : ''}`}
        onClick={() => handleStatCardClick(null)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-200 rounded-lg">
            <ClipboardList className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </Card>
      
      <Card 
        className={`p-4 bg-gradient-to-br from-amber-50 to-amber-100 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${filters.status === 'in_progress' ? 'ring-2 ring-amber-400' : ''}`}
        onClick={() => handleStatCardClick('in_progress')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-200 rounded-lg">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{stats.byStatus.in_progress || 0}</p>
            <p className="text-xs text-amber-700">In Progress</p>
          </div>
        </div>
      </Card>
      
      <Card 
        className={`p-4 bg-gradient-to-br from-blue-50 to-blue-100 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${filters.status === 'submitted' ? 'ring-2 ring-blue-400' : ''}`}
        onClick={() => handleStatCardClick('submitted')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-200 rounded-lg">
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-600">{stats.byStatus.submitted || 0}</p>
            <p className="text-xs text-blue-700">Pending Review</p>
          </div>
        </div>
      </Card>
      
      <Card 
        className={`p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${filters.status === 'approved' ? 'ring-2 ring-emerald-400' : ''}`}
        onClick={() => handleStatCardClick('approved')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{stats.byStatus.approved || 0}</p>
            <p className="text-xs text-emerald-700">Approved</p>
          </div>
        </div>
      </Card>
      
      <Card 
        className={`p-4 bg-gradient-to-br from-purple-50 to-purple-100 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${filters.status === 'reviewed' ? 'ring-2 ring-purple-400' : ''}`}
        onClick={() => handleStatCardClick('reviewed')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-200 rounded-lg">
            <Star className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : '-'}
            </p>
            <p className="text-xs text-purple-700">Avg. Score</p>
          </div>
        </div>
      </Card>
      
      <Card 
        className={`p-4 bg-gradient-to-br from-red-50 to-red-100 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 ${filters.status === 'rejected' ? 'ring-2 ring-red-400' : ''}`}
        onClick={() => handleStatCardClick('rejected')}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-200 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.byStatus.rejected || 0}</p>
            <p className="text-xs text-red-700">Rejected</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderFilters = () => (
    <Card className={`p-4 mb-6 transition-all duration-300 ${showFilters ? 'block' : 'hidden'}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Input
          placeholder="Search beneficiary, project..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
        <Select
          options={[
            { value: '', label: 'All Projects' },
            ...projects.map(p => ({ value: p.id.toString(), label: `${p.code} - ${p.title}` }))
          ]}
          value={filters.project}
          onChange={(e) => handleFilterChange('project', e.target.value)}
        />
        <Select
          options={[
            { value: '', label: 'All Interviewers' },
            ...interviewers.map(i => ({ value: i.id.toString(), label: `${i.first_name} ${i.last_name}` }))
          ]}
          value={filters.interviewer}
          onChange={(e) => handleFilterChange('interviewer', e.target.value)}
        />
        <Select
          options={[
            { value: '', label: 'All Statuses' },
            ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({ value, label: config.label }))
          ]}
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        />
        <Input
          type="date"
          placeholder="From Date"
          value={filters.dateFrom}
          onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
        />
        <Input
          type="date"
          placeholder="To Date"
          value={filters.dateTo}
          onChange={(e) => handleFilterChange('dateTo', e.target.value)}
        />
      </div>
      <div className="flex justify-end mt-4">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setFilters({ search: '', project: '', interviewer: '', dateFrom: '', dateTo: '', status: '' })}
        >
          Clear Filters
        </Button>
      </div>
    </Card>
  );

  const renderKanbanCard = (interview: InterviewResponse) => (
    <div
      key={interview.id}
      draggable
      onDragStart={() => handleDragStart(interview)}
      onClick={() => handleViewDetails(interview)}
      className={`
        bg-white rounded-lg border border-gray-200 p-4 mb-3 
        shadow-sm hover:shadow-md transition-all duration-200 
        cursor-pointer hover:border-emerald-300
        ${draggedInterview?.id === interview.id ? 'opacity-50 scale-95' : ''}
      `}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm truncate max-w-[140px]" title={interview.beneficiary_name}>
              {interview.beneficiary_name}
            </p>
            <p className="text-xs text-gray-500">{interview.beneficiary_id}</p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <InterviewCardMenu 
            interview={interview} 
            onView={() => handleViewDetails(interview)}
            onConduct={() => handleConductInterview(interview)}
            onReview={() => handleReviewInterview(interview)}
            onDelete={() => handleDeleteInterview(interview)}
          />
        </div>
      </div>

      {/* Project Badge */}
      <div className="mb-3">
        <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
          <Building className="w-3 h-3 mr-1" />
          {interview.project_code}
        </span>
      </div>

      {/* Meta Info */}
      <div className="space-y-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" />
          <span>{new Date(interview.interview_date).toLocaleDateString()}</span>
        </div>
        {interview.interviewer_name && (
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{interview.interviewer_name}</span>
          </div>
        )}
        {interview.interview_location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{interview.interview_location}</span>
          </div>
        )}
      </div>

      {/* Score (if available) */}
      {interview.impact_score && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Impact Score</span>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="font-semibold text-sm text-gray-900">{interview.impact_score}/5</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress for in-progress interviews */}
      {interview.status === 'in_progress' && interview.answer_count !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium text-gray-700">{interview.answer_count} answers</span>
          </div>
          <ProgressBar value={interview.answer_count} max={20} />
        </div>
      )}
    </div>
  );

  const renderKanbanView = () => (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map(column => {
        const columnInterviews = interviewsByStatus[column.id];
        const count = columnInterviews.length;
        
        return (
          <div 
            key={column.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            {/* Column Header */}
            <div className={`rounded-t-xl p-4 ${column.bgColor} border ${column.borderColor} border-b-0`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={column.color}>{column.icon}</span>
                  <h3 className={`font-semibold ${column.color}`}>{column.title}</h3>
                </div>
                <span className={`
                  px-2 py-0.5 rounded-full text-xs font-medium
                  ${column.bgColor} ${column.color} border ${column.borderColor}
                `}>
                  {count}
                </span>
              </div>
            </div>
            
            {/* Column Body */}
            <div 
              className={`
                min-h-[500px] rounded-b-xl p-3 border ${column.borderColor} border-t-0
                bg-gradient-to-b from-gray-50/50 to-white
                ${draggedInterview && draggedInterview.status !== column.id ? 'ring-2 ring-emerald-300 ring-inset' : ''}
              `}
            >
              {columnInterviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <ClipboardList className="w-8 h-8 mb-2" />
                  <p className="text-sm">No interviews</p>
                </div>
              ) : (
                columnInterviews.map(renderKanbanCard)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Beneficiary
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Interviewer
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInterviews.map(interview => (
              <tr 
                key={interview.id} 
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleViewDetails(interview)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{interview.beneficiary_name}</p>
                      <p className="text-sm text-gray-500">{interview.beneficiary_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-sm font-medium text-gray-700">
                    {interview.project_code}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {interview.interviewer_name || '-'}
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {new Date(interview.interview_date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={STATUS_CONFIG[interview.status].variant}>
                    {STATUS_CONFIG[interview.status].label}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  {interview.impact_score ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-semibold text-gray-900">{interview.impact_score}/5</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleViewDetails(interview)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {['draft', 'in_progress'].includes(interview.status) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleConductInterview(interview)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {interview.status === 'submitted' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleReviewInterview(interview)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredInterviews.length === 0 && (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No interviews found</p>
          </div>
        )}
      </div>
    </Card>
  );

  const renderCalendarView = () => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const interviewsByDate = interviews.reduce((acc, interview) => {
      const date = interview.interview_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(interview);
      return acc;
    }, {} as Record<string, InterviewResponse[]>);

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-gray-50" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayInterviews = interviewsByDate[dateStr] || [];
      const isToday = day === today.getDate() && month === today.getMonth();
      
      days.push(
        <div 
          key={day} 
          className={`h-32 border border-gray-100 p-2 ${isToday ? 'bg-emerald-50 ring-2 ring-emerald-500 ring-inset' : 'bg-white'}`}
        >
          <p className={`text-sm font-medium mb-1 ${isToday ? 'text-emerald-600' : 'text-gray-700'}`}>
            {day}
          </p>
          <div className="space-y-1 overflow-y-auto max-h-24">
            {dayInterviews.slice(0, 3).map(interview => (
              <div 
                key={interview.id}
                onClick={() => handleViewDetails(interview)}
                className={`
                  text-xs px-2 py-1 rounded cursor-pointer truncate
                  ${STATUS_CONFIG[interview.status].variant === 'success' ? 'bg-emerald-100 text-emerald-700' : ''}
                  ${STATUS_CONFIG[interview.status].variant === 'warning' ? 'bg-amber-100 text-amber-700' : ''}
                  ${STATUS_CONFIG[interview.status].variant === 'info' ? 'bg-blue-100 text-blue-700' : ''}
                  ${STATUS_CONFIG[interview.status].variant === 'danger' ? 'bg-red-100 text-red-700' : ''}
                  ${STATUS_CONFIG[interview.status].variant === 'default' ? 'bg-gray-100 text-gray-700' : ''}
                `}
              >
                {interview.beneficiary_name}
              </div>
            ))}
            {dayInterviews.length > 3 && (
              <p className="text-xs text-gray-500">+{dayInterviews.length - 3} more</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {today.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-600">
              {day}
            </div>
          ))}
          {days}
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Pipeline</h1>
          <p className="text-gray-500 mt-1">Manage and track all interview responses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide' : 'Filters'}
          </Button>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-white shadow-sm' : ''}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded ${viewMode === 'calendar' ? 'bg-white shadow-sm' : ''}`}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={() => setShowNewInterviewModal(true)}>
            <Plus className="w-4 h-4" />
            New Interview
          </Button>
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Active Filter Indicator */}
      {filters.status && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Filter className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700">
            Showing: <strong>{STATUS_CONFIG[filters.status as InterviewStatus]?.label || filters.status}</strong> interviews
          </span>
          <button 
            onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
            className="ml-auto px-3 py-1 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Filters */}
      {renderFilters()}

      {/* Main Content */}
      {viewMode === 'kanban' && renderKanbanView()}
      {viewMode === 'list' && renderListView()}
      {viewMode === 'calendar' && renderCalendarView()}

      {/* Modals */}
      {showNewInterviewModal && (
        <NewInterviewModal
          projects={projects}
          interviewers={interviewers}
          onClose={() => setShowNewInterviewModal(false)}
          onSuccess={() => {
            setShowNewInterviewModal(false);
            loadData();
          }}
        />
      )}

      {selectedInterview && showConductModal && (
        <ConductInterviewModal
          interview={selectedInterview}
          onClose={() => {
            setShowConductModal(false);
            setSelectedInterview(null);
          }}
          onSuccess={() => {
            setShowConductModal(false);
            setSelectedInterview(null);
            loadData();
          }}
        />
      )}

      {selectedInterview && showReviewModal && (
        <ReviewInterviewModal
          interview={selectedInterview}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedInterview(null);
          }}
          onSuccess={() => {
            setShowReviewModal(false);
            setSelectedInterview(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// ============== SUB-COMPONENTS ==============

// Interview Card Menu
const InterviewCardMenu: React.FC<{
  interview: InterviewResponse;
  onView: () => void;
  onConduct: () => void;
  onReview: () => void;
  onDelete: () => void;
}> = ({ interview, onView, onConduct, onReview, onDelete }) => {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={() => setOpen(!open)}
        className="p-1 hover:bg-gray-100 rounded"
      >
        <MoreVertical className="w-4 h-4 text-gray-400" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
            <button 
              onClick={() => { onView(); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" /> View Details
            </button>
            {['draft', 'in_progress'].includes(interview.status) && (
              <button 
                onClick={() => { onConduct(); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" /> Continue
              </button>
            )}
            {interview.status === 'submitted' && (
              <button 
                onClick={() => { onReview(); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Review
              </button>
            )}
            <button 
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// New Interview Modal
const NewInterviewModal: React.FC<{
  projects: Project[];
  interviewers: UserType[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ projects, interviewers, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireTemplate[]>([]);
  
  const [formData, setFormData] = useState({
    project: '',
    beneficiary: '',
    questionnaire: '',
    interviewer: '',
    interview_date: new Date().toISOString().split('T')[0],
    interview_location: '',
  });

  useEffect(() => {
    if (formData.project) {
      loadProjectData(parseInt(formData.project));
    }
  }, [formData.project]);

  const loadProjectData = async (projectId: number) => {
    try {
      const [beneficiariesData, questionnairesData] = await Promise.all([
        api.get<PaginatedResponse<Beneficiary> | Beneficiary[]>(`${endpoints.beneficiaries}?project=${projectId}&is_interviewed=false`),
        api.get<PaginatedResponse<QuestionnaireTemplate> | QuestionnaireTemplate[]>(`${endpoints.projectQuestionnaires}?project=${projectId}`),
      ]);
      
      setBeneficiaries(Array.isArray(beneficiariesData) ? beneficiariesData : beneficiariesData.results);
      setQuestionnaires(Array.isArray(questionnairesData) ? questionnairesData : questionnairesData.results);
    } catch (error) {
      console.error('Error loading project data:', error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      await api.post(endpoints.interviews, {
        project: parseInt(formData.project),
        beneficiary: parseInt(formData.beneficiary),
        questionnaire: parseInt(formData.questionnaire),
        interviewer: formData.interviewer ? parseInt(formData.interviewer) : null,
        interview_date: formData.interview_date,
        interview_location: formData.interview_location,
        status: 'draft',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to create interview');
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Schedule New Interview" size="lg">
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${step >= s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}
              `}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 rounded ${step > s ? 'bg-emerald-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Select Project & Beneficiary */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Step 1: Select Project & Beneficiary</h3>
            
            <Select
              label="Project *"
              options={[
                { value: '', label: 'Select a project' },
                ...projects.map(p => ({ value: p.id.toString(), label: `${p.code} - ${p.title}` }))
              ]}
              value={formData.project}
              onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value, beneficiary: '', questionnaire: '' }))}
            />

            {formData.project && (
              <Select
                label="Beneficiary *"
                options={[
                  { value: '', label: `Select a beneficiary (${beneficiaries.length} available)` },
                  ...beneficiaries.map(b => ({ value: b.id.toString(), label: `${b.beneficiary_id} - ${b.name}` }))
                ]}
                value={formData.beneficiary}
                onChange={(e) => setFormData(prev => ({ ...prev, beneficiary: e.target.value }))}
              />
            )}

            {formData.project && beneficiaries.length === 0 && (
              <div className="p-4 bg-amber-50 rounded-lg text-amber-700 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                No uninterviewed beneficiaries found for this project.
              </div>
            )}
          </div>
        )}

        {/* Step 2: Select Questionnaire & Interviewer */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Step 2: Select Questionnaire & Interviewer</h3>
            
            <Select
              label="Questionnaire *"
              options={[
                { value: '', label: 'Select a questionnaire' },
                ...questionnaires.map(q => ({ value: q.id.toString(), label: q.name }))
              ]}
              value={formData.questionnaire}
              onChange={(e) => setFormData(prev => ({ ...prev, questionnaire: e.target.value }))}
            />

            <Select
              label="Interviewer (optional)"
              options={[
                { value: '', label: 'Assign later' },
                ...interviewers.map(i => ({ value: i.id.toString(), label: `${i.first_name} ${i.last_name}` }))
              ]}
              value={formData.interviewer}
              onChange={(e) => setFormData(prev => ({ ...prev, interviewer: e.target.value }))}
            />
          </div>
        )}

        {/* Step 3: Schedule Details */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Step 3: Schedule Details</h3>
            
            <Input
              label="Interview Date *"
              type="date"
              value={formData.interview_date}
              onChange={(e) => setFormData(prev => ({ ...prev, interview_date: e.target.value }))}
            />

            <Input
              label="Location"
              placeholder="Enter interview location"
              value={formData.interview_location}
              onChange={(e) => setFormData(prev => ({ ...prev, interview_location: e.target.value }))}
            />

            {/* Summary */}
            <Card className="p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-3">Interview Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Project:</span>
                  <span className="font-medium">{projects.find(p => p.id.toString() === formData.project)?.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Beneficiary:</span>
                  <span className="font-medium">{beneficiaries.find(b => b.id.toString() === formData.beneficiary)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Questionnaire:</span>
                  <span className="font-medium">{questionnaires.find(q => q.id.toString() === formData.questionnaire)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">{formData.interview_date}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button 
            variant="ghost" 
            onClick={step > 1 ? () => setStep(step - 1) : onClose}
          >
            {step > 1 ? 'Back' : 'Cancel'}
          </Button>
          
          {step < 3 ? (
            <Button 
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && (!formData.project || !formData.beneficiary)) ||
                (step === 2 && !formData.questionnaire)
              }
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Interview'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// Conduct Interview Modal
const ConductInterviewModal: React.FC<{
  interview: InterviewResponse;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ interview, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sections, setSections] = useState<QuestionnaireSection[]>([]);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuestionnaire();
  }, []);

  const loadQuestionnaire = async () => {
    try {
      const interviewData = await api.get<InterviewResponse>(`${endpoints.interviews}${interview.id}/`);
      const templateData = await api.get<QuestionnaireTemplate>(
        `${endpoints.templates}${interviewData.questionnaire}/`
      );
      
      setSections(templateData.sections || []);
      
      const existingAnswers = interviewData.answers || [];
      const answersMap: Record<number, any> = {};
      existingAnswers.forEach(ans => {
        answersMap[ans.question] = {
          text_value: ans.text_value,
          numeric_value: ans.numeric_value,
          date_value: ans.date_value,
          selected_options: ans.selected_options || [],
        };
      });
      setAnswers(answersMap);
    } catch (error) {
      console.error('Error loading questionnaire:', error);
      setError('Failed to load questionnaire');
    }
    setLoading(false);
  };

  const handleAnswerChange = (questionId: number, value: any, field: string = 'text_value') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      }
    }));
  };

  const handleSave = async (submit: boolean = false) => {
    if (submit) {
      setSubmitting(true);
    } else {
      setSaving(true);
    }
    setError('');

    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        question: parseInt(questionId),
        ...answer,
      }));

      await api.post(`${endpoints.interviews}${interview.id}/save_answers/`, {
        answers: answersArray,
      });

      if (submit) {
        await api.post(`${endpoints.interviews}${interview.id}/submit/`, {});
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to save answers');
    }
    setSaving(false);
    setSubmitting(false);
  };

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id] || {};

    switch (question.question_type) {
      case 'text':
        return (
          <Input
            value={answer.text_value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer"
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={answer.text_value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            rows={4}
            placeholder="Enter your answer"
          />
        );
      
      case 'number':
      case 'decimal':
        return (
          <Input
            type="number"
            value={answer.numeric_value ?? ''}
            onChange={(e) => handleAnswerChange(question.id, parseFloat(e.target.value), 'numeric_value')}
            placeholder="Enter a number"
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={answer.date_value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, 'date_value')}
          />
        );
      
      case 'single_choice':
      case 'dropdown':
        return (
          <div className="space-y-2">
            {question.options.map((option, idx) => (
              <label key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  checked={(answer.selected_options || [])[0] === option}
                  onChange={() => handleAnswerChange(question.id, [option], 'selected_options')}
                  className="w-4 h-4 text-emerald-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.options.map((option, idx) => (
              <label key={idx} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={(answer.selected_options || []).includes(option)}
                  onChange={(e) => {
                    const current = answer.selected_options || [];
                    const updated = e.target.checked
                      ? [...current, option]
                      : current.filter((o: string) => o !== option);
                    handleAnswerChange(question.id, updated, 'selected_options');
                  }}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      
      case 'yes_no':
        return (
          <div className="flex gap-4">
            {['Yes', 'No'].map(option => (
              <label key={option} className="flex-1">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  checked={(answer.selected_options || [])[0] === option}
                  onChange={() => handleAnswerChange(question.id, [option], 'selected_options')}
                  className="hidden"
                />
                <div className={`
                  p-4 text-center border-2 rounded-lg cursor-pointer transition-all
                  ${(answer.selected_options || [])[0] === option
                    ? option === 'Yes' ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}>
                  {option === 'Yes' ? (
                    <CheckCircle className={`w-6 h-6 mx-auto mb-1 ${(answer.selected_options || [])[0] === option ? 'text-emerald-600' : 'text-gray-400'}`} />
                  ) : (
                    <XCircle className={`w-6 h-6 mx-auto mb-1 ${(answer.selected_options || [])[0] === option ? 'text-red-600' : 'text-gray-400'}`} />
                  )}
                  <span className="font-medium">{option}</span>
                </div>
              </label>
            ))}
          </div>
        );
      
      case 'rating':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => handleAnswerChange(question.id, star, 'numeric_value')}
                className="p-2"
              >
                <Star className={`w-8 h-8 ${
                  answer.numeric_value >= star 
                    ? 'text-amber-500 fill-amber-500' 
                    : 'text-gray-300'
                }`} />
              </button>
            ))}
          </div>
        );
      
      case 'likert':
        const likertOptions = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
        return (
          <div className="grid grid-cols-5 gap-2">
            {likertOptions.map((option, idx) => (
              <label key={option} className="text-center cursor-pointer">
                <input
                  type="radio"
                  name={`question_${question.id}`}
                  checked={answer.numeric_value === idx + 1}
                  onChange={() => handleAnswerChange(question.id, idx + 1, 'numeric_value')}
                  className="hidden"
                />
                <div className={`
                  p-3 rounded-lg border-2 transition-all text-xs
                  ${answer.numeric_value === idx + 1 ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}
                `}>
                  <div className={`text-lg font-bold mb-1 ${answer.numeric_value === idx + 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {idx + 1}
                  </div>
                  {option}
                </div>
              </label>
            ))}
          </div>
        );
      
      default:
        return (
          <Input
            value={answer.text_value || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer"
          />
        );
    }
  };

  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Loading..." size="xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      </Modal>
    );
  }

  const currentSectionData = sections[currentSection];
  const totalQuestions = sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0);
  const answeredQuestions = Object.keys(answers).length;
  const progress = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  return (
    <Modal isOpen={true} onClose={onClose} title={`Conduct Interview - ${interview.beneficiary_name}`} size="xl">
      <div className="space-y-6">
        <Card className="p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Project</p>
              <p className="font-medium">{interview.project_code}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Progress</p>
              <p className="font-medium">{answeredQuestions} / {totalQuestions} questions</p>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={progress} max={100} />
          </div>
        </Card>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => setCurrentSection(idx)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                ${currentSection === idx 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {section.title}
            </button>
          ))}
        </div>

        {currentSectionData && (
          <div className="space-y-6">
            <div className="border-b pb-2">
              <h3 className="font-semibold text-lg text-gray-900">{currentSectionData.title}</h3>
              {currentSectionData.description && (
                <p className="text-sm text-gray-500 mt-1">{currentSectionData.description}</p>
              )}
            </div>

            {currentSectionData.questions?.map((question, idx) => (
              <div key={question.id} className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-start gap-4 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-medium text-sm">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {question.text}
                      {question.is_required && <span className="text-red-500 ml-1">*</span>}
                    </p>
                    {question.help_text && (
                      <p className="text-sm text-gray-500 mt-1">{question.help_text}</p>
                    )}
                  </div>
                </div>
                <div className="ml-12">
                  {renderQuestion(question)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
              disabled={currentSection === 0}
            >
              Previous Section
            </Button>
            <Button
              variant="ghost"
              onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
              disabled={currentSection === sections.length - 1}
            >
              Next Section
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={() => handleSave(true)} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Review Interview Modal
const ReviewInterviewModal: React.FC<{
  interview: InterviewResponse;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ interview, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');

  const handleReview = async (action: 'approve' | 'reject') => {
    setLoading(true);
    setError('');

    try {
      await api.post(`${endpoints.interviews}${interview.id}/review/`, {
        action,
        comments,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Review failed');
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Review Interview" size="md">
      <div className="space-y-6">
        <Card className="p-4 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Beneficiary</p>
              <p className="font-medium">{interview.beneficiary_name}</p>
            </div>
            <div>
              <p className="text-gray-500">Project</p>
              <p className="font-medium">{interview.project_code}</p>
            </div>
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-medium">{new Date(interview.interview_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Interviewer</p>
              <p className="font-medium">{interview.interviewer_name}</p>
            </div>
            {interview.impact_score && (
              <div className="col-span-2">
                <p className="text-gray-500">Impact Score</p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star}
                      className={`w-5 h-5 ${star <= interview.impact_score! ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`} 
                    />
                  ))}
                  <span className="ml-2 font-medium">{interview.impact_score}/5</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Review Comments
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            rows={4}
            placeholder="Add any comments or feedback for the interviewer..."
          />
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => handleReview('reject')}
            disabled={loading}
          >
            <XCircle className="w-4 h-4" />
            Reject
          </Button>
          <Button 
            className="flex-1"
            onClick={() => handleReview('approve')}
            disabled={loading}
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </Button>
        </div>
        
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
};

export default InterviewsPage;