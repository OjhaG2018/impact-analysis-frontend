import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  FolderOpen, 
  Users, 
  FileText, 
  Target,
  Mic,
  Video,
  BarChart3,
  ClipboardList,
  Settings,
  Building2,
  Calendar,
  DollarSign,
  MessageSquare,
  Brain,
  AudioLines,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Activity,
  Headphones,
  Film,
  PieChart as PieChartIcon
} from 'lucide-react';
import api, { endpoints, videoAnalysisApi, audioAnalysisApi } from '../../api';
import { DashboardStats } from '../../types';
import { Card, StatCard, LoadingSpinner } from '../../components/ui';

// Feature Card Component
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path: string;
  stats?: { label: string; value: number | string }[];
  badge?: string;
  badgeColor?: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  title, description, icon: Icon, color, bgColor, path, stats, badge, badgeColor 
}) => {
  const navigate = useNavigate();
  
  return (
    <div 
      onClick={() => navigate(path)}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3 rounded-xl ${bgColor} group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        {badge && (
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeColor || 'bg-blue-100 text-blue-700'}`}>
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      {stats && stats.length > 0 && (
        <div className="flex gap-4 pt-3 border-t border-gray-100">
          {stats.map((stat, idx) => (
            <div key={idx}>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center text-sm text-blue-600 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Open</span>
        <ArrowRight className="h-4 w-4 ml-1" />
      </div>
    </div>
  );
};

// Quick Action Button
interface QuickActionProps {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ label, icon: Icon, onClick, color }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${color} text-white hover:opacity-90 transition-opacity text-sm font-medium`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoStats, setVideoStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [audioStats, setAudioStats] = useState({ total: 0, pending: 0, completed: 0 });

  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    try {
      // Load dashboard stats
      const data = await api.get<DashboardStats>(endpoints.dashboardStats);
      setStats(data);

      // Load video stats
      try {
        const videos = await videoAnalysisApi.getVideoList({ page_size: 1000 });
        if (videos?.results) {
          const total = videos.results.length;
          const pending = videos.results.filter((v: any) => v.analysis_status === 'pending').length;
          const completed = videos.results.filter((v: any) => v.analysis_status === 'completed').length;
          setVideoStats({ total, pending, completed });
        }
      } catch (e) {
        console.log('Video stats not available');
      }

      // Load audio stats
      try {
        const audio = await audioAnalysisApi.getAudioList({ page_size: 1000 });
        if (audio?.results) {
          const total = audio.results.length;
          const pending = audio.results.filter((a: any) => a.analysis_status === 'pending').length;
          const completed = audio.results.filter((a: any) => a.analysis_status === 'completed').length;
          setAudioStats({ total, pending, completed });
        }
      } catch (e) {
        console.log('Audio stats not available');
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
    setLoading(false);
  };

  // Chart data
  const projectStatusData = [
    { name: 'Active', value: stats?.active_projects ?? 0, color: '#10B981' },
    { name: 'Completed', value: (stats?.total_projects ?? 0) - (stats?.active_projects ?? 0), color: '#6B7280' },
  ];

  const analysisData = [
    { name: 'Videos', total: videoStats.total, completed: videoStats.completed, pending: videoStats.pending },
    { name: 'Audio', total: audioStats.total, completed: audioStats.completed, pending: audioStats.pending },
  ];

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Complete system overview and management</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickAction 
            label="New Project" 
            icon={FolderOpen} 
            onClick={() => navigate('/projects')} 
            color="bg-emerald-600"
          />
          <QuickAction 
            label="Upload Video" 
            icon={Video} 
            onClick={() => navigate('/video-analysis/upload')} 
            color="bg-blue-600"
          />
          <QuickAction 
            label="Upload Audio" 
            icon={Mic} 
            onClick={() => navigate('/audio-analysis')} 
            color="bg-purple-600"
          />
        </div>
      </div>

      {/* Key Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard 
          title="Total Projects" 
          value={stats?.total_projects ?? 0} 
          icon={FolderOpen} 
          color="emerald" 
          onClick={() => navigate('/projects')} 
        />
        <StatCard 
          title="Active Projects" 
          value={stats?.active_projects ?? 0} 
          icon={Target} 
          color="blue" 
          onClick={() => navigate('/projects')} 
        />
        <StatCard 
          title="Field Resources" 
          value={stats?.field_resources ?? 0} 
          icon={Users} 
          color="purple" 
          onClick={() => navigate('/resources')} 
        />
        <StatCard 
          title="Total Interviews" 
          value={stats?.total_responses ?? 0} 
          icon={FileText} 
          color="amber" 
          onClick={() => navigate('/interviews')} 
        />
        <StatCard 
          title="Videos Analyzed" 
          value={videoStats.completed} 
          icon={Video} 
          color="purple" 
          onClick={() => navigate('/video-analysis')} 
        />
        <StatCard 
          title="Audio Analyzed" 
          value={audioStats.completed} 
          icon={Headphones} 
          color="blue" 
          onClick={() => navigate('/audio-analysis')} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Status Pie Chart */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-gray-400" />
            Project Status
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Analysis Status Bar Chart */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            Analysis Overview
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysisData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={60} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10B981" name="Completed" />
                <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Feature Cards Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-400" />
          All Modules
        </h2>
        
        {/* Core Modules */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Core Modules</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              title="Projects"
              description="Manage all research projects and their settings"
              icon={FolderOpen}
              color="text-emerald-600"
              bgColor="bg-emerald-50"
              path="/projects"
              stats={[
                { label: 'Total', value: stats?.total_projects ?? 0 },
                { label: 'Active', value: stats?.active_projects ?? 0 }
              ]}
            />
            <FeatureCard
              title="Clients"
              description="Manage client organizations and contacts"
              icon={Building2}
              color="text-blue-600"
              bgColor="bg-blue-50"
              path="/clients"
              badge="CRM"
              badgeColor="bg-blue-100 text-blue-700"
            />
            <FeatureCard
              title="Beneficiaries"
              description="Track and manage project beneficiaries"
              icon={Users}
              color="text-purple-600"
              bgColor="bg-purple-50"
              path="/beneficiaries"
            />
            <FeatureCard
              title="Questionnaires"
              description="Create and manage survey templates"
              icon={ClipboardList}
              color="text-amber-600"
              bgColor="bg-amber-50"
              path="/questionnaires"
            />
          </div>
        </div>

        {/* Field Operations */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Field Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              title="Field Resources"
              description="Manage field team members and assignments"
              icon={Users}
              color="text-indigo-600"
              bgColor="bg-indigo-50"
              path="/resources"
              stats={[{ label: 'Resources', value: stats?.field_resources ?? 0 }]}
            />
            <FeatureCard
              title="Assignments"
              description="View and manage resource assignments"
              icon={Target}
              color="text-rose-600"
              bgColor="bg-rose-50"
              path="/assignments"
            />
            <FeatureCard
              title="Attendance"
              description="Track field team attendance records"
              icon={Calendar}
              color="text-teal-600"
              bgColor="bg-teal-50"
              path="/attendance"
            />
            <FeatureCard
              title="Expenses"
              description="Manage field expense claims and approvals"
              icon={DollarSign}
              color="text-green-600"
              bgColor="bg-green-50"
              path="/expenses"
            />
          </div>
        </div>

        {/* AI & Analysis */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">AI & Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              title="Video Analysis"
              description="AI-powered video sentiment and emotion analysis"
              icon={Video}
              color="text-red-600"
              bgColor="bg-red-50"
              path="/video-analysis"
              stats={[
                { label: 'Total', value: videoStats.total },
                { label: 'Completed', value: videoStats.completed }
              ]}
              badge="AI"
              badgeColor="bg-red-100 text-red-700"
            />
            <FeatureCard
              title="Audio Analysis"
              description="Transcription with GPT-4 summaries"
              icon={AudioLines}
              color="text-violet-600"
              bgColor="bg-violet-50"
              path="/audio-analysis"
              stats={[
                { label: 'Total', value: audioStats.total },
                { label: 'Completed', value: audioStats.completed }
              ]}
              badge="AI"
              badgeColor="bg-violet-100 text-violet-700"
            />
            <FeatureCard
              title="Sentiment Analysis"
              description="Deep sentiment insights from responses"
              icon={Brain}
              color="text-pink-600"
              bgColor="bg-pink-50"
              path="/sentiment-analysis"
              badge="AI"
              badgeColor="bg-pink-100 text-pink-700"
            />
            <FeatureCard
              title="AI Voice Interviews"
              description="Conduct automated voice-based interviews"
              icon={Mic}
              color="text-cyan-600"
              bgColor="bg-cyan-50"
              path="/ai-interviews"
              badge="NEW"
              badgeColor="bg-cyan-100 text-cyan-700"
            />
          </div>
        </div>

        {/* Data & Reports */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Data & Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              title="Interviews"
              description="View all collected interview responses"
              icon={MessageSquare}
              color="text-orange-600"
              bgColor="bg-orange-50"
              path="/interviews"
              stats={[{ label: 'Responses', value: stats?.total_responses ?? 0 }]}
            />
            <FeatureCard
              title="Analytics"
              description="Advanced analytics and reporting"
              icon={BarChart3}
              color="text-blue-600"
              bgColor="bg-blue-50"
              path="/analytics"
              badge="Insights"
              badgeColor="bg-blue-100 text-blue-700"
            />
            <FeatureCard
              title="Upload Videos"
              description="Bulk upload pre-recorded videos"
              icon={Film}
              color="text-slate-600"
              bgColor="bg-slate-50"
              path="/video-analysis/upload"
            />
            <FeatureCard
              title="Settings"
              description="System configuration and preferences"
              icon={Settings}
              color="text-gray-600"
              bgColor="bg-gray-50"
              path="/settings"
            />
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed Analyses</p>
              <p className="text-2xl font-bold text-gray-900">
                {videoStats.completed + audioStats.completed}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Analysis</p>
              <p className="text-2xl font-bold text-gray-900">
                {videoStats.pending + audioStats.pending}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Media Files</p>
              <p className="text-2xl font-bold text-gray-900">
                {videoStats.total + audioStats.total}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Links Footer */}
      <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Need Help?</h3>
            <p className="text-sm text-gray-600">Access documentation and support resources</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => navigate('/settings')}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              System Settings
            </button>
            <button 
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              View Documentation
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;