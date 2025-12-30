import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Users,
  FileText,
  Calendar,
  MapPin,
  DollarSign,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  User,
  FolderOpen,
  BarChart3,
  ClipboardList,
  Plus,
  Eye,
  Upload,
  ExternalLink,
  TrendingUp,
  UserCheck,
  Mic,
  Video,
  FileCheck,
  MoreVertical,
  Share2,
  Copy,
  Briefcase,
  Globe,
  IndianRupee,
  Percent,
  Hash,
  Activity,
  PieChart as PieChartIcon
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { Project, ProjectStatus } from '../../types';
import { Card, Button, Badge, LoadingSpinner, Modal, ProgressBar } from '../../components/ui';

// Extended Project interface with all API fields
interface ProjectDetails extends Omit<Project, 'client_name' | 'project_manager_name' | 'created_by_name' | 'sector_display' | 'status_display' | 'grant_amount' | 'assessment_budget' | 'created_at' | 'updated_at' | 'completion_percentage'> {
  client_name?: string;
  project_manager_name?: string;
  created_by_name?: string;
  status_display?: string;
  sector_display?: string;
  completion_percentage?: number;
  documents?: ProjectDocument[];
  beneficiary_count?: number;
  sampled_count?: number;
  interviewed_count?: number;
  grant_amount?: string;
  assessment_budget?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProjectDocument {
  id: number;
  name: string;
  file: string;
  file_type: string;
  uploaded_at: string;
  uploaded_by_name?: string;
  size_bytes?: number;
}

interface Beneficiary {
  id: number;
  name: string;
  identifier: string;
  status: string;
  interviewed: boolean;
  assigned_to_name?: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  assigned_beneficiaries: number;
  completed_interviews: number;
  status: 'active' | 'inactive';
}

// Tab type
type TabType = 'overview' | 'beneficiaries' | 'team' | 'documents' | 'timeline' | 'analytics';

// Status badge component
const StatusBadge: React.FC<{ status: ProjectStatus }> = ({ status }) => {
  const variants: Record<ProjectStatus, { bg: string; text: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
    planning: { bg: 'bg-blue-100', text: 'text-blue-700' },
    in_progress: { bg: 'bg-amber-100', text: 'text-amber-700' },
    data_collection: { bg: 'bg-purple-100', text: 'text-purple-700' },
    analysis: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
    reporting: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
    completed: { bg: 'bg-green-100', text: 'text-green-700' },
    on_hold: { bg: 'bg-red-100', text: 'text-red-700' }
  };

  const style = variants[status] || variants.draft;
  const displayText = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
      {displayText}
    </span>
  );
};

