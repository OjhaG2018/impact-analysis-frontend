import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { 
  FolderOpen, 
  TrendingUp, 
  FileText, 
  Eye,
  Users,
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Download,
  Calendar,
  MapPin,
  BarChart3,
  Activity,
  MessageSquare,
  Video,
  AudioLines,
  Smile,
  ThumbsUp,
  Building2,
  Mail,
  Phone,
  ExternalLink,
  FileBarChart,
  Layers,
  Globe,
  Award,
  Star,
  ChevronRight,
  PlayCircle,
  PieChart as PieChartIcon,
  Briefcase,
  ClipboardCheck,
  TrendingDown
} from 'lucide-react';
import api, { endpoints, videoAnalysisApi, audioAnalysisApi } from '../../api';
import { Card, StatCard, LoadingSpinner } from '../../components/ui';

// Project Card Component
interface ProjectCardProps {
  project: {
    id: number;
    name: string;
    status: string;
    progress: number;
    totalBeneficiaries: number;
    completedInterviews: number;
    startDate: string;
    endDate?: string;
  };
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    pending: 'bg-amber-100 text-amber-700',
    on_hold: 'bg-gray-100 text-gray-700'
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
          <p className="text-sm text-gray-500 mt-1">Started {new Date(project.startDate).toLocaleDateString()}</p>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${statusColors[project.status] || 'bg-gray-100 text-gray-700'}`}>
          {project.status.replace('_', ' ')}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium text-gray-900">{project.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{project.totalBeneficiaries} Beneficiaries</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm text-gray-600">{project.completedInterviews} Completed</span>
        </div>
      </div>

      <div className="flex items-center text-sm text-blue-600 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span>View Details</span>
        <ArrowRight className="h-4 w-4 ml-1" />
      </div>
    </div>
  );
};

// Metric Card with Trend
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, value, subtitle, change, icon: Icon, color, bgColor, onClick 
}) => {
  const isPositive = change && change > 0;
  
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
};

// Report Card
interface ReportCardProps {
  title: string;
  date: string;
  type: string;
  status: 'ready' | 'processing' | 'scheduled';
  onView: () => void;
  onDownload: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, date, type, status, onView, onDownload }) => {
  const statusConfig = {
    ready: { bg: 'bg-green-100', text: 'text-green-700', label: 'Ready' },
    processing: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Processing' },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <FileBarChart className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{date}</span>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-500">{type}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
          {config.label}
        </span>
        {status === 'ready' && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); onView(); }}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="View"
            >
              <Eye className="h-4 w-4 text-gray-500" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Download"
            >
              <Download className="h-4 w-4 text-gray-500" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [videoStats, setVideoStats] = useState({ total: 0, completed: 0 });
  const [audioStats, setAudioStats] = useState({ total: 0, completed: 0 });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Load dashboard stats
      const data = await api.get<any>(endpoints.dashboardStats);
      setStats(data);

      // Load projects (mock data for demo)
      setProjects([
        { 
          id: 1, 
          name: 'Rural Health Impact Assessment', 
          status: 'active', 
          progress: 68,
          totalBeneficiaries: 250,
          completedInterviews: 170,
          startDate: '2025-09-01'
        },
        { 
          id: 2, 
          name: 'Education Quality Survey', 
          status: 'active', 
          progress: 45,
          totalBeneficiaries: 180,
          completedInterviews: 81,
          startDate: '2025-10-15'
        },
        { 
          id: 3, 
          name: 'Livelihood Program Evaluation', 
          status: 'completed', 
          progress: 100,
          totalBeneficiaries: 320,
          completedInterviews: 320,
          startDate: '2025-06-01'
        }
      ]);

      // Load video stats
      try {
        const videos = await videoAnalysisApi.getVideoList({ page_size: 1000 });
        if (videos?.results) {
          setVideoStats({
            total: videos.results.length,
            completed: videos.results.filter((v: any) => v.analysis_status === 'completed').length
          });
        }
      } catch (e) {}

      // Load audio stats
      try {
        const audio = await audioAnalysisApi.getAudioList({ page_size: 1000 });
        if (audio?.results) {
          setAudioStats({
            total: audio.results.length,
            completed: audio.results.filter((a: any) => a.analysis_status === 'completed').length
          });
        }
      } catch (e) {}

    } catch (error) {
      console.error('Error loading stats:', error);
    }
    setLoading(false);
  };

  // Chart Data
  const progressData = [
    { month: 'Jul', target: 40, actual: 35 },
    { month: 'Aug', target: 80, actual: 72 },
    { month: 'Sep', target: 120, actual: 118 },
    { month: 'Oct', target: 160, actual: 155 },
    { month: 'Nov', target: 200, actual: 195 },
    { month: 'Dec', target: 250, actual: 238 }
  ];

  const sentimentData = [
    { name: 'Positive', value: 62, color: '#10B981' },
    { name: 'Neutral', value: 25, color: '#9CA3AF' },
    { name: 'Negative', value: 13, color: '#EF4444' }
  ];

  const regionData = [
    { region: 'North', interviews: 85 },
    { region: 'South', interviews: 72 },
    { region: 'East', interviews: 58 },
    { region: 'West', interviews: 45 },
    { region: 'Central', interviews: 40 }
  ];

  // Calculate overall stats
  const totalBeneficiaries = projects.reduce((sum, p) => sum + p.totalBeneficiaries, 0);
  const totalCompleted = projects.reduce((sum, p) => sum + p.completedInterviews, 0);
  const overallProgress = totalBeneficiaries > 0 ? Math.round((totalCompleted / totalBeneficiaries) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-blue-100 mb-1">Welcome back</p>
            <h1 className="text-2xl font-bold">Client Dashboard</h1>
            <p className="text-blue-100 mt-1">Monitor your projects and access insights</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => navigate('/analytics')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
            >
              <BarChart3 className="h-4 w-4" />
              View Analytics
            </button>
            <button 
              onClick={() => {}}
              className="flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="h-5 w-5 text-blue-200" />
              <span className="text-blue-100 text-sm">Active Projects</span>
            </div>
            <p className="text-3xl font-bold">{projects.filter(p => p.status === 'active').length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-blue-200" />
              <span className="text-blue-100 text-sm">Total Beneficiaries</span>
            </div>
            <p className="text-3xl font-bold">{totalBeneficiaries}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-blue-200" />
              <span className="text-blue-100 text-sm">Completed</span>
            </div>
            <p className="text-3xl font-bold">{totalCompleted}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-blue-200" />
              <span className="text-blue-100 text-sm">Overall Progress</span>
            </div>
            <p className="text-3xl font-bold">{overallProgress}%</p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Responses"
          value={stats?.total_responses ?? totalCompleted}
          change={12}
          icon={MessageSquare}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          onClick={() => navigate('/interviews')}
        />
        <MetricCard
          title="Videos Analyzed"
          value={videoStats.completed}
          subtitle={`of ${videoStats.total} total`}
          icon={Video}
          color="text-red-600"
          bgColor="bg-red-50"
          onClick={() => navigate('/video-analysis')}
        />
        <MetricCard
          title="Audio Analyzed"
          value={audioStats.completed}
          subtitle={`of ${audioStats.total} total`}
          icon={AudioLines}
          color="text-purple-600"
          bgColor="bg-purple-50"
          onClick={() => navigate('/audio-analysis')}
        />
        <MetricCard
          title="Avg. Sentiment"
          value="Positive"
          subtitle="62% positive responses"
          icon={Smile}
          color="text-green-600"
          bgColor="bg-green-50"
          onClick={() => navigate('/sentiment-analysis')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Trend */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-400" />
              Interview Progress
            </h3>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Projects</option>
              {projects.map(p => (
                <option key={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="target" stroke="#9CA3AF" fill="#F3F4F6" name="Target" />
                <Area type="monotone" dataKey="actual" stroke="#3B82F6" fill="#DBEAFE" name="Actual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Sentiment Distribution */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-gray-400" />
            Sentiment Overview
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {sentimentData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-gray-400" />
            Your Projects
          </h2>
          <button 
            onClick={() => navigate('/projects')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard 
              key={project.id}
              project={project}
              onClick={() => navigate(`/projects/${project.id}`)}
            />
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Distribution */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-400" />
            Regional Distribution
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis dataKey="region" type="category" width={60} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="interviews" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Interviews" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Recent Reports */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-gray-400" />
              Recent Reports
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
          </div>
          <div className="space-y-3">
            <ReportCard
              title="Monthly Progress Report"
              date="Dec 20, 2025"
              type="Progress"
              status="ready"
              onView={() => {}}
              onDownload={() => {}}
            />
            <ReportCard
              title="Sentiment Analysis Summary"
              date="Dec 18, 2025"
              type="Analysis"
              status="ready"
              onView={() => {}}
              onDownload={() => {}}
            />
            <ReportCard
              title="Q4 Impact Assessment"
              date="Dec 25, 2025"
              type="Impact"
              status="scheduled"
              onView={() => {}}
              onDownload={() => {}}
            />
            <ReportCard
              title="Field Data Quality Report"
              date="Processing..."
              type="Quality"
              status="processing"
              onView={() => {}}
              onDownload={() => {}}
            />
          </div>
        </Card>
      </div>

      {/* Quick Access Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-gray-400" />
          Quick Access
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group text-center" onClick={() => navigate('/projects')}>
            <div className="p-3 bg-emerald-50 rounded-xl mx-auto w-fit group-hover:scale-110 transition-transform mb-2">
              <FolderOpen className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Projects</h3>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group text-center" onClick={() => navigate('/beneficiaries')}>
            <div className="p-3 bg-blue-50 rounded-xl mx-auto w-fit group-hover:scale-110 transition-transform mb-2">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Beneficiaries</h3>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group text-center" onClick={() => navigate('/interviews')}>
            <div className="p-3 bg-purple-50 rounded-xl mx-auto w-fit group-hover:scale-110 transition-transform mb-2">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Responses</h3>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group text-center" onClick={() => navigate('/video-analysis')}>
            <div className="p-3 bg-red-50 rounded-xl mx-auto w-fit group-hover:scale-110 transition-transform mb-2">
              <Video className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Videos</h3>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group text-center" onClick={() => navigate('/audio-analysis')}>
            <div className="p-3 bg-violet-50 rounded-xl mx-auto w-fit group-hover:scale-110 transition-transform mb-2">
              <AudioLines className="h-6 w-6 text-violet-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Audio</h3>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group text-center" onClick={() => navigate('/analytics')}>
            <div className="p-3 bg-amber-50 rounded-xl mx-auto w-fit group-hover:scale-110 transition-transform mb-2">
              <BarChart3 className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Analytics</h3>
          </Card>
        </div>
      </div>

      {/* Key Insights */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-gray-400" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ThumbsUp className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Positive Trend</span>
            </div>
            <p className="text-sm text-green-700">Interview completion rate increased by 15% this month compared to last month.</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-800">High Engagement</span>
            </div>
            <p className="text-sm text-blue-700">Average response quality score is 4.2/5 across all projects.</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-800">Attention Needed</span>
            </div>
            <p className="text-sm text-amber-700">East region is behind schedule. Consider reallocating resources.</p>
          </div>
        </div>
      </Card>

      {/* Support Footer */}
      <Card className="p-5 bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Need Support?</h3>
              <p className="text-sm text-gray-600">Contact your account manager or support team</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Mail className="h-4 w-4" />
              Email Support
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Phone className="h-4 w-4" />
              Call Us
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              <ExternalLink className="h-4 w-4" />
              Help Center
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ClientDashboard;