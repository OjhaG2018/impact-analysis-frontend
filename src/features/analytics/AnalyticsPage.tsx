import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Line
} from 'recharts';
import { 
  Download, Users, FileText, Target, RefreshCw,
  ChevronDown, ChevronRight, BarChart2,
  Map, Calendar, Award, AlertTriangle, CheckCircle,
  Layers, GitCompare, FileSpreadsheet, FileType, ArrowUpRight,
  ArrowDownRight, Minus, Eye, MessageSquare, X,
  Activity, Zap, Globe, UserCheck, AlertCircle
} from 'lucide-react';
import api, { endpoints } from '../../api';
import { Project } from '../../types';

// ============ LOCAL TYPES ============
interface ProjectAnalytics {
  project_info?: {
    id: number;
    code: string;
    title: string;
    sector: string;
    status: string;
    client: string;
  };
  sampling_progress?: {
    total_beneficiaries: number;
    sample_target: number;
    sampled: number;
    interviewed: number;
    completion_percentage: number;
  };
  response_status?: {
    draft: number;
    in_progress: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
  demographics?: {
    gender: { male: number; female: number; other: number };
    category: Record<string, number>;
    age_groups: Record<string, number>;
    bpl_status: { bpl: number; non_bpl: number };
  };
  geographic_distribution?: {
    by_district: DistrictData[];
    by_state: StateData[];
  };
  impact_metrics?: {
    average_impact_score: number | null;
    score_distribution: Record<string, number>;
    question_averages: QuestionAverage[];
  };
  interview_timeline?: TimelineData[];
  field_resource_performance?: ResourcePerformance[];
}

interface DistrictData { district: string; count: number; interviewed: number; }
interface StateData { state: string; count: number; interviewed: number; }
interface QuestionAverage { question__id: number; question__text: string; avg_score: number; response_count: number; }
interface ResourcePerformance { resource_name: string; target: number; completed: number; completion_rate: number; status: string; }
interface TimelineData { month: string; count: number; approved: number; }
interface CrossTabResult { attribute: string; question: string; cross_tab: Record<string, { count: number; responses: Record<string, number> }>; }
interface ComparisonProject { project_id: number; project_code: string; project_title: string; sector: string; total_beneficiaries: number; sample_size: number; completed_interviews: number; completion_rate: number; average_impact_score: number | null; }

type TabType = 'overview' | 'demographics' | 'geographic' | 'impact' | 'timeline' | 'resources' | 'questions' | 'compare';
type ExportFormat = 'excel' | 'csv';
type ExportType = 'responses' | 'beneficiaries' | 'summary';

const COLORS = {
  primary: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e'],
  secondary: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'],
  neutral: ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'],
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6',
};

const AnalyticsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectsForCompare, setSelectedProjectsForCompare] = useState<number[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonProject[] | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [crossTabAttribute, setCrossTabAttribute] = useState('gender');
  const [crossTabQuestion, setCrossTabQuestion] = useState('');
  const [crossTabData, setCrossTabData] = useState<CrossTabResult | null>(null);
  const [crossTabLoading, setCrossTabLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const data = await api.get<any>(endpoints.projects);
      const projectList = Array.isArray(data) ? data : data.results || [];
      setProjects(projectList);
      console.log('Projects loaded:', projectList.length);
    } catch (e: any) {
      console.error('Error loading projects:', e);
      setError('Failed to load projects');
    }
    setLoading(false);
  };

  const loadAnalytics = useCallback(async (projectId: number) => {
    setAnalyticsLoading(true);
    setError(null);
    
    // Try multiple endpoint patterns
    const endpointPatterns = [
      `/analytics/project/${projectId}/`,
      `/analytics/projects/${projectId}/`,
      `/projects/${projectId}/analytics/`,
      (endpoints as any).projectAnalytics?.(projectId),
    ].filter(Boolean);

    console.log('Trying analytics endpoints:', endpointPatterns);

    for (const endpoint of endpointPatterns) {
      try {
        console.log('Trying endpoint:', endpoint);
        const data = await api.get<ProjectAnalytics>(endpoint);
        console.log('Analytics response:', data);
        
        if (data && typeof data === 'object') {
          setAnalytics(data);
          setAnalyticsLoading(false);
          return;
        }
      } catch (e: any) {
        console.log(`Endpoint ${endpoint} failed:`, e.message);
      }
    }

    // If all endpoints fail, try to build analytics from project data
    console.log('All analytics endpoints failed, building from project data...');
    try {
      await buildAnalyticsFromProject(projectId);
    } catch (e: any) {
      console.error('Failed to build analytics:', e);
      setError(`Analytics API not available. Please ensure the analytics backend is configured.`);
    }
    
    setAnalyticsLoading(false);
  }, []);

  // Build analytics from existing project/beneficiary/response data
  const buildAnalyticsFromProject = async (projectId: number) => {
    try {
      // Fetch project details
      const project = await api.get<any>(`/projects/${projectId}/`);
      
      // Try to fetch beneficiaries
      let beneficiaries: any[] = [];
      try {
        const bData = await api.get<any>(`/beneficiaries/?project=${projectId}`);
        beneficiaries = Array.isArray(bData) ? bData : bData.results || [];
      } catch (e) {
        console.log('Could not fetch beneficiaries');
      }

      // Try to fetch responses
      let responses: any[] = [];
      try {
        const rData = await api.get<any>(`/responses/?project=${projectId}`);
        responses = Array.isArray(rData) ? rData : rData.results || [];
      } catch (e) {
        console.log('Could not fetch responses');
      }

      // Build analytics object
      const builtAnalytics: ProjectAnalytics = {
        project_info: {
          id: project.id,
          code: project.code || project.project_code || 'N/A',
          title: project.title || project.name || 'N/A',
          sector: project.sector || 'N/A',
          status: project.status || 'N/A',
          client: project.client?.name || project.client_name || 'N/A',
        },
        sampling_progress: {
          total_beneficiaries: beneficiaries.length || project.total_beneficiaries || 0,
          sample_target: project.sample_size || 0,
          sampled: beneficiaries.filter((b: any) => b.is_sampled).length || 0,
          interviewed: beneficiaries.filter((b: any) => b.is_interviewed).length || responses.length || 0,
          completion_percentage: project.completion_percentage || 0,
        },
        response_status: {
          draft: responses.filter((r: any) => r.status === 'draft').length,
          in_progress: responses.filter((r: any) => r.status === 'in_progress').length,
          submitted: responses.filter((r: any) => r.status === 'submitted').length,
          approved: responses.filter((r: any) => r.status === 'approved').length,
          rejected: responses.filter((r: any) => r.status === 'rejected').length,
        },
        demographics: {
          gender: {
            male: beneficiaries.filter((b: any) => b.gender === 'male').length,
            female: beneficiaries.filter((b: any) => b.gender === 'female').length,
            other: beneficiaries.filter((b: any) => !['male', 'female'].includes(b.gender)).length,
          },
          category: beneficiaries.reduce((acc: any, b: any) => {
            const cat = b.category || 'Unknown';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          }, {}),
          age_groups: {
            '18-25': beneficiaries.filter((b: any) => b.age >= 18 && b.age < 25).length,
            '25-35': beneficiaries.filter((b: any) => b.age >= 25 && b.age < 35).length,
            '35-45': beneficiaries.filter((b: any) => b.age >= 35 && b.age < 45).length,
            '45-55': beneficiaries.filter((b: any) => b.age >= 45 && b.age < 55).length,
            '55+': beneficiaries.filter((b: any) => b.age >= 55).length,
          },
          bpl_status: {
            bpl: beneficiaries.filter((b: any) => b.bpl_status === true).length,
            non_bpl: beneficiaries.filter((b: any) => b.bpl_status === false).length,
          },
        },
        geographic_distribution: {
          by_district: Object.entries(
            beneficiaries.reduce((acc: any, b: any) => {
              const dist = b.district || 'Unknown';
              if (!acc[dist]) acc[dist] = { district: dist, count: 0, interviewed: 0 };
              acc[dist].count++;
              if (b.is_interviewed) acc[dist].interviewed++;
              return acc;
            }, {})
          ).map(([_, v]) => v as DistrictData),
          by_state: Object.entries(
            beneficiaries.reduce((acc: any, b: any) => {
              const state = b.state || 'Unknown';
              if (!acc[state]) acc[state] = { state: state, count: 0, interviewed: 0 };
              acc[state].count++;
              if (b.is_interviewed) acc[state].interviewed++;
              return acc;
            }, {})
          ).map(([_, v]) => v as StateData),
        },
        impact_metrics: {
          average_impact_score: responses.length > 0 
            ? responses.reduce((sum: number, r: any) => sum + (r.impact_score || 0), 0) / responses.length 
            : null,
          score_distribution: {
            'excellent (4-5)': responses.filter((r: any) => r.impact_score >= 4).length,
            'good (3-4)': responses.filter((r: any) => r.impact_score >= 3 && r.impact_score < 4).length,
            'average (2-3)': responses.filter((r: any) => r.impact_score >= 2 && r.impact_score < 3).length,
            'poor (1-2)': responses.filter((r: any) => r.impact_score >= 1 && r.impact_score < 2).length,
            'very poor (<1)': responses.filter((r: any) => r.impact_score < 1).length,
          },
          question_averages: [],
        },
        interview_timeline: [],
        field_resource_performance: [],
      };

      console.log('Built analytics:', builtAnalytics);
      setAnalytics(builtAnalytics);
    } catch (e: any) {
      console.error('Error building analytics:', e);
      throw e;
    }
  };

  useEffect(() => { 
    if (selectedProject) {
      loadAnalytics(selectedProject.id); 
    }
  }, [selectedProject, loadAnalytics]);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const project = projects.find(p => p.id === parseInt(e.target.value));
    setSelectedProject(project || null);
    setAnalytics(null);
    setCrossTabData(null);
    setError(null);
  };

  const handleRefresh = async () => {
    if (!selectedProject) return;
    setRefreshing(true);
    await loadAnalytics(selectedProject.id);
    setRefreshing(false);
  };

  const handleExport = async (format: ExportFormat, type: ExportType) => {
    if (!selectedProject) return;
    setExportLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const response = await fetch(`/analytics/project/${selectedProject.id}/export/?format=${format}&type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedProject.code}_${type}.${format === 'excel' ? 'xlsx' : 'csv'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Export not available. Please configure the backend export endpoint.');
      }
    } catch (e) { 
      console.error(e); 
      alert('Export failed. Please check the backend configuration.');
    }
    setExportLoading(false);
    setShowExportModal(false);
  };

  const handleCompare = async () => {
    if (selectedProjectsForCompare.length < 2) return;
    setComparisonLoading(true);
    try {
      const data = await api.post<ComparisonProject[]>('/analytics/compare/', { project_ids: selectedProjectsForCompare });
      setComparisonData(data);
    } catch (e) { 
      console.error(e);
      // Build comparison from project data
      try {
        const comparison: ComparisonProject[] = [];
        for (const pid of selectedProjectsForCompare) {
          const p = projects.find(proj => proj.id === pid);
          if (p) {
            comparison.push({
              project_id: p.id,
              project_code: (p as any).code || 'N/A',
              project_title: (p as any).title || 'N/A',
              sector: (p as any).sector || 'N/A',
              total_beneficiaries: (p as any).total_beneficiaries || 0,
              sample_size: (p as any).sample_size || 0,
              completed_interviews: (p as any).completed_interviews || 0,
              completion_rate: (p as any).completion_percentage || 0,
              average_impact_score: null,
            });
          }
        }
        setComparisonData(comparison);
      } catch (e2) {
        console.error(e2);
      }
    }
    setComparisonLoading(false);
  };

  const toggleProjectForCompare = (id: number) => {
    setSelectedProjectsForCompare(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const loadCrossTab = async () => {
    if (!selectedProject || !crossTabQuestion) return;
    setCrossTabLoading(true);
    try {
      const data = await api.get<CrossTabResult>(`/analytics/project/${selectedProject.id}/cross-tab/?attribute=${crossTabAttribute}&question_id=${crossTabQuestion}`);
      setCrossTabData(data);
    } catch (e) { 
      console.error(e);
      alert('Cross-tab analysis requires the backend analytics endpoint.');
    }
    setCrossTabLoading(false);
  };

  const getTrendIcon = (value: number, threshold = 50) => {
    if (value >= threshold + 10) return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
    if (value <= threshold - 10) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-amber-500" />;
  };

  const getStatusColor = (status: string) => ({
    approved: 'bg-emerald-100 text-emerald-700',
    submitted: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700',
    draft: 'bg-gray-100 text-gray-700',
    rejected: 'bg-red-100 text-red-700',
    active: 'bg-emerald-100 text-emerald-700',
  }[status] || 'bg-gray-100 text-gray-700');

  // Safe data preparation
  const genderData = analytics?.demographics?.gender 
    ? Object.entries(analytics.demographics.gender)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({ 
          name: name.charAt(0).toUpperCase() + name.slice(1), 
          value, 
          fill: name === 'male' ? COLORS.primary[0] : name === 'female' ? COLORS.secondary[0] : COLORS.neutral[0] 
        })) 
    : [];

  const categoryData = analytics?.demographics?.category 
    ? Object.entries(analytics.demographics.category)
        .filter(([_, value]) => value > 0)
        .map(([name, value], i) => ({ 
          name: name || 'Unknown', 
          value, 
          fill: COLORS.primary[i % COLORS.primary.length] 
        })) 
    : [];

  const ageData = analytics?.demographics?.age_groups 
    ? Object.entries(analytics.demographics.age_groups)
        .filter(([_, value]) => value > 0)
        .map(([name, value], i) => ({ 
          name, 
          value, 
          fill: COLORS.primary[i % COLORS.primary.length] 
        })) 
    : [];

  const scoreData = analytics?.impact_metrics?.score_distribution 
    ? Object.entries(analytics.impact_metrics.score_distribution)
        .map(([name, value], i) => ({ 
          name, 
          value, 
          fill: i === 0 ? COLORS.success : i === 4 ? COLORS.danger : COLORS.primary[i] 
        })) 
    : [];

  const responseStatusData = analytics?.response_status 
    ? Object.entries(analytics.response_status)
        .filter(([_, count]) => count > 0)
        .map(([status, count], i) => ({ 
          name: status.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()), 
          value: count, 
          fill: status === 'approved' ? COLORS.success : status === 'rejected' ? COLORS.danger : status === 'submitted' ? COLORS.info : COLORS.neutral[i] 
        })) 
    : [];

  const timelineData = analytics?.interview_timeline || [];
  const questionAverages = analytics?.impact_metrics?.question_averages || [];

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'demographics', label: 'Demographics', icon: Users },
    { id: 'geographic', label: 'Geographic', icon: Map },
    { id: 'impact', label: 'Impact Scores', icon: Target },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'resources', label: 'Resources', icon: UserCheck },
    { id: 'questions', label: 'Questions', icon: MessageSquare },
    { id: 'compare', label: 'Compare', icon: GitCompare },
  ];

  // Check if we have any data to show
  const hasData = analytics && (
    (analytics.sampling_progress?.total_beneficiaries || 0) > 0 ||
    (analytics.sampling_progress?.interviewed || 0) > 0 ||
    Object.values(analytics.response_status || {}).some(v => v > 0)
  );

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-sky-200 rounded-full animate-spin border-t-sky-500 mx-auto" />
        <p className="mt-4 text-slate-600 font-medium">Loading Analytics...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl shadow-lg shadow-sky-500/20">
                <BarChart2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Analytics Dashboard</h1>
                <p className="text-xs text-slate-500">Comprehensive insights & reporting</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedProject && (
                <>
                  <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                  <button onClick={() => setShowExportModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:from-sky-600 hover:to-cyan-600 shadow-lg shadow-sky-500/20">
                    <Download className="w-4 h-4" /> Export
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Project Selector */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Project</label>
                <div className="relative">
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500" onChange={handleProjectChange} value={selectedProject?.id || ''}>
                    <option value="">Choose a project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{(p as any).code || p.id} - {(p as any).title || (p as any).name || 'Project'}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
              {selectedProject && analytics?.project_info && (
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-slate-600">Status:</span><span className="font-semibold text-slate-900">{analytics.project_info.status}</span></div>
                  <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /><span className="text-slate-600">Sector:</span><span className="font-semibold text-slate-900">{analytics.project_info.sector}</span></div>
                  <div className="flex items-center gap-2"><Layers className="w-4 h-4 text-slate-400" /><span className="text-slate-600">Client:</span><span className="font-semibold text-slate-900">{analytics.project_info.client}</span></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error Loading Analytics</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <p className="text-red-500 text-xs mt-2">
                Tip: Make sure the analytics backend is configured. Check browser console (F12) for details.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        {selectedProject && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex items-center gap-1 p-1 bg-white rounded-xl shadow-sm border border-slate-200 inline-flex min-w-full md:min-w-0">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-600 hover:bg-slate-100'}`}>
                    <Icon className="w-4 h-4" /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {analyticsLoading && (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-sky-200 rounded-full animate-spin border-t-sky-500 mx-auto" />
              <p className="mt-4 text-slate-600">Loading analytics data...</p>
            </div>
          </div>
        )}

        {/* No Data State */}
        {analytics && !analyticsLoading && !hasData && !error && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-amber-800 mb-2">No Data Available</h3>
            <p className="text-amber-600 max-w-md mx-auto">
              This project doesn't have any beneficiaries or interview data yet. 
              Add beneficiaries and conduct interviews to see analytics.
            </p>
          </div>
        )}

        {analytics && !analyticsLoading && hasData && (
          <div className="space-y-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Beneficiaries */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Total Beneficiaries</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{(analytics.sampling_progress?.total_beneficiaries ?? 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-1">Target: {(analytics.sampling_progress?.sample_target ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform"><Users className="w-6 h-6 text-white" /></div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, ((analytics.sampling_progress?.sampled ?? 0) / Math.max(1, analytics.sampling_progress?.total_beneficiaries ?? 1)) * 100)}%` }} /></div>
                      <p className="text-xs text-slate-500 mt-1">{analytics.sampling_progress?.sampled ?? 0} sampled</p>
                    </div>
                  </div>
                  {/* Interviews */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Interviews Completed</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{(analytics.sampling_progress?.interviewed ?? 0).toLocaleString()}</p>
                        <div className="flex items-center gap-1 mt-1">{getTrendIcon(analytics.sampling_progress?.completion_percentage ?? 0)}<span className="text-xs text-slate-400">{analytics.sampling_progress?.completion_percentage ?? 0}% complete</span></div>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-500 rounded-xl shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform"><FileText className="w-6 h-6 text-white" /></div>
                    </div>
                    <div className="mt-4"><div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-gradient-to-r from-sky-500 to-blue-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, analytics.sampling_progress?.completion_percentage ?? 0)}%` }} /></div></div>
                  </div>
                  {/* Approval Rate */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Approval Rate</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{analytics.response_status ? Math.round(((analytics.response_status.approved || 0) / Math.max(1, Object.values(analytics.response_status).reduce((a, b) => a + b, 0))) * 100) : 0}%</p>
                        <p className="text-xs text-slate-400 mt-1">{analytics.response_status?.approved ?? 0} approved</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform"><CheckCircle className="w-6 h-6 text-white" /></div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor('submitted')}`}>{analytics.response_status?.submitted ?? 0} Submitted</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor('rejected')}`}>{analytics.response_status?.rejected ?? 0} Rejected</span>
                    </div>
                  </div>
                  {/* Impact Score */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Avg Impact Score</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">{analytics.impact_metrics?.average_impact_score?.toFixed(1) ?? 'N/A'}</p>
                        <p className="text-xs text-slate-400 mt-1">Out of 5.0</p>
                      </div>
                      <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform"><Award className="w-6 h-6 text-white" /></div>
                    </div>
                    <div className="flex items-center gap-1 mt-4">{[1,2,3,4,5].map(s => <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s <= (analytics.impact_metrics?.average_impact_score ?? 0) ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>{s}</div>)}</div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-6">Response Status Distribution</h3>
                    {responseStatusData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart><Pie data={responseStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">{responseStatusData.map((e, i) => <Cell key={i} fill={e.fill} strokeWidth={0} />)}</Pie><Tooltip /><Legend /></PieChart>
                      </ResponsiveContainer>
                    ) : <div className="h-[280px] flex items-center justify-center text-slate-500">No response data yet</div>}
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-6">Impact Score Distribution</h3>
                    {scoreData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={scoreData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{scoreData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-[280px] flex items-center justify-center text-slate-500">No score data yet</div>}
                  </div>
                </div>

                {/* Resources */}
                {analytics.field_resource_performance && analytics.field_resource_performance.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-semibold text-slate-900">Field Resource Performance</h3>
                      <button onClick={() => setActiveTab('resources')} className="text-sm text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1">View All <ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.field_resource_performance.slice(0, 6).map((r, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-slate-900 truncate">{r.resource_name}</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.completion_rate >= 80 ? 'bg-emerald-100 text-emerald-700' : r.completion_rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.completion_rate}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-gradient-to-r from-sky-500 to-cyan-500 h-2 rounded-full" style={{ width: `${Math.min(100, (r.completed / Math.max(1, r.target)) * 100)}%` }} /></div>
                          <p className="text-xs text-slate-500 mt-2">{r.completed} / {r.target} interviews</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* DEMOGRAPHICS TAB */}
            {activeTab === 'demographics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-6">Gender Distribution</h3>
                  {genderData.length > 0 ? <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={genderData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{genderData.map((e, i) => <Cell key={i} fill={e.fill} strokeWidth={0} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center text-slate-500">No gender data available</div>}
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-6">Age Distribution</h3>
                  {ageData.length > 0 ? <ResponsiveContainer width="100%" height={300}><BarChart data={ageData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="value" radius={[8, 8, 0, 0]}>{ageData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center text-slate-500">No age data available</div>}
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-6">Category Distribution</h3>
                  {categoryData.length > 0 ? <ResponsiveContainer width="100%" height={300}><BarChart data={categoryData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} /><Tooltip /><Bar dataKey="value" radius={[0, 8, 8, 0]}>{categoryData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center text-slate-500">No category data available</div>}
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-6">BPL Status</h3>
                  {analytics.demographics?.bpl_status && (analytics.demographics.bpl_status.bpl > 0 || analytics.demographics.bpl_status.non_bpl > 0) ? (
                    <div className="space-y-6">
                      <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={[{ name: 'BPL', value: analytics.demographics.bpl_status.bpl, fill: COLORS.primary[0] }, { name: 'Non-BPL', value: analytics.demographics.bpl_status.non_bpl, fill: COLORS.neutral[1] }]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" /><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-sky-50 rounded-xl text-center"><p className="text-2xl font-bold text-sky-600">{analytics.demographics.bpl_status.bpl}</p><p className="text-sm text-slate-600">BPL</p></div>
                        <div className="p-4 bg-slate-50 rounded-xl text-center"><p className="text-2xl font-bold text-slate-600">{analytics.demographics.bpl_status.non_bpl}</p><p className="text-sm text-slate-600">Non-BPL</p></div>
                      </div>
                    </div>
                  ) : <div className="h-[300px] flex items-center justify-center text-slate-500">No BPL data available</div>}
                </div>
              </div>
            )}

            {/* GEOGRAPHIC TAB */}
            {activeTab === 'geographic' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-6">Distribution by State</h3>
                  {(analytics.geographic_distribution?.by_state ?? []).length > 0 ? <ResponsiveContainer width="100%" height={350}><BarChart data={analytics.geographic_distribution?.by_state}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="state" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Legend /><Bar dataKey="count" name="Total" fill={COLORS.primary[0]} radius={[8, 8, 0, 0]} /><Bar dataKey="interviewed" name="Interviewed" fill={COLORS.success} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="h-[350px] flex items-center justify-center text-slate-500">No state data available</div>}
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-6">Distribution by District</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-slate-200"><th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">District</th><th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Beneficiaries</th><th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Interviewed</th><th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Completion</th></tr></thead>
                      <tbody>
                        {(analytics.geographic_distribution?.by_district ?? []).length > 0 ? (analytics.geographic_distribution?.by_district ?? []).map((d, i) => {
                          const rate = d.count > 0 ? Math.round((d.interviewed / d.count) * 100) : 0;
                          return (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-4 px-4"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} /><span className="font-medium text-slate-900">{d.district || 'Unknown'}</span></div></td>
                              <td className="text-right py-4 px-4 font-medium text-slate-700">{d.count}</td>
                              <td className="text-right py-4 px-4 font-medium text-slate-700">{d.interviewed}</td>
                              <td className="text-right py-4 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${rate >= 80 ? 'bg-emerald-100 text-emerald-700' : rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{rate}%</span></td>
                            </tr>
                          );
                        }) : <tr><td colSpan={4} className="text-center py-8 text-slate-500">No district data available</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* IMPACT TAB */}
            {activeTab === 'impact' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-4"><Award className="w-8 h-8 opacity-80" /><span className="text-emerald-100 font-medium">Average Impact Score</span></div>
                    <p className="text-5xl font-bold">{analytics.impact_metrics?.average_impact_score?.toFixed(1) ?? 'N/A'}</p>
                    <p className="text-emerald-100 mt-2">Out of 5.0 maximum</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-4"><CheckCircle className="w-8 h-8 text-emerald-500" /><span className="text-slate-600 font-medium">Excellent Scores (4-5)</span></div>
                    <p className="text-4xl font-bold text-slate-900">{analytics.impact_metrics?.score_distribution?.['excellent (4-5)'] ?? 0}</p>
                    <p className="text-slate-500 mt-2">Beneficiaries</p>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-4"><AlertTriangle className="w-8 h-8 text-amber-500" /><span className="text-slate-600 font-medium">Needs Attention (&lt;2)</span></div>
                    <p className="text-4xl font-bold text-slate-900">{(analytics.impact_metrics?.score_distribution?.['poor (1-2)'] ?? 0) + (analytics.impact_metrics?.score_distribution?.['very poor (<1)'] ?? 0)}</p>
                    <p className="text-slate-500 mt-2">Beneficiaries</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-6">Score Distribution</h3>
                  {scoreData.some(d => d.value > 0) ? <ResponsiveContainer width="100%" height={350}><AreaChart data={scoreData}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.primary[0]} stopOpacity={0.3}/><stop offset="95%" stopColor={COLORS.primary[0]} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={100} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Area type="monotone" dataKey="value" stroke={COLORS.primary[0]} fill="url(#sg)" strokeWidth={3} /></AreaChart></ResponsiveContainer> : <div className="h-[350px] flex items-center justify-center text-slate-500">No score data available</div>}
                </div>
              </div>
            )}

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-6">Interview Timeline</h3>
                {timelineData.length > 0 ? <ResponsiveContainer width="100%" height={400}><ComposedChart data={timelineData}><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.primary[0]} stopOpacity={0.3}/><stop offset="95%" stopColor={COLORS.primary[0]} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })} /><YAxis axisLine={false} tickLine={false} /><Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} /><Legend /><Area type="monotone" dataKey="count" name="Total Interviews" stroke={COLORS.primary[0]} fill="url(#tg)" strokeWidth={2} /><Line type="monotone" dataKey="approved" name="Approved" stroke={COLORS.success} strokeWidth={3} dot={{ fill: COLORS.success, strokeWidth: 2 }} /></ComposedChart></ResponsiveContainer> : <div className="h-[400px] flex items-center justify-center text-slate-500"><div className="text-center"><Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p>No timeline data available yet.</p><p className="text-sm text-slate-400 mt-1">Timeline will appear once interviews are conducted.</p></div></div>}
              </div>
            )}

            {/* RESOURCES TAB */}
            {activeTab === 'resources' && (
              <div className="space-y-6">
                {analytics.field_resource_performance && analytics.field_resource_performance.length > 0 ? (
                  <>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                      <h3 className="font-semibold text-slate-900 mb-6">Resource Performance Overview</h3>
                      <ResponsiveContainer width="100%" height={350}><BarChart data={analytics.field_resource_performance} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="resource_name" axisLine={false} tickLine={false} width={150} /><Tooltip /><Legend /><Bar dataKey="target" name="Target" fill={COLORS.neutral[2]} radius={[0, 4, 4, 0]} /><Bar dataKey="completed" name="Completed" fill={COLORS.success} radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.field_resource_performance.map((r, i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold">{r.resource_name.charAt(0)}</div>
                              <div><p className="font-semibold text-slate-900">{r.resource_name}</p><span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(r.status)}`}>{r.status}</span></div>
                            </div>
                            <div className={`text-2xl font-bold ${r.completion_rate >= 80 ? 'text-emerald-600' : r.completion_rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{r.completion_rate}%</div>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3 mb-3"><div className="bg-gradient-to-r from-sky-500 to-cyan-500 h-3 rounded-full" style={{ width: `${Math.min(100, (r.completed / Math.max(1, r.target)) * 100)}%` }} /></div>
                          <div className="flex items-center justify-between text-sm"><span className="text-slate-500">Completed: {r.completed}</span><span className="text-slate-500">Target: {r.target}</span></div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center"><UserCheck className="w-16 h-16 text-slate-300 mx-auto mb-4" /><p className="text-slate-500">No resource assignments yet.</p><p className="text-sm text-slate-400 mt-1">Assign field resources to this project to track their performance.</p></div>}
              </div>
            )}

            {/* QUESTIONS TAB */}
            {activeTab === 'questions' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-6">Cross-Tabulation Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div><label className="block text-sm font-medium text-slate-700 mb-2">Attribute</label><select value={crossTabAttribute} onChange={(e) => setCrossTabAttribute(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"><option value="gender">Gender</option><option value="category">Category</option><option value="district">District</option><option value="state">State</option><option value="bpl_status">BPL Status</option></select></div>
                    <div><label className="block text-sm font-medium text-slate-700 mb-2">Question ID</label><input type="number" value={crossTabQuestion} onChange={(e) => setCrossTabQuestion(e.target.value)} placeholder="Enter question ID" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500" /></div>
                    <div className="flex items-end"><button onClick={loadCrossTab} disabled={crossTabLoading || !crossTabQuestion} className="w-full px-4 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl font-medium hover:from-sky-600 hover:to-cyan-600 disabled:opacity-50 flex items-center justify-center gap-2">{crossTabLoading ? <><RefreshCw className="w-4 h-4 animate-spin" />Loading...</> : <><Zap className="w-4 h-4" />Generate</>}</button></div>
                  </div>
                  {crossTabData && (
                    <div className="border-t border-slate-200 pt-6">
                      <p className="text-sm text-slate-600 mb-4"><span className="font-medium">Question:</span> {crossTabData.question}</p>
                      <div className="overflow-x-auto">
                        <table className="w-full"><thead><tr className="border-b border-slate-200"><th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">{crossTabData.attribute.charAt(0).toUpperCase() + crossTabData.attribute.slice(1)}</th><th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Count</th><th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Response Distribution</th></tr></thead>
                          <tbody>{Object.entries(crossTabData.cross_tab).map(([attr, data], i) => <tr key={i} className="border-b border-slate-100"><td className="py-4 px-4 font-medium text-slate-900">{attr}</td><td className="text-right py-4 px-4 text-slate-700">{data.count}</td><td className="py-4 px-4"><div className="flex flex-wrap gap-2">{Object.entries(data.responses).map(([r, c], j) => <span key={j} className="px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-700">{r}: {c}</span>)}</div></td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-slate-400 mt-4">Note: Cross-tabulation requires the backend analytics endpoint to be configured.</p>
                </div>
                {questionAverages.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-900 mb-6">Question Scores</h3>
                    <div className="space-y-3">
                      {questionAverages.map((q, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 cursor-pointer" onClick={() => setCrossTabQuestion(q.question__id.toString())}>
                          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center"><span className="text-sm font-bold text-white">#{q.question__id}</span></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-900">{q.question__text}</p><p className="text-xs text-slate-500 mt-1">{q.response_count} responses</p></div>
                          <div className="flex-shrink-0 flex items-center gap-4">
                            <span className={`px-4 py-2 rounded-xl text-sm font-bold ${q.avg_score >= 4 ? 'bg-emerald-100 text-emerald-700' : q.avg_score >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{q.avg_score.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COMPARE TAB */}
            {activeTab === 'compare' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Select Projects to Compare</h3>
                  <p className="text-sm text-slate-500 mb-6">Select at least 2 projects for comparison</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {projects.map(p => (
                      <div key={p.id} onClick={() => toggleProjectForCompare(p.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedProjectsForCompare.includes(p.id) ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedProjectsForCompare.includes(p.id) ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`}>{selectedProjectsForCompare.includes(p.id) && <CheckCircle className="w-3 h-3 text-white" />}</div>
                          <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{(p as any).code || p.id}</p><p className="text-xs text-slate-500 truncate">{(p as any).title || (p as any).name}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">{selectedProjectsForCompare.length} projects selected</p>
                    <button onClick={handleCompare} disabled={selectedProjectsForCompare.length < 2 || comparisonLoading} className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl font-medium hover:from-sky-600 hover:to-cyan-600 disabled:opacity-50 flex items-center gap-2">{comparisonLoading ? <><RefreshCw className="w-4 h-4 animate-spin" />Comparing...</> : <><GitCompare className="w-4 h-4" />Compare</>}</button>
                  </div>
                </div>
                {comparisonData && comparisonData.length > 0 && (
                  <>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                      <h3 className="font-semibold text-slate-900 mb-6">Comparison Overview</h3>
                      <ResponsiveContainer width="100%" height={400}><BarChart data={comparisonData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} /><XAxis dataKey="project_code" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Legend /><Bar dataKey="total_beneficiaries" name="Beneficiaries" fill={COLORS.primary[0]} radius={[8, 8, 0, 0]} /><Bar dataKey="completed_interviews" name="Interviews" fill={COLORS.success} radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                      <h3 className="font-semibold text-slate-900 mb-6">Detailed Comparison</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full"><thead><tr className="border-b border-slate-200"><th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Project</th><th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Beneficiaries</th><th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Interviews</th><th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Completion</th></tr></thead>
                          <tbody>{comparisonData.map((p, i) => <tr key={i} className="border-b border-slate-100 hover:bg-slate-50"><td className="py-4 px-4"><div><p className="font-medium text-slate-900">{p.project_code}</p><p className="text-xs text-slate-500 truncate max-w-[200px]">{p.project_title}</p></div></td><td className="text-right py-4 px-4 font-medium text-slate-700">{p.total_beneficiaries}</td><td className="text-right py-4 px-4 font-medium text-slate-700">{p.completed_interviews}</td><td className="text-right py-4 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${p.completion_rate >= 80 ? 'bg-emerald-100 text-emerald-700' : p.completion_rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{p.completion_rate}%</span></td></tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {!selectedProject && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6"><BarChart2 className="w-10 h-10 text-slate-400" /></div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Select a Project</h3>
            <p className="text-slate-500 max-w-md mx-auto">Choose a project from the dropdown above to view analytics.</p>
          </div>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-900">Export Data</h3><button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button></div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleExport('excel', 'responses')} disabled={exportLoading} className="p-4 border-2 border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 text-left group"><FileSpreadsheet className="w-8 h-8 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" /><p className="font-medium text-slate-900">Responses (Excel)</p><p className="text-xs text-slate-500">All interview data</p></button>
                <button onClick={() => handleExport('csv', 'responses')} disabled={exportLoading} className="p-4 border-2 border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 text-left group"><FileType className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" /><p className="font-medium text-slate-900">Responses (CSV)</p><p className="text-xs text-slate-500">All interview data</p></button>
                <button onClick={() => handleExport('excel', 'beneficiaries')} disabled={exportLoading} className="p-4 border-2 border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 text-left group"><Users className="w-8 h-8 text-violet-600 mb-2 group-hover:scale-110 transition-transform" /><p className="font-medium text-slate-900">Beneficiaries</p><p className="text-xs text-slate-500">Master list export</p></button>
                <button onClick={() => handleExport('excel', 'summary')} disabled={exportLoading} className="p-4 border-2 border-slate-200 rounded-xl hover:border-sky-500 hover:bg-sky-50 text-left group"><FileText className="w-8 h-8 text-amber-600 mb-2 group-hover:scale-110 transition-transform" /><p className="font-medium text-slate-900">Summary Report</p><p className="text-xs text-slate-500">Key metrics overview</p></button>
              </div>
              {exportLoading && <div className="flex items-center justify-center py-4"><RefreshCw className="w-5 h-5 animate-spin text-sky-500 mr-2" /><span className="text-slate-600">Preparing export...</span></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;