// Info Card Component
interface InfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  color?: string;
  subValue?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, label, value, color = 'text-gray-600', subValue }) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg bg-gray-50`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-semibold text-gray-900 truncate">{value || 'N/A'}</p>
        {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
      </div>
    </div>
  </div>
);

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, bgColor, change, changeType }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {change && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${
            changeType === 'up' ? 'text-green-600' : changeType === 'down' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {changeType === 'up' && <TrendingUp className="h-3 w-3" />}
            {change}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${bgColor}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  </div>
);

// Timeline Item Component
interface TimelineItemProps {
  date: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: React.ElementType;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ date, title, description, status, icon: Icon }) => {
  const statusStyles = {
    completed: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-700' },
    current: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-700' },
    upcoming: { bg: 'bg-gray-300', border: 'border-gray-300', text: 'text-gray-500' }
  };

  const style = statusStyles[status];

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className={`w-0.5 h-full ${style.bg} mt-2`} />
      </div>
      <div className="pb-8">
        <p className={`text-sm font-medium ${style.text}`}>{date}</p>
        <h4 className="font-semibold text-gray-900 mt-1">{title}</h4>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
};

const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sample data for beneficiaries (would come from API)
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'beneficiaries' && project) {
      loadBeneficiaries();
    }
    if (activeTab === 'team' && project) {
      loadTeamMembers();
    }
  }, [activeTab, project]);

  const loadProject = async () => {
    try {
      const data = await api.get<ProjectDetails>(`${endpoints.projects}${id}/`);
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
    }
    setLoading(false);
  };

  const loadBeneficiaries = async () => {
    setLoadingBeneficiaries(true);
    try {
      const data = await api.get<{ results: Beneficiary[] }>(`${endpoints.beneficiaries}?project=${id}`);
      setBeneficiaries(data.results || []);
    } catch (error) {
      console.error('Error loading beneficiaries:', error);
    }
    setLoadingBeneficiaries(false);
  };

  const loadTeamMembers = async () => {
    try {
      const data = await api.get<{ results: TeamMember[] }>(`${endpoints.assignments}?project=${id}`);
      // Transform assignments to team members
      setTeamMembers(data.results || []);
    } catch (error) {
      console.error('Error loading team:', error);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await api.delete(`${endpoints.projects}${project.id}/`);
      navigate('/projects');
    } catch (error) {
      alert('Failed to delete project');
      console.error('Error deleting project:', error);
    }
    setDeleting(false);
  };

  const handleExport = () => {
    if (!project) return;
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${project.code}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Format currency
  const formatCurrency = (value: string | number | null | undefined): string => {
    if (!value) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Format date
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Chart data
  const progressData = project ? [
    { name: 'Interviewed', value: project.interviewed_count || 0, color: '#10B981' },
    { name: 'Sampled', value: (project.sampled_count || 0) - (project.interviewed_count || 0), color: '#3B82F6' },
    { name: 'Remaining', value: (project.sample_size || 0) - (project.sampled_count || 0), color: '#E5E7EB' },
  ] : [];

  const beneficiaryData = project ? [
    { name: 'Total', count: project.total_beneficiaries || 0 },
    { name: 'Sample', count: project.sample_size || 0 },
    { name: 'Sampled', count: project.sampled_count || 0 },
    { name: 'Interviewed', count: project.interviewed_count || 0 },
  ] : [];

  const COLORS = ['#10B981', '#3B82F6', '#E5E7EB'];

  // Tabs configuration
  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: FolderOpen },
    { id: 'beneficiaries', label: 'Beneficiaries', icon: Users },
    { id: 'team', label: 'Team', icon: UserCheck },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
        <p className="text-gray-500 mb-4">The project you're looking for doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate('/projects')}>
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: Back button and project info */}
          <div className="flex-1">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </button>
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <FolderOpen className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
                  <StatusBadge status={project.status} />
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Hash className="h-4 w-4" />
                    {project.code}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {project.client_name || 'No Client'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {project.sector_display || project.sector}
                  </span>
                </div>
                {project.description && (
                  <p className="text-gray-600 mt-3 max-w-2xl">{project.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => navigate(`/projects/${project.id}/edit`)}>
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteModal(true)}
              className="text-red-600 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-bold text-gray-900">{project.completion_percentage?.toFixed(1) || 0}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${project.completion_percentage || 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{project.interviewed_count || 0} interviewed</span>
            <span>{project.sample_size || 0} target sample</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-emerald-600 border-emerald-600 bg-emerald-50/50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Beneficiaries"
                  value={project.total_beneficiaries || 0}
                  icon={Users}
                  color="text-blue-600"
                  bgColor="bg-blue-50"
                />
                <StatCard
                  title="Sample Size"
                  value={project.sample_size || 0}
                  icon={Target}
                  color="text-emerald-600"
                  bgColor="bg-emerald-50"
                  change={`${project.sample_percentage || 15}% of total`}
                  changeType="neutral"
                />
                <StatCard
                  title="Interviewed"
                  value={project.interviewed_count || 0}
                  icon={CheckCircle2}
                  color="text-green-600"
                  bgColor="bg-green-50"
                />
                <StatCard
                  title="Beneficiaries Added"
                  value={project.beneficiary_count || 0}
                  icon={UserCheck}
                  color="text-purple-600"
                  bgColor="bg-purple-50"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Progress Pie Chart */}
                <Card className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChartIcon className="h-5 w-5 text-gray-400" />
                    Interview Progress
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={progressData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {progressData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Beneficiary Funnel */}
                <Card className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-gray-400" />
                    Beneficiary Funnel
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={beneficiaryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Project Details Grid */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard icon={Building2} label="Client" value={project.client_name} color="text-blue-600" />
                  <InfoCard icon={User} label="Project Manager" value={project.project_manager_name} color="text-purple-600" />
                  <InfoCard icon={Briefcase} label="Sector" value={project.sector_display || project.sector} color="text-emerald-600" />
                  <InfoCard icon={MapPin} label="States" value={project.states} color="text-rose-600" />
                  <InfoCard icon={Globe} label="Districts" value={project.districts} color="text-amber-600" />
                  <InfoCard icon={Users} label="Beneficiary Type" value={project.beneficiary_type} color="text-indigo-600" />
                </div>
              </div>

              {/* Budget Section */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Budget & Financials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InfoCard 
                    icon={IndianRupee} 
                    label="Grant Amount" 
                    value={formatCurrency(project.grant_amount)} 
                    color="text-green-600" 
                  />
                  <InfoCard 
                    icon={IndianRupee} 
                    label="Assessment Budget" 
                    value={formatCurrency(project.assessment_budget)} 
                    color="text-blue-600" 
                  />
                  <InfoCard 
                    icon={Percent} 
                    label="Sample Percentage" 
                    value={`${project.sample_percentage || 15}%`} 
                    color="text-purple-600" 
                  />
                  <InfoCard 
                    icon={Target} 
                    label="Completion" 
                    value={`${project.completion_percentage?.toFixed(1) || 0}%`} 
                    color="text-emerald-600" 
                  />
                </div>
              </div>

              {/* Objectives */}
              {project.objectives && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Objectives</h3>
                  <Card className="p-4 bg-gray-50">
                    <p className="text-gray-700 whitespace-pre-wrap">{project.objectives}</p>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Beneficiaries Tab */}
          {activeTab === 'beneficiaries' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Project Beneficiaries</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {project.beneficiary_count || 0} beneficiaries added · {project.interviewed_count || 0} interviewed
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate(`/beneficiaries?project=${project.id}`)}>
                    <Eye className="h-4 w-4" /> View All
                  </Button>
                  <Button onClick={() => navigate(`/beneficiaries/add?project=${project.id}`)}>
                    <Plus className="h-4 w-4" /> Add Beneficiary
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{project.total_beneficiaries || 0}</p>
                  <p className="text-sm text-gray-500">Total Population</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">{project.sample_size || 0}</p>
                  <p className="text-sm text-gray-500">Sample Target</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{project.beneficiary_count || 0}</p>
                  <p className="text-sm text-gray-500">Added</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{project.interviewed_count || 0}</p>
                  <p className="text-sm text-gray-500">Interviewed</p>
                </Card>
              </div>

              {/* Beneficiary List */}
              {loadingBeneficiaries ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner />
                </div>
              ) : beneficiaries.length > 0 ? (
                <Card className="overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interviewed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {beneficiaries.slice(0, 10).map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{b.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{b.identifier}</td>
                          <td className="px-4 py-3">
                            <Badge variant={b.status === 'active' ? 'success' : 'default'}>{b.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{b.assigned_to_name || 'Unassigned'}</td>
                          <td className="px-4 py-3">
                            {b.interviewed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-gray-300" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {beneficiaries.length > 10 && (
                    <div className="p-4 border-t bg-gray-50 text-center">
                      <Button variant="outline" onClick={() => navigate(`/beneficiaries?project=${project.id}`)}>
                        View All {beneficiaries.length} Beneficiaries
                      </Button>
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="p-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Beneficiaries Yet</h3>
                  <p className="text-gray-500 mb-4">Start adding beneficiaries to this project</p>
                  <Button onClick={() => navigate(`/beneficiaries/add?project=${project.id}`)}>
                    <Plus className="h-4 w-4" /> Add First Beneficiary
                  </Button>
                </Card>
              )}
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Project Team</h3>
                  <p className="text-sm text-gray-500 mt-1">Field resources and assignments</p>
                </div>
                <Button onClick={() => navigate(`/assignments?project=${project.id}`)}>
                  <Plus className="h-4 w-4" /> Assign Resources
                </Button>
              </div>

              {/* Project Manager */}
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {project.project_manager_name?.charAt(0) || 'PM'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{project.project_manager_name || 'Not Assigned'}</p>
                    <p className="text-sm text-gray-500">Project Manager</p>
                  </div>
                </div>
              </Card>

              {/* Team Members List */}
              {teamMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.map((member) => (
                    <Card key={member.id} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                          {(member.name || '').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">{member.role}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{member.assigned_beneficiaries}</p>
                          <p className="text-xs text-gray-500">assigned</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Team Members Assigned</h3>
                  <p className="text-gray-500 mb-4">Assign field resources to this project</p>
                  <Button onClick={() => navigate(`/assignments?project=${project.id}`)}>
                    <Plus className="h-4 w-4" /> Assign Resources
                  </Button>
                </Card>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Project Documents</h3>
                  <p className="text-sm text-gray-500 mt-1">{project.documents?.length || 0} documents</p>
                </div>
                <Button>
                  <Upload className="h-4 w-4" /> Upload Document
                </Button>
              </div>

              {project.documents && project.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {project.documents.map((doc) => (
                    <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {doc.file_type} · {formatDate(doc.uploaded_at)}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h3>
                  <p className="text-gray-500 mb-4">Upload project documents like contracts, reports, etc.</p>
                  <Button>
                    <Upload className="h-4 w-4" /> Upload First Document
                  </Button>
                </Card>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900">Project Timeline</h3>
              
              {/* Date Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <InfoCard 
                  icon={Calendar} 
                  label="Grant Start" 
                  value={formatDate(project.grant_start_date)} 
                  color="text-blue-600" 
                />
                <InfoCard 
                  icon={Calendar} 
                  label="Grant End" 
                  value={formatDate(project.grant_end_date)} 
                  color="text-blue-600" 
                />
                <InfoCard 
                  icon={Calendar} 
                  label="Assessment Start" 
                  value={formatDate(project.assessment_start_date)} 
                  color="text-emerald-600" 
                />
                <InfoCard 
                  icon={Calendar} 
                  label="Assessment End" 
                  value={formatDate(project.assessment_end_date)} 
                  color="text-emerald-600" 
                />
              </div>

              {/* Timeline Visual */}
              <Card className="p-6">
                <h4 className="font-medium text-gray-900 mb-6">Project Milestones</h4>
                <div className="space-y-0">
                  <TimelineItem
                    date={formatDate(project.created_at)}
                    title="Project Created"
                    description="Project was created and initial setup completed"
                    status="completed"
                    icon={FolderOpen}
                  />
                  <TimelineItem
                    date={formatDate(project.grant_start_date)}
                    title="Grant Period Started"
                    description="Project funding and grant period began"
                    status={project.grant_start_date ? 'completed' : 'upcoming'}
                    icon={DollarSign}
                  />
                  <TimelineItem
                    date={formatDate(project.assessment_start_date)}
                    title="Data Collection Started"
                    description="Field team began collecting data from beneficiaries"
                    status={project.status === 'data_collection' ? 'current' : project.interviewed_count && project.interviewed_count > 0 ? 'completed' : 'upcoming'}
                    icon={ClipboardList}
                  />
                  <TimelineItem
                    date="TBD"
                    title="Analysis Phase"
                    description="Data analysis and insights generation"
                    status={project.status === 'analysis' ? 'current' : 'upcoming'}
                    icon={BarChart3}
                  />
                  <TimelineItem
                    date={formatDate(project.assessment_end_date)}
                    title="Project Completion"
                    description="Final report delivery and project closure"
                    status={project.status === 'completed' ? 'completed' : 'upcoming'}
                    icon={CheckCircle2}
                  />
                </div>
              </Card>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard 
                  icon={Clock} 
                  label="Created At" 
                  value={formatDate(project.created_at)} 
                  subValue={`by ${project.created_by_name || 'System'}`}
                  color="text-gray-600" 
                />
                <InfoCard 
                  icon={Activity} 
                  label="Last Updated" 
                  value={formatDate(project.updated_at)} 
                  color="text-gray-600" 
                />
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Project Analytics</h3>
                  <p className="text-sm text-gray-500 mt-1">Data collection and analysis insights</p>
                </div>
                <Button onClick={() => navigate(`/analytics?project=${project.id}`)}>
                  <BarChart3 className="h-4 w-4" /> Full Analytics
                </Button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Completion Rate"
                  value={`${project.completion_percentage?.toFixed(1) || 0}%`}
                  icon={Target}
                  color="text-emerald-600"
                  bgColor="bg-emerald-50"
                />
                <StatCard
                  title="Interviews Done"
                  value={project.interviewed_count || 0}
                  icon={Mic}
                  color="text-blue-600"
                  bgColor="bg-blue-50"
                />
                <StatCard
                  title="Sample Coverage"
                  value={`${Math.round(((project.interviewed_count || 0) / (project.sample_size || 1)) * 100)}%`}
                  icon={Percent}
                  color="text-purple-600"
                  bgColor="bg-purple-50"
                />
                <StatCard
                  title="Remaining"
                  value={(project.sample_size || 0) - (project.interviewed_count || 0)}
                  icon={Clock}
                  color="text-amber-600"
                  bgColor="bg-amber-50"
                />
              </div>

              {/* Analysis Links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className="p-5 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-red-500"
                  onClick={() => navigate(`/video-analysis?project=${project.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <Video className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Video Analysis</p>
                      <p className="text-sm text-gray-500">View video analysis results</p>
                    </div>
                  </div>
                </Card>

                <Card 
                  className="p-5 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-purple-500"
                  onClick={() => navigate(`/audio-analysis?project=${project.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Mic className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Audio Analysis</p>
                      <p className="text-sm text-gray-500">View transcriptions & summaries</p>
                    </div>
                  </div>
                </Card>

                <Card 
                  className="p-5 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-pink-500"
                  onClick={() => navigate(`/sentiment-analysis?project=${project.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 rounded-lg">
                      <Activity className="h-6 w-6 text-pink-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Sentiment Analysis</p>
                      <p className="text-sm text-gray-500">View sentiment insights</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Placeholder for more analytics */}
              <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">More Analytics Coming Soon</h3>
                <p className="text-gray-500 mb-4">Advanced analytics and reporting features are being developed</p>
                <Button variant="outline" onClick={() => navigate(`/analytics?project=${project.id}`)}>
                  View Basic Analytics
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Project"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">This action cannot be undone</p>
              <p className="text-sm text-red-600 mt-1">
                Deleting this project will permanently remove all associated data including beneficiaries, interviews, and documents.
              </p>
            </div>
          </div>
          
          <p className="text-gray-600">
            Are you sure you want to delete <strong>"{project.title}"</strong>?
          </p>

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectDetailsPage;