import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
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
  PieChart as PieChartIcon,
  UserCheck,
  ClipboardCheck,
  AlertTriangle,
  Eye,
  PlayCircle,
  ListChecks,
  UserPlus,
  FileCheck,
  ChevronRight,
  Briefcase,
  MapPin
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

// Progress Bar Component
interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, max, color }) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Team Member Card
interface TeamMemberProps {
  name: string;
  role: string;
  tasks: number;
  status: 'active' | 'busy' | 'offline';
}

const TeamMemberCard: React.FC<TeamMemberProps> = ({ name, role, tasks, status }) => {
  const statusColors = {
    active: 'bg-green-500',
    busy: 'bg-amber-500',
    offline: 'bg-gray-400'
  };
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
          {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[status]} rounded-full border-2 border-white`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-500">{role}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">{tasks}</p>
        <p className="text-xs text-gray-500">tasks</p>
      </div>
    </div>
  );
};

// Activity Item
interface ActivityItemProps {
  action: string;
  subject: string;
  time: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ action, subject, time, icon: Icon, iconColor, iconBg }) => (
  <div className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
    <div className={`p-2 ${iconBg} rounded-lg h-fit`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-900">
        <span className="font-medium">{action}</span> {subject}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{time}</p>
    </div>
  </div>
);

const ManagerDashboard: React.FC = () => {
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
    { name: 'Completed', value: Math.max(0, (stats?.total_projects ?? 0) - (stats?.active_projects ?? 0)), color: '#6B7280' },
  ];

  const analysisData = [
    { name: 'Videos', total: videoStats.total, completed: videoStats.completed, pending: videoStats.pending },
    { name: 'Audio', total: audioStats.total, completed: audioStats.completed, pending: audioStats.pending },
  ];

  // Weekly progress data (simulated based on available stats)
  const weeklyProgressData = [
    { day: 'Mon', interviews: 12, analyses: 8 },
    { day: 'Tue', interviews: 19, analyses: 14 },
    { day: 'Wed', interviews: 15, analyses: 11 },
    { day: 'Thu', interviews: 22, analyses: 18 },
    { day: 'Fri', interviews: 28, analyses: 24 },
    { day: 'Sat', interviews: 8, analyses: 6 },
    { day: 'Sun', interviews: 5, analyses: 3 },
  ];

  // Team performance data
  const teamPerformanceData = [
    { name: 'Interviews', target: 100, actual: stats?.total_responses ?? 0 },
    { name: 'Videos', target: 50, actual: videoStats.completed },
    { name: 'Audio', target: 50, actual: audioStats.completed },
  ];

  // Sample team members (would come from API in production)
  const teamMembers: TeamMemberProps[] = [
    { name: 'Rahul Kumar', role: 'Field Supervisor', tasks: 12, status: 'active' },
    { name: 'Priya Sharma', role: 'Data Collector', tasks: 8, status: 'active' },
    { name: 'Amit Singh', role: 'Field Resource', tasks: 15, status: 'busy' },
    { name: 'Sneha Patel', role: 'Analyst', tasks: 6, status: 'active' },
  ];

  // Sample recent activities
  const recentActivities: ActivityItemProps[] = [
    { action: 'Completed analysis for', subject: 'Video #245', time: '5 minutes ago', icon: CheckCircle2, iconColor: 'text-green-600', iconBg: 'bg-green-50' },
    { action: 'New interview submitted by', subject: 'Field Team A', time: '12 minutes ago', icon: FileText, iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
    { action: 'Audio transcription ready for', subject: 'Session #89', time: '25 minutes ago', icon: Headphones, iconColor: 'text-purple-600', iconBg: 'bg-purple-50' },
    { action: 'Project milestone reached:', subject: '75% data collection', time: '1 hour ago', icon: Target, iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
    { action: 'New team member added:', subject: 'Vikram Reddy', time: '2 hours ago', icon: UserPlus, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50' },
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
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor projects, team performance, and analysis progress</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickAction 
            label="View Projects" 
            icon={FolderOpen} 
            onClick={() => navigate('/projects')} 
            color="bg-emerald-600"
          />
          <QuickAction 
            label="Manage Team" 
            icon={Users} 
            onClick={() => navigate('/resources')} 
            color="bg-blue-600"
          />
          <QuickAction 
            label="View Analytics" 
            icon={BarChart3} 
            onClick={() => navigate('/analytics')} 
            color="bg-purple-600"
          />
        </div>
      </div>

      {/* Key Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard 
          title="My Projects" 
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
          title="Team Members" 
          value={stats?.field_resources ?? 0} 
          icon={Users} 
          color="purple" 
          onClick={() => navigate('/resources')} 
        />
        <StatCard 
          title="Interviews" 
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

        {/* Weekly Activity Trend */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            Weekly Activity Trend
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="interviews" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Interviews" />
                <Area type="monotone" dataKey="analyses" stackId="2" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="Analyses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Team & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Overview */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              Team Overview
            </h3>
            <button 
              onClick={() => navigate('/resources')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {teamMembers.map((member, idx) => (
              <TeamMemberCard key={idx} {...member} />
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-400" />
              Recent Activity
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Last 24 hours</span>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivities.map((activity, idx) => (
              <ActivityItem key={idx} {...activity} />
            ))}
          </div>
        </Card>
      </div>

      {/* Analysis Overview Bar Chart */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-400" />
          Analysis Overview
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analysisData} layout="vertical" barGap={8}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={60} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[0, 4, 4, 0]} />
              <Bar dataKey="pending" fill="#F59E0B" name="Pending" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Feature Cards Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-gray-400" />
          Quick Access
        </h2>
        
        {/* Project Management */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Project Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              title="Projects"
              description="View and manage assigned projects"
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
              title="Beneficiaries"
              description="Track project beneficiaries"
              icon={Users}
              color="text-purple-600"
              bgColor="bg-purple-50"
              path="/beneficiaries"
            />
            <FeatureCard
              title="Questionnaires"
              description="Manage survey templates"
              icon={ClipboardList}
              color="text-amber-600"
              bgColor="bg-amber-50"
              path="/questionnaires"
            />
            <FeatureCard
              title="Interviews"
              description="View collected responses"
              icon={MessageSquare}
              color="text-orange-600"
              bgColor="bg-orange-50"
              path="/interviews"
              stats={[{ label: 'Responses', value: stats?.total_responses ?? 0 }]}
            />
          </div>
        </div>

        {/* Team Operations */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Team Operations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              title="Field Resources"
              description="Manage your field team"
              icon={Users}
              color="text-indigo-600"
              bgColor="bg-indigo-50"
              path="/resources"
              stats={[{ label: 'Members', value: stats?.field_resources ?? 0 }]}
            />
            <FeatureCard
              title="Assignments"
              description="Assign tasks to team members"
              icon={Target}
              color="text-rose-600"
              bgColor="bg-rose-50"
              path="/assignments"
            />
            <FeatureCard
              title="Attendance"
              description="Monitor team attendance"
              icon={Calendar}
              color="text-teal-600"
              bgColor="bg-teal-50"
              path="/attendance"
            />
            <FeatureCard
              title="Expenses"
              description="Review expense claims"
              icon={DollarSign}
              color="text-green-600"
              bgColor="bg-green-50"
              path="/expenses"
              badge="Review"
              badgeColor="bg-amber-100 text-amber-700"
            />
          </div>
        </div>

        {/* AI & Analysis */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">AI & Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard
              title="Video Analysis"
              description="AI-powered video analysis"
              icon={Video}
              color="text-red-600"
              bgColor="bg-red-50"
              path="/video-analysis"
              stats={[
                { label: 'Total', value: videoStats.total },
                { label: 'Done', value: videoStats.completed }
              ]}
              badge="AI"
              badgeColor="bg-red-100 text-red-700"
            />
            <FeatureCard
              title="Audio Analysis"
              description="Transcription & summaries"
              icon={AudioLines}
              color="text-violet-600"
              bgColor="bg-violet-50"
              path="/audio-analysis"
              stats={[
                { label: 'Total', value: audioStats.total },
                { label: 'Done', value: audioStats.completed }
              ]}
              badge="AI"
              badgeColor="bg-violet-100 text-violet-700"
            />
            <FeatureCard
              title="Sentiment Analysis"
              description="Sentiment insights from data"
              icon={Brain}
              color="text-pink-600"
              bgColor="bg-pink-50"
              path="/sentiment-analysis"
              badge="AI"
              badgeColor="bg-pink-100 text-pink-700"
            />
            <FeatureCard
              title="Analytics"
              description="Reports and insights"
              icon={BarChart3}
              color="text-blue-600"
              bgColor="bg-blue-50"
              path="/analytics"
              badge="Insights"
              badgeColor="bg-blue-100 text-blue-700"
            />
          </div>
        </div>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
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
              <p className="text-sm text-gray-500">Pending</p>
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
              <p className="text-sm text-gray-500">Total Media</p>
              <p className="text-2xl font-bold text-gray-900">
                {videoStats.total + audioStats.total}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Team Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.field_resources ?? 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Project Progress Section */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-gray-400" />
          Project Progress Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <ProgressBar 
              label="Data Collection" 
              value={stats?.total_responses ?? 0} 
              max={Math.max(100, (stats?.total_responses ?? 0) * 1.5)} 
              color="bg-emerald-500" 
            />
            <ProgressBar 
              label="Video Analysis" 
              value={videoStats.completed} 
              max={Math.max(videoStats.total, 1)} 
              color="bg-red-500" 
            />
            <ProgressBar 
              label="Audio Analysis" 
              value={audioStats.completed} 
              max={Math.max(audioStats.total, 1)} 
              color="bg-violet-500" 
            />
          </div>
          <div>
            <ProgressBar 
              label="Team Deployment" 
              value={stats?.field_resources ?? 0} 
              max={Math.max(20, (stats?.field_resources ?? 0) * 1.2)} 
              color="bg-blue-500" 
            />
            <ProgressBar 
              label="Project Completion" 
              value={(stats?.total_projects ?? 0) - (stats?.active_projects ?? 0)} 
              max={Math.max(stats?.total_projects ?? 1, 1)} 
              color="bg-amber-500" 
            />
            <ProgressBar 
              label="Quality Reviews" 
              value={videoStats.completed + audioStats.completed} 
              max={Math.max(videoStats.total + audioStats.total, 1)} 
              color="bg-pink-500" 
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
              <p className="text-4xl font-bold text-blue-600">
                {stats?.active_projects ?? 0}
              </p>
              <p className="text-sm text-gray-600 mt-1">Active Projects</p>
              <button 
                onClick={() => navigate('/projects')}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mx-auto"
              >
                View Details <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Help Card */}
      <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Manager Resources</h3>
            <p className="text-sm text-gray-600">Access reports, team management tools, and analytics</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => navigate('/analytics')}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Reports
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ManagerDashboard